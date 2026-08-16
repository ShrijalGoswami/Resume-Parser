"""
Groq provider.

Owns its Groq SDK client directly (lazy singleton) — the legacy
`app.llm.groq_client` shared factory was folded in here so the Groq SDK, like
every other vendor SDK, lives only inside its provider module. Performs a single
attempt and captures token usage; the orchestrator owns retries and observability.
Wraps every vendor exception in the AI error hierarchy.
"""

from __future__ import annotations

import logging
from typing import Any

from app.ai.gateway.roles import ModelRole
from app.ai.providers.base import LLMProvider
from app.ai.schemas.base import ProviderResponse, TokenUsage
from app.ai.utils.errors import AIConfigError
from app.core.config import settings

logger = logging.getLogger(__name__)

_PLACEHOLDER_KEY = "gsk_placeholder_key"


class GroqProvider(LLMProvider):
    name = "groq"
    display_name = "Groq"
    api_key_setting = "GROQ_API_KEY"
    sdk_namespace = "groq"
    # Groq states the window in the message: "Rate limit reached … tokens per day
    # (TPD)". Preserved VERBATIM from the pre-C1 expression, including the bare
    # "quota": this is the only marker list ever exercised against a live
    # account, so C1 had no business tuning it while closing a gap elsewhere.
    quota_markers = ("per day", "tpd", "rpd", "daily", "quota")
    # Groq's chat-completions API is OpenAI-compatible and accepts
    # `response_format={"type": "json_object"}`. Load-bearing since C6.
    can_json = True
    can_stream = True
    can_reason = True
    can_tools = True
    ctx_window = 131072
    max_output = 32768
    role_models = {
        # `llama-3.3-70b-versatile` was retired from this deployment; the three
        # roles it served now resolve to `openai/gpt-oss-120b`. The slash is part
        # of the model id Groq publishes — it is NOT a provider prefix, and the
        # registry still maps it to provider "groq".
        ModelRole.DEFAULT_REASONING: "openai/gpt-oss-120b",
        ModelRole.FAST_REASONING: "llama-3.1-8b-instant",
        ModelRole.CHEAP_REASONING: "llama-3.1-8b-instant",
        ModelRole.LONG_CONTEXT: "openai/gpt-oss-120b",
        ModelRole.PREMIUM_REASONING: "openai/gpt-oss-120b",
    }

    _client: Any = None  # lazily-constructed singleton Groq() client

    def _get_client(self) -> Any:
        if GroqProvider._client is None:
            key = settings.GROQ_API_KEY
            if not key or key == _PLACEHOLDER_KEY:
                raise AIConfigError("GROQ_API_KEY is not configured.")
            try:
                from groq import Groq  # lazy — only needed for this provider
            except ImportError as exc:  # pragma: no cover
                raise AIConfigError("The 'groq' package is not installed.") from exc
            GroqProvider._client = Groq(api_key=key)
            logger.info("Groq client initialized.")
        return GroqProvider._client

    def complete(self, *, system, user, model, temperature, max_tokens, timeout_seconds,
                 json_mode: bool = False) -> ProviderResponse:
        client = self._get_client()
        # Native JSON mode (C6). Sent only when the orchestrator has confirmed
        # both this provider and the resolved MODEL declare support, so an
        # unsupported model never receives a parameter it would 400 on.
        #
        # The API additionally requires the word "JSON" to appear in the
        # messages. Every registered prompt already contains it, which is why
        # C6 needed no prompt changes — see `tests/test_native_json.py`, which
        # asserts that and will fail if a future prompt drops it.
        extra = {"response_format": {"type": "json_object"}} if json_mode else {}
        try:
            resp = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                temperature=temperature,
                max_tokens=max_tokens,
                timeout=timeout_seconds,
                **extra,
            )
        except Exception as exc:  # normalize vendor errors → AI error hierarchy
            raise self._classify(exc) from exc

        choice = resp.choices[0]
        text = choice.message.content or ""
        return ProviderResponse(
            text=text,
            model=model,
            provider=self.name,
            usage=TokenUsage.from_raw(getattr(resp, "usage", None)),
            finish_reason=getattr(choice, "finish_reason", None),
        )

    # The placeholder key is a Groq-specific fact, and the provider is the source
    # of truth for its own configuration. It used to live in
    # `Settings.is_llm_configured` as well, which is how "is the LLM configured?"
    # came to mean "is Groq configured?" (C8).
    def is_configured(self) -> bool:
        key = (settings.GROQ_API_KEY or "").strip()
        return bool(key) and key != _PLACEHOLDER_KEY

