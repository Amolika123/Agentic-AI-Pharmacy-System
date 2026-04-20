import os
import httpx

def get_groq_api_key():
    key = os.environ.get("GROQ_API_KEY", "").strip()
    return key if key else None

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama3-8b-8192"

def get_ollama_url():
    return os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/") + "/v1/chat/completions"

def get_ollama_model():
    return os.environ.get("OLLAMA_MODEL", "llama3.2-vision")

async def chat(messages: list, system_prompt: str = None) -> str:
    # If system_prompt is provided as kwarg, inject it (for legacy support)
    if system_prompt and not any(m.get("role") == "system" for m in messages):
        messages.insert(0, {"role": "system", "content": system_prompt})
        
    api_key = get_groq_api_key()
    url = GROQ_URL if api_key else get_ollama_url()
    model = GROQ_MODEL if api_key else get_ollama_model()
    
    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
        
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                url,
                headers=headers,
                json={
                    "model": model,
                    "messages": messages,
                    "max_tokens": 1000,
                    "temperature": 0.7
                },
                timeout=30.0
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]
    except Exception as e:
        print(f"[LLMClient] Error: {e}")
        if isinstance(e, httpx.ConnectError) and not api_key:
            raise Exception("Cannot connect to local Ollama instance. Please start Ollama or provide a GROQ_API_KEY.")
        raise e

async def generate_response(prompt: str, system_prompt: str = None) -> str:
    messages = []
    messages.append({"role": "user", "content": prompt})
    return await chat(messages, system_prompt)

class LLMClient:
    def __init__(self):
        self.model = GROQ_MODEL if get_groq_api_key() else get_ollama_model()
        self.base_url = GROQ_URL if get_groq_api_key() else get_ollama_url()
        
    async def generate(self, prompt, system_prompt=None):
        return await generate_response(prompt, system_prompt)
        
    async def chat(self, messages, system_prompt=None, **kwargs):
        # Ignored specific kwargs like temperature/json_mode that were breaking standard format earlier
        return await chat(messages, system_prompt)
        
    async def check_ollama_available(self):
        try:
            url = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/") + "/api/tags"
            async with httpx.AsyncClient() as client:
                resp = await client.get(url, timeout=2.0)
                return resp.status_code == 200
        except Exception:
            return False
            
    async def generate_response(self, prompt, system_prompt=None, **kwargs):
        return await generate_response(prompt, system_prompt)
        
    async def get_response(self, prompt, system_prompt=None):
        return await generate_response(prompt, system_prompt)
        
    async def complete(self, prompt, system_prompt=None):
        return await generate_response(prompt, system_prompt)

llm_client = LLMClient()