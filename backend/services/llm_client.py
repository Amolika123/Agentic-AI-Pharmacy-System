import os
import httpx

def get_groq_api_key():
    key = os.environ.get("GROQ_API_KEY", "").strip()
    return key if key else None

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.1-8b-instant"

async def chat(messages: list, system_prompt: str = None) -> str:
    # If system_prompt is provided as kwarg, inject it (for legacy support)
    if system_prompt and not any(m.get("role") == "system" for m in messages):
        messages.insert(0, {"role": "system", "content": system_prompt})
        
    api_key = get_groq_api_key()
    if not api_key:
        raise Exception("GROQ_API_KEY not set. Please add it to your .env file")
        
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }
        
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                GROQ_URL,
                headers=headers,
                json={
                    "model": GROQ_MODEL,
                    "messages": messages,
                    "max_tokens": 1000,
                    "temperature": 0.7
                },
                timeout=30.0
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]
    except httpx.HTTPStatusError as e:
        try:
            error_details = e.response.json()
        except:
            error_details = e.response.text
        print(f"[LLMClient] API Error: {error_details}")
        raise Exception(f"API Error {e.response.status_code}: {error_details}")
    except Exception as e:
        print(f"[LLMClient] Error: {e}")
        raise e

async def generate_response(prompt: str, system_prompt: str = None) -> str:
    messages = []
    messages.append({"role": "user", "content": prompt})
    return await chat(messages, system_prompt)

class LLMClient:
    def __init__(self):
        self.model = GROQ_MODEL
        self.base_url = GROQ_URL
        
    async def generate(self, prompt, system_prompt=None):
        return await generate_response(prompt, system_prompt)
        
    async def chat(self, messages, system_prompt=None, **kwargs):
        return await chat(messages, system_prompt)
        
    async def check_ollama_available(self):
        # Ollama usage has been deprecated in favor of Groq
        return False
            
    async def generate_response(self, prompt, system_prompt=None, **kwargs):
        return await generate_response(prompt, system_prompt)
        
    async def get_response(self, prompt, system_prompt=None):
        return await generate_response(prompt, system_prompt)
        
    async def complete(self, prompt, system_prompt=None):
        return await generate_response(prompt, system_prompt)

llm_client = LLMClient()