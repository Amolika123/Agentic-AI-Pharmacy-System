"""
LLM Client for Agentic Pharmacy System.
Uses local Ollama with llama3.2-vision - NO API KEYS REQUIRED.
"""
import os
import httpx
import json
from typing import List, Dict, Any, Optional

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2-vision")


class LLMClient:
    """Local LLM client using Ollama - NO API KEYS REQUIRED."""
    
    def __init__(self):
        self.base_url = OLLAMA_BASE_URL
        self.model = OLLAMA_MODEL
        self.client = httpx.AsyncClient(timeout=120.0)
    
    async def check_ollama_available(self) -> bool:
        """Check if Ollama is running."""
        try:
            response = await self.client.get(f"{self.base_url}/api/tags")
            return response.status_code == 200
        except:
            return False
    
    async def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 2000,
        json_mode: bool = False
    ) -> str:
        """Send chat request to Ollama."""
        try:
            payload = {
                "model": self.model,
                "messages": messages,
                "stream": False,
                "options": {"temperature": temperature, "num_predict": max_tokens}
            }
            if json_mode:
                payload["format"] = "json"
            
            response = await self.client.post(f"{self.base_url}/api/chat", json=payload)
            
            if response.status_code == 200:
                return response.json().get("message", {}).get("content", "")
            return f"Error: {response.status_code}"
        except httpx.ConnectError:
            return "Error: Ollama not running. Start with: ollama serve"
        except Exception as e:
            return f"Error: {str(e)}"
    
    async def detect_language(self, text: str) -> Dict[str, Any]:
        """Detect language of text."""
        messages = [
            {"role": "system", "content": "Detect language. Return JSON: {\"language\": \"ISO-code\", \"confidence\": 0-1}"},
            {"role": "user", "content": text}
        ]
        response = await self.chat(messages, temperature=0.1, json_mode=True)
        try:
            return json.loads(response)
        except:
            return {"language": "en", "confidence": 0.5}
    
    async def classify_intent(self, text: str, intents: List[str]) -> Dict[str, Any]:
        """Classify user intent."""
        messages = [
            {"role": "system", "content": f"Classify intent from: {', '.join(intents)}. Return JSON: {{\"intent\": \"name\", \"confidence\": 0-1}}"},
            {"role": "user", "content": text}
        ]
        response = await self.chat(messages, temperature=0.2, json_mode=True)
        try:
            return json.loads(response)
        except:
            return {"intent": "general_query", "confidence": 0.5}
    
    async def generate_response(self, context: str, user_message: str, language: str = "en") -> str:
        """Generate contextual response."""
        messages = [
            {"role": "system", "content": f"You are a helpful pharmacy assistant. Respond in {language}. Context: {context}"},
            {"role": "user", "content": user_message}
        ]
        return await self.chat(messages)
    
    async def close(self):
        await self.client.aclose()


llm_client = LLMClient()
