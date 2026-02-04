import os
import time
from gradio_client import Client
# Load keys from .env manually to avoid dotenv dependency if not installed in this context
try:
    with open("c:\\Users\\amoli\\OneDrive\\Desktop\\agentic-ai-system\\backend\\.env", "r") as f:
        for line in f:
            if line.startswith("HF_TOKEN="):
                os.environ["HF_TOKEN"] = line.split("=")[1].strip()
                break
except Exception as e:
    print(f"Error reading .env: {e}")

hf_token = os.getenv("HF_TOKEN")
print(f"Testing connection to prithivMLmods/Multimodal-OCR...")
print(f"Token found: {'Yes' if hf_token else 'No'}")

client = None
try:
    print("Attempting with hf_token=...")
    client = Client("prithivMLmods/Multimodal-OCR", hf_token=hf_token)
except TypeError:
    print("Failed with hf_token, attempting with token=...")
    try:
        client = Client("prithivMLmods/Multimodal-OCR", token=hf_token)
        print("Note: Used 'token' instead of 'hf_token'")
    except Exception as e:
        print(f"❌ Connection failed with token=: {e}")
except Exception as e:
    print(f"❌ Connection failed with hf_token=: {e}")

if client:
    print("✅ Successfully connected to HuggingFace Space!")
    try:
        print("API endpoints available:")
        # client.view_api() prints to stdout, doesn't return string usually, but let's call it
        client.view_api()
    except Exception as e:
        print(f"Could not view API: {e}")
else:
    print("❌ Could not connect.")
