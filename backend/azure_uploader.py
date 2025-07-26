import os
from azure.storage.blob import BlobServiceClient, ContentSettings
from dotenv import load_dotenv

load_dotenv()

AZURE_CONN_STRING = os.environ.get("AZURE_STORAGE_CONNECTION_STRING")
AZURE_CONTAINER_NAME = os.environ.get("AZURE_CONTAINER_NAME", "interview-data")

def upload_to_azure(candidate_name, job_id, files_to_upload):
    if not AZURE_CONN_STRING:
        raise ValueError("Missing AZURE_STORAGE_CONNECTION_STRING in .env")

    folder_name = f"{candidate_name.replace(' ', '_')}_{job_id}"
    blob_service_client = BlobServiceClient.from_connection_string(AZURE_CONN_STRING)
    container_client = blob_service_client.get_container_client(AZURE_CONTAINER_NAME)

    # Create container if it doesn't exist
    try:
        container_client.create_container()
    except Exception:
        pass  # Already exists

    for local_path, blob_name in files_to_upload:
        blob_path = f"{folder_name}/{blob_name}"
        print(f"☁️ Uploading {local_path} to Azure Blob: {blob_path}")

        with open(local_path, "rb") as data:
            container_client.upload_blob(
                name=blob_path,
                data=data,
                overwrite=True,
                content_settings=ContentSettings(content_type="application/octet-stream")
            )
    print("✅ All files uploaded to Azure successfully.")
