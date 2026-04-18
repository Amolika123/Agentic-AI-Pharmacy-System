import os
import httpx

API_KEY = os.environ.get("GROQ_API_KEY", "")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama3-8b-8192"

async def generate_response(prompt: str, system_prompt: str = None) -> str:
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})
    async with httpx.AsyncClient() as client:
        response = await client.post(
            GROQ_URL,
            headers={
                "Authorization": f"Bearer {API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": GROQ_MODEL,
                "messages": messages,
                "max_tokens": 1000,
                "temperature": 0.7
            },
            timeout=30.0
        )
    data = response.json()
    return data["choices"][0]["message"]["content"]

async def chat(messages: list, system_prompt: str = None) -> str:
    return await generate_response(
        messages[-1]["content"] if messages else "",
        system_prompt
    )

class LLMClient:
    async def generate(self, prompt, system_prompt=None):
        return await generate_response(prompt, system_prompt)
    async def chat(self, messages, system_prompt=None):
        return await chat(messages, system_prompt)
    async def check_ollama_available(self):
        return True
    async def generate_response(self, prompt, system_prompt=None):
        return await generate_response(prompt, system_prompt)
    async def get_response(self, prompt, system_prompt=None):
        return await generate_response(prompt, system_prompt)
    async def complete(self, prompt, system_prompt=None):
        return await generate_response(prompt, system_prompt)

llm_client = LLMClient()