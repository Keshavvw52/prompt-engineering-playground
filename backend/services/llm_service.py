import asyncio
import json
import time
from urllib import error, request

from backend.config import settings

DEFAULT_GROQ_MODEL = settings.GROQ_MODEL
GROQ_FALLBACK_MODELS = [
    "llama-3.1-8b-instant",
    "llama-3.3-70b-versatile",
]


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
            return await asyncio.to_thread(
                _call_groq,
                user_prompt,
                system_prompt,
                temperature,
                max_tokens,
                top_p,
                frequency_penalty,
                presence_penalty,
                start,
            )
        else:
            return {"error": f"Unsupported provider: {provider}"}

    except Exception as e:
        return {"error": str(e)}


# GROQ

def _call_groq(
    user_prompt,
    system_prompt,
    temperature,
    max_tokens,
    top_p,
    frequency_penalty,
    presence_penalty,
    start,
):
    try:
        if not settings.GROQ_API_KEY:
            return {"error": "Missing GROQ_API_KEY"}

        messages = []

        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})

        messages.append({"role": "user", "content": user_prompt})

        response = None
        model_used = None
        models_to_try = [DEFAULT_GROQ_MODEL] + [
            model for model in GROQ_FALLBACK_MODELS if model != DEFAULT_GROQ_MODEL
        ]

        for model_name in models_to_try:
            payload = {
                "model": model_name,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
                "top_p": top_p,
                "frequency_penalty": frequency_penalty,
                "presence_penalty": presence_penalty,
            }

            req = request.Request(
                "https://api.groq.com/openai/v1/chat/completions",
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "User-Agent": "prompt-engineering-playground/1.0",
                },
                method="POST",
            )

            try:
                with request.urlopen(req, timeout=60) as resp:
                    response = json.loads(resp.read().decode("utf-8"))
                    model_used = model_name
                    break
            except error.HTTPError as e:
                details = _parse_http_error(e)
                code = (details.get("error") or {}).get("code")
                if code == "model_decommissioned":
                    continue
                return {
                    "error": f"Groq error: {_extract_error_message(details, e)}",
                    "status_code": e.code,
                }

        if response is None:
            return {
                "error": "Groq error: No supported Groq model is currently available.",
                "status_code": 503,
            }

        elapsed = int((time.time() - start) * 1000)

        choice = (response.get("choices") or [{}])[0]
        message = choice.get("message") or {}
        text = message.get("content") or ""
        usage = response.get("usage") or {}

        return {
            "output": text,
            "model": model_used or DEFAULT_GROQ_MODEL,
            "input_tokens": usage.get("prompt_tokens", 0),
            "output_tokens": usage.get("completion_tokens", 0),
            "latency_ms": elapsed,
        }

    except error.HTTPError as e:
        details = _parse_http_error(e)
        return {
            "error": f"Groq error: {_extract_error_message(details, e)}",
            "status_code": e.code,
        }
    except Exception as e:
        return {"error": f"Groq error: {str(e)}"}


def _parse_http_error(exc: error.HTTPError) -> dict:
    try:
        return json.loads(exc.read().decode("utf-8"))
    except Exception:
        return {}


def _extract_error_message(details: dict, exc: Exception) -> str:
    return (details.get("error") or {}).get("message") or str(exc)
