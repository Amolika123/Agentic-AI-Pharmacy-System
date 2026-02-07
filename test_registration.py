import requests
import json

url = "http://localhost:8000/api/v1/auth/register"

data = {
    "name": "Priya Ram",
    "email": "priya.ram@email.com",
    "password": "Password123",
    "phone": "+91-123456987",
    "date_of_birth": "1999-11-04",
    "address": "52, Bund Garden, Pune",
    "language": "en",
    "chronic_conditions": "None",
    "allergies": "penicillin"
}

try:
    print(f"Sending request to {url} with data: {json.dumps(data, indent=2)}")
    response = requests.post(url, json=data)
    
    print(f"Status Code: {response.status_code}")
    print(f"Response Body: {response.text}")
    
    try:
        json_resp = response.json()
        print("JSON Response:", json.dumps(json_resp, indent=2))
    except:
        print("Response is not JSON")

except Exception as e:
    print(f"Request failed: {e}")
