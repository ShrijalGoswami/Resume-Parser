"""
Google Gemini provider.

Lazily imports `google-generativeai`; raises AIConfigError when the SDK or
GEMINI_API_KEY is missing so the gateway can fall back. Maps Gemini usage metadata
onto the common TokenUsage shape.
"""

from __future__ import annotations

from app.ai.gateway.roles import ModelRole
from app.ai.providers.base import LLMProvider
from app.ai.schemas.base import ProviderResponse, TokenUsage
from app.ai.utils.errors import AIConfigError
from app.core.config import settings


class GeminiProvider(LLMProvider):
    name = "gemini"
    display_name = "Google Gemini"
    api_key_setting = "GEMINI_API_KEY"
    # google-generativeai raises through google.api_core, not its own namespace.
    sdk_namespace = "google"
    # NARROWER THAN GROQ'S ON PURPOSE. Google phrases both windows the same way —
    # "Quota exceeded for quota metric 'Generate Content API requests per minute'"
    # is a PER-MINUTE limit that clears in seconds. Including the bare word
    # "quota" here, as Groq's list does, would stop retrying a request that was
    # about to succeed. Only day-scoped wording means "not today".
    quota_markers = ("per day", "perday", "per-day", "daily", "/day")
    can_json = True
    can_stream = True
    can_reason = True
    can_vision = True
    can_embeddings = True
    ctx_window = 1048576
    max_output = 8192
    role_models = {
        ModelRole.DEFAULT_REASONING: "gemini-2.0-flash",
        ModelRole.FAST_REASONING: "gemini-2.0-flash",
        ModelRole.CHEAP_REASONING: "gemini-2.0-flash",
        ModelRole.LONG_CONTEXT: "gemini-1.5-pro",
        ModelRole.PREMIUM_REASONING: "gemini-1.5-pro",
        ModelRole.EMBEDDINGS: "text-embedding-004",
    }

    def complete(self, *, system, user, model, temperature, max_tokens, timeout_seconds) -> ProviderResponse:
        key = settings.GEMINI_API_KEY or ""
        if not key:
            raise AIConfigError("gemini: GEMINI_API_KEY is not configured.")
        try:
            import google.generativeai as genai  # lazy
        except ImportError as exc:  # pragma: no cover
            raise AIConfigError("The 'google-generativeai' package is not installed.") from exc

        try:
            genai.configure(api_key=key)
            gm = genai.GenerativeModel(model, system_instruction=system)
            resp = gm.generate_content(
                user,
                generation_config={"temperature": temperature, "max_output_tokens": max_tokens},
                request_options={"timeout": timeout_seconds},
            )
        except Exception as exc:  # pragma: no cover
            raise self._classify(exc) from exc

        text = getattr(resp, "text", "") or ""
        um = getattr(resp, "usage_metadata", None)
        usage = TokenUsage(
            prompt_tokens=getattr(um, "prompt_token_count", None),
            completion_tokens=getattr(um, "candidates_token_count", None),
            total_tokens=getattr(um, "total_token_count", None),
        ) if um else TokenUsage()
        cands = getattr(resp, "candidates", None) or []
        finish = str(getattr(cands[0], "finish_reason", "")) if cands else None
        return ProviderResponse(
            text=text, model=model, provider=self.name, usage=usage,
            finish_reason=finish or None,
        )

