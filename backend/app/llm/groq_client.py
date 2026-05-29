import time
import logging
import json
from groq import Groq
from app.core.config import settings

logger = logging.getLogger(__name__)

_client: Groq | None = None

def get_groq_client() -> Groq:
    """
    Returns a singleton Groq client instance.
    """
    global _client
    if _client is None:
        api_key = settings.GROQ_API_KEY
        if not api_key or api_key == "gsk_placeholder_key":
            raise RuntimeError("GROQ_API_KEY is not configured. Set it in .env.local.")
        _client = Groq(api_key=api_key)
        logger.info("Groq client initialized.")
    return _client

def call_groq(
    system_prompt: str,
    user_prompt: str,
    model: str = "llama-3.3-70b-versatile",
    temperature: float = 0.2,
    max_tokens: int = 2048,
    max_retries: int = 3,
    timeout_seconds: int = 30
) -> str:
    """
    Sends a chat completion request to Groq with retry logic.
    Returns the raw content string from the model response.
    """
    client = get_groq_client()

    for attempt in range(1, max_retries + 1):
        start_time = time.time()
        try:
            logger.info(f"Groq request attempt {attempt}/{max_retries} | model={model}")

            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=temperature,
                max_tokens=max_tokens,
                timeout=timeout_seconds
            )

            latency_ms = round((time.time() - start_time) * 1000)
            content = response.choices[0].message.content or ""
            logger.info(f"Groq response received | latency={latency_ms}ms | model={model} | chars={len(content)}")
            return content

        except Exception as e:
            latency_ms = round((time.time() - start_time) * 1000)
            logger.warning(f"Groq request failed attempt {attempt}/{max_retries} | latency={latency_ms}ms | error={str(e)}")
            if attempt == max_retries:
                raise RuntimeError(f"Groq API failed after {max_retries} retries: {str(e)}")
