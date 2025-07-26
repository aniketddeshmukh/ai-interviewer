from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.utils import simpleSplit
from reportlab.lib import colors
import datetime

def generate_pdf_report(
    candidate_name,
    interview_date,
    evaluation,
    comments,
    summary="", 
    output_path="interview_report.pdf"
):
    c = canvas.Canvas(output_path, pagesize=A4)
    width, height = A4
    margin = 50
    y = height - margin

    # Title
    c.setFont("Helvetica-Bold", 18)
    c.drawString(margin, y, "🧾 Candidate Interview Report")

    # Candidate Info
    y -= 40
    c.setFont("Helvetica-Bold", 13)
    c.drawString(margin, y, "Candidate Information")

    c.setFont("Helvetica", 12)
    y -= 20
    c.drawString(margin, y, f"Name: {candidate_name}")
    y -= 20
    c.drawString(margin, y, f"Date: {interview_date}")
    y -= 20
    c.drawString(margin, y, "Role: Software Engineer")
    y -= 20
    c.drawString(margin, y, "Company: ABC Bank")

    # Evaluation
    y -= 40
    c.setFont("Helvetica-Bold", 13)
    c.drawString(margin, y, "Evaluation Metrics")

    c.setFont("Helvetica", 12)
    keys_sum=0
    for key, value in evaluation.items():
        keys_sum+=int(value)
        y -= 20
        c.drawString(margin + 10, y, f"{key}: {value}/5")

    # Comments
    y -= 40
    c.setFont("Helvetica-Bold", 13)
    c.drawString(margin, y, "Interview Summary Comments")

    c.setFont("Helvetica", 12)
    y -= 20
    wrapped_comments = []
    for line in comments.split("\n"):
        wrapped = simpleSplit(line, "Helvetica", 12, width - 2 * margin)
        wrapped_comments.extend(wrapped)
    for line in wrapped_comments:
        if y < 80:
            c.showPage()
            y = height - margin
            c.setFont("Helvetica", 12)
        c.drawString(margin + 10, y, line)
        y -= 18

    # Recommendation
    y -= 30
    c.setFont("Helvetica-Bold", 13)
    # average_score = keys_sum / len(evaluation.keys())

    # if average_score >= 4.0:
    #     c.drawString(margin, y, f"Recommendation: ✅ Passed to Next Round")
    # else:
    #     c.drawString(margin, y, f"Recommendation: ❌ Not Recommended")
    # Final Summary
    y -= 30
    c.setFont("Helvetica-Bold", 13)
    c.drawString(margin, y, "Final Recommendation")
    y -= 20
    c.setFont("Helvetica", 12)
    wrapped_summary = simpleSplit(summary, "Helvetica", 12, width - 2 * margin)
    for line in wrapped_summary:
        c.drawString(margin + 10, y, line)
        y -= 18



    c.save()

