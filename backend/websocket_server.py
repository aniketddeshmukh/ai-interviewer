import asyncio
import datetime
import re
import threading
import time
import interview_engine
from io import BytesIO
import os

import azure.cognitiveservices.speech as speechsdk
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware

from report_generator import generate_pdf_report
from resume_parser import extract_resume_text
from azure_uploader import upload_to_azure
from interview_engine import (
    conversation_context,
    speak_async,
    openai_chat_async,
    start_streaming_recognition,
    handle_user_input,
    speech_config,
)
 

parsed_resume_data = {}  

previous_question = None  

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_QUESTIONS = os.environ.get("MAX_QUESTIONS")
question_count = 0  # Global counter to track how many AI questions were asked
shutdown_event = None  
finalized = False     # Flag to prevent multiple finalize calls


@app.post("/upload_resume")
async def upload_resume(file: UploadFile = File(...)):
    global parsed_resume_data
    contents = await file.read()
    save_path = "resume.pdf"
    with open(save_path, "wb") as f:
        f.write(contents)

    # Use BytesIO to create a file-like object for Form Recognizer
    file_like = BytesIO(contents)
    extracted_data = extract_resume_text(file_like)
    parsed_resume_data = extracted_data  # <-- Store in global variable
    return {"parsed_resume": extracted_data}



@app.websocket("/ws/interview")
async def interview_ws(websocket: WebSocket):
    global conversation_context, question_count, shutdown_event, finalized
    await websocket.accept()
    print("✅ WebSocket connected")
    print(parsed_resume_data)
    shutdown_event = asyncio.Event()
    finalized = False

    # ⬅️ Callback to send data to frontend
    async def send_to_frontend(text):
        if shutdown_event.is_set():
            return
        try:
            await websocket.send_text(text)
        except (WebSocketDisconnect, RuntimeError):
            print("❌ WebSocket disconnected or send after close")
            shutdown_event.set()
            await safe_finalize_interview()
            return
    interview_engine.speak_callback = send_to_frontend

    # 🔄 Reset context and counter
    conversation_context.clear()
    question_count = 0
    previous_question = None  # reset

    conversation_context.append({
        "role": "system",
        "content": (
            f"You are an AI interviewer. Greet candidate using his Name from resume attached below. Ask exactly {MAX_QUESTIONS} different technical questions about skills given below, one at a time.\n"
            "⚠️ DO NOT repeat any previous question.\n"
            " Do not say 1,2,3 like 'Question 1: ...'\n"
            "Please ignore spelling mistakes and typos as we are taking input via voice.\n"
            "After each user response, do NOT provide feedback or explanation. Only acknowledge and immediately ask the next question. Never explain, correct, or elaborate on the user’s answer.\n"
            "Keep track of your own questions. Do not rephrase or ask variations of the same concept.\n"
            f"After {MAX_QUESTIONS} questions, say 'That concludes our interview. Thanks for joining. You may now close the session.' and stop asking further questions."
            f"This is the data from candidate's resume: {parsed_resume_data}"
            "Use this info to personalize your questions by extracting skills, projects and other relivent information."
        )
    })
    # 🟢 Greet candidate
    greeting = await openai_chat_async(conversation_context)
    conversation_context.append({"role": "assistant", "content": greeting})
    await speak_async(greeting)

    # 🎙️ Start mic
    loop = asyncio.get_running_loop()
    start_streaming_recognition(handle_user_input_wrapper(websocket), loop, shutdown_event)

    try:
        while True:
            user_msg = await websocket.receive_text()
            print(f"[WS DEBUG] User said: {user_msg}")
            await handle_user_input_wrapper(websocket)(user_msg)
    except WebSocketDisconnect:
        print("❌ WebSocket disconnected")
        shutdown_event.set()
        await safe_finalize_interview()


# -----------------------
# 🧠 Wrap user input handler
# -----------------------
def handle_user_input_wrapper(websocket):
    async def wrapped(text):
        global question_count, previous_question

        text = text.strip()
        if not text:
            return

        if interview_engine.speak_callback:
            await interview_engine.speak_callback(f"__USER__::{text}")

        conversation_context.append({ "role": "user", "content": text })



        # Ask AI for next response
        ai_reply = await openai_chat_async(conversation_context)

        # ✅ Prevent duplicate question
        if ai_reply.strip() == previous_question:
            print("⚠️ AI repeated last question. Asking GPT again...")
            ai_reply = await openai_chat_async(conversation_context)

        # Update state and continue
        previous_question = ai_reply
        conversation_context.append({ "role": "assistant", "content": ai_reply })
        await speak_async(ai_reply)
        question_count += 1
    return wrapped



# -----------------------
# 🧾 Finalize Interview & Generate Report
# -----------------------
async def finalize_interview():
    print("🧮 Final evaluation starting...")

    evaluation_prompt = {
        "role": "user",
        "content": (
            "Now that the interview is over, please evaluate the candidate on:\n"
            "• Communication\n"
            "• Technical Skills\n"
            "• Fluency\n"
            "• Listening & Clarity\n"
            "• Confidence\n"
            "Give each a score out of 5.\n"
            "Also provide 2–3 bullet points summarizing strengths or improvement areas.\n"
            "Finally, recommend whether they should proceed to next round. Do not proceed if average score is below 4."
        )
    }

    conversation_context.append(evaluation_prompt)
    evaluation_response = await openai_chat_async(conversation_context)
    print(evaluation_response)

    # Parse evaluation
    lines = evaluation_response.splitlines()
    evaluation = {}
    comments = []
    summary_text = ""

    for line in lines:
        score_match = re.match(r"^(.*?):\s*([0-5](\.\d)?)", line)
        if score_match:
            key = score_match.group(1).strip()
            value = float(score_match.group(2))
            evaluation[key] = value
        elif line.strip().startswith(("•", "-")):
            comments.append(line.strip())
        elif "recommend" in line.lower():
            summary_text = line.strip()

    # Generate PDF report
    generate_pdf_report(
        candidate_name="Aniket Deshmukh",
        interview_date=datetime.date.today().strftime("%B %d, %Y"),
        evaluation=evaluation,
        comments="\n".join(comments[:3]),
        summary=summary_text
    )

    # Save transcript
    with open("transcript.txt", "w", encoding="utf-8") as f:
        for msg in conversation_context:
            if msg["role"] in ["user", "assistant"]:
                # Stop writing transcript at the evaluation prompt
                if msg["content"].startswith("Now that the interview is over, please evaluate the candidate on:"):
                    break
                role = "You" if msg["role"] == "user" else "AI"
                f.write(f"{role}: {msg['content']}\n")

    # Upload all assets
    upload_to_azure(
        candidate_name="Aniket Deshmukh",
        job_id="JOB1234",
        files_to_upload=[
            ("resume.pdf", "resume.pdf"),           # make sure it exists
            ("interview_report.pdf", "report.pdf"),
            ("transcript.txt", "transcript.txt"),
        ]
    )


    print("📄 PDF Report Saved")
    conversation_context.clear()


# -----------------------
# 🧾 Safe Finalize Interview
# -----------------------
async def safe_finalize_interview():
    global finalized
    if finalized:
        return
    finalized = True
    await finalize_interview()


