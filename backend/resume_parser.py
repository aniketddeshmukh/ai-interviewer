from azure.ai.documentintelligence import DocumentIntelligenceClient
from azure.core.credentials import AzureKeyCredential
from fastapi import UploadFile
import os
from dotenv import load_dotenv
load_dotenv()
from azure.ai.formrecognizer import DocumentAnalysisClient


endpoint = os.getenv("AZURE_DOC_ENDPOINT")
key = os.getenv("AZURE_DOC_KEY")

client = DocumentAnalysisClient(
    endpoint=endpoint,
    credential=AzureKeyCredential(key)  # ✅ Wrap key with AzureKeyCredential
)


def extract_resume_text(file):
    poller = client.begin_analyze_document("prebuilt-document", file)
    result = poller.result()

    extracted_text = ""
    for page in result.pages:
        for line in page.lines:
            extracted_text += line.content + "\n"

    return {"text": extracted_text}

