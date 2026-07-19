"""
Shared Groq client factory.

Provides the singleton `Groq` client + `GroqConfigError` reused by the AI
orchestrator's Groq provider (`app.ai.providers.groq_provider`). All LLM
completions flow through the orchestrator → provider → this client; there is no
direct-completion helper here (the legacy `call_groq` wrapper was removed once
every capability was migrated onto the orchestrator).
"""
import logging
from groq import Groq
from app.core.config import settings

logger = logging.getLogger(__name__)

_client: Groq | None = None


class GroqConfigError(RuntimeError):
    """Raised when the Groq client cannot be configured (e.g. missing API key).
    Unlike transient network errors, this must never be retried."""


def get_groq_client() -> Groq:
    """
    Returns a singleton Groq client instance.
    """
    global _client
    if _client is None:
        api_key = settings.GROQ_API_KEY
        if not api_key or api_key == "gsk_placeholder_key":
            raise GroqConfigError("GROQ_API_KEY is not configured. Set it in the environment or backend/.env.local.")
        _client = Groq(api_key=api_key)
        logger.info("Groq client initialized.")
    return _client
