"""
Google Gemini provider.

Lazily imports `google-generativeai`; raises AIConfigError when the SDK or
GEMINI_API_KEY is missing so the gateway can fall back. Maps Gemini usage metadata
onto the common TokenUsage shape.
"""

from __future__ import annotations

from app.ai.providers.base import LLMProvider
from app.ai.schemas.base import ProviderResponse, TokenUsage
from app.ai.utils.errors import AIConfigError, AIProviderError, AIRateLimitError, AITimeoutError
from app.core.config import settings


class GeminiProvider(LLMProvider):
    name = "gemini"

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
        return ProviderResponse(text=text, model=model, provider=self.name, usage=usage, raw=resp)

    @staticmethod
    def _classify(exc: Exception) -> AIProviderError:
        msg = str(exc).lower()
        if "timeout" in msg or "deadline" in msg:
            return AITimeoutError(str(exc))
        if "rate" in msg or "429" in msg or "quota" in msg or "resource has been exhausted" in msg:
            return AIRateLimitError(str(exc))
        return AIProviderError(str(exc))
