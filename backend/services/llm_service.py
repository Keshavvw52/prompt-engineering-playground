import time
from backend.config import settings


async def call_llm(
    user_prompt: str,
    system_prompt: str = "",
    temperature: float = 0.7,
    max_tokens: int = 1024,
    top_p: float = 0.95,
    frequency_penalty: float = 0.0,
    presence_penalty: float = 0.0,
) -> dict:
    start = time.time()
    provider = settings.LLM_PROVIDER.lower()

    try:
        if provider == "groq":
            return _call_groq(
                user_prompt, system_prompt, temperature, max_tokens, top_p, start
            )
        else:
            return {"error": f"Unsupported provider: {provider}"}

    except Exception as e:
        return {"error": str(e)}


# GROQ 

def _call_groq(user_prompt, system_prompt, temperature, max_tokens, top_p, start):
    try:
        if not settings.GROQ_API_KEY:
            return {"error": "Missing GROQ_API_KEY"}

        from groq import Groq

        client = Groq(api_key=settings.GROQ_API_KEY)

        messages = []

        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})

        messages.append({"role": "user", "content": user_prompt})

        response = client.chat.completions.create(
            model="llama-3.1-8b-instant", 
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            top_p=top_p,
        )

        elapsed = int((time.time() - start) * 1000)

        text = response.choices[0].message.content or ""

        return {
            "output": text,
            "model": "llama-3.1-8b-instant",
            "input_tokens": 0,
            "output_tokens": 0,
            "latency_ms": elapsed,
        }

    except Exception as e:
        return {"error": f"Groq error: {str(e)}"}