import os
from gradio_client import Client
import tempfile
from PIL import Image

# Load token
try:
    with open("c:\\Users\\amoli\\OneDrive\\Desktop\\agentic-ai-system\\backend\\.env", "r") as f:
        for line in f:
            if line.startswith("HF_TOKEN="):
                os.environ["HF_TOKEN"] = line.split("=")[1].strip()
                break
except:
    pass

token = os.getenv("HF_TOKEN")
print(f"Token present: {bool(token)}")

try:
    client = Client("prithivMLmods/Multimodal-OCR", token=token)
    print("\n=== API ENDPOINTS ===")
    
    # Capture stdout to file
    import sys
    from io import StringIO
    
    old_stdout = sys.stdout
    with open("api_info.txt", "w", encoding="utf-8") as logs:
        sys.stdout = logs
        try:
            client.view_api()
        except Exception as e:
            print(f"Error viewing api: {e}")
        sys.stdout = old_stdout
        
    print("Saved api_info.txt")
    
    print("\n=== TESTING PREDICTION (CORRECTED) ===")
    try:
        # Correct API usage based on discovery
        result = client.predict(
            model_name="Nanonets-OCR2-3B",
            text="Extract text from this image",
            image='test_image.jpg',
            api_name="/generate_image"
        )
        print("Raw Result:", result)
        
        if isinstance(result, (list, tuple)) and len(result) > 0:
            print("Extracted Text:", result[0])
        else:
            print("Output:", result)
            
    except Exception as e:
        print(f"Prediction failed: {e}")

except Exception as e:
    print(f"Client init failed: {e}")
