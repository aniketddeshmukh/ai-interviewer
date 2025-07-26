import os
import asyncio
import azure.cognitiveservices.speech as speechsdk
from openai import AzureOpenAI
import threading
import time
from dotenv import load_dotenv
# -------------------------------
# 🔧 Globals
# -------------------------------
is_speaking = threading.Event()
shutdown_event = None
speak_callback = None


# -------------------------------
# 🔐 Configuration (Insert your keys here)
# -------------------------------
load_dotenv()

SPEECH_KEY = os.environ.get("SPEECH_KEY")
SPEECH_REGION = os.environ.get("SPEECH_REGION")
OPENAI_KEY = os.environ.get("OPENAI_KEY")
OPENAI_DEPLOYMENT = os.environ.get("OPENAI_DEPLOYMENT")
OPENAI_ENDPOINT = os.environ.get("OPENAI_ENDPOINT")

# -------------------------------
# 🎤 Azure Speech SDK Setup
# -------------------------------
speech_config = speechsdk.SpeechConfig(subscription=SPEECH_KEY, region=SPEECH_REGION)
speech_config.speech_recognition_language = "en-US"
speech_config.speech_synthesis_voice_name = "en-US-LunaNeural"
speech_config.set_property(
    speechsdk.PropertyId.SpeechServiceConnection_EndSilenceTimeoutMs, "4000"
)
speech_config.set_property(
    speechsdk.PropertyId.SpeechServiceConnection_InitialSilenceTimeoutMs, "2000"
)

speech_synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config)

# -------------------------------
# 🧠 OpenAI Setup
# -------------------------------
client = AzureOpenAI(
    api_key=OPENAI_KEY,
    api_version="2024-05-01-preview",
    azure_endpoint=OPENAI_ENDPOINT
)

# -------------------------------
# 🧾 Conversation Context
# -------------------------------
conversation_context = [
    {
        "role": "system",
        "content": (
             "You are an AI interviewer. Greet the candidate first. Ask exactly 5 technical questions about Python, one at a time. DO NOT repeate questions even if user is wrong. "
            "Speak like a human. Do not explain answers unless user is totally wrong. Just aknoledge "
            "If user is silent or gives gibberish, repeat the same question once. "
            "Do not exceed 5 questions. After the last one, say 'That concludes our interview. Thank you!' "
            "At the end, we'll evaluate the candidate's performance. Avoid unnecessary dialogue."
        )
    }
]

# -------------------------------
# 🗣️ Speak (Azure TTS)
# -------------------------------
async def speak_async(text):
    global speak_callback
    is_speaking.set()
    print(f"[AI] {text}")
    if speak_callback:
        await speak_callback(text)

    done = threading.Event()

    def on_speak_completed(evt):
        done.set()

    speech_synthesizer.synthesis_completed.connect(on_speak_completed)
    speech_synthesizer.speak_text_async(text)
    done.wait()
    is_speaking.clear()
    # time.sleep(0.8)

# -------------------------------
# 🤖 OpenAI Chat
# -------------------------------
async def openai_chat_async(messages):
    return await asyncio.get_event_loop().run_in_executor(
        None,
        lambda: client.chat.completions.create(
            model=OPENAI_DEPLOYMENT,
            messages=messages,
            temperature=0.7,
            max_tokens=400
        ).choices[0].message.content
    )

# -------------------------------
# 🔁 Handle User Input
# -------------------------------
async def handle_user_input(text):
    global shutdown_event
    text = text.strip()
    print(f"[USER] {text}")

    if speak_callback:
        await speak_callback(f"__USER__::{text}")

    if not text or len(text) < 3:
        await speak_async("I couldn't hear you properly. I'll repeat the question.")
        last_q = next((msg["content"] for msg in reversed(conversation_context) if msg["role"] == "assistant"), None)
        if last_q:
            await speak_async(last_q)
        return

    conversation_context.append({ "role": "user", "content": text })
    ai_reply = await openai_chat_async(conversation_context)
    conversation_context.append({ "role": "assistant", "content": ai_reply })
    await speak_async(ai_reply)

# -------------------------------
# 🎧 Streaming Recognition
# -------------------------------
def start_streaming_recognition(callback, loop, shutdown_event_param):
    global shutdown_event
    shutdown_event = shutdown_event_param

    recognizer = speechsdk.SpeechRecognizer(speech_config=speech_config)

    buffer = []
    last_recognized_time = time.time()
    lock = threading.Lock()

    def flush_if_silent():
        while not shutdown_event.is_set():
            time.sleep(1)
            with lock:
                if buffer and (time.time() - last_recognized_time > 4):
                    full_text = " ".join(buffer).strip()
                    if full_text:
                        print(f"[DEBUG] Sending buffered input: {full_text}")
                        loop.call_soon_threadsafe(lambda: asyncio.create_task(callback(full_text)))
                    buffer.clear()

    def recognized_handler(evt):
        if is_speaking.is_set():
            return
        if evt.result.reason == speechsdk.ResultReason.RecognizedSpeech:
            with lock:
                buffer.append(evt.result.text)
                last_recognized_time = time.time()

    def canceled_handler(evt):
        print(f"[DEBUG] Canceled: {evt.reason} - {evt.error_details}")

    def listen_loop():
        recognizer.recognized.connect(recognized_handler)
        recognizer.canceled.connect(canceled_handler)
        recognizer.start_continuous_recognition()
        print("🎤 Listening started...")

        try:
            while not shutdown_event.is_set():
                time.sleep(0.2)
        finally:
            recognizer.stop_continuous_recognition()

    # Start both recognition and silence monitor in threads
    threading.Thread(target=listen_loop, daemon=True).start()
    threading.Thread(target=flush_if_silent, daemon=True).start()



# -------------------------------
# 🚀 Main (Standalone Testing)
# -------------------------------
async def main():
    global shutdown_event
    shutdown_event = asyncio.Event()
    loop = asyncio.get_running_loop()
    start_streaming_recognition(handle_user_input, loop, shutdown_event)
    await speak_async("Hello! Let's start your interview.")
    await shutdown_event.wait()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("🛑 Interview ended.")