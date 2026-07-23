"""
Anthropic (Claude) provider.

Lazily imports the `anthropic` SDK; raises AIConfigError when the SDK or
ANTHROPIC_API_KEY is missing so the gateway can fall back.
"""

from __future__ import annotations

from app.ai.providers.base import LLMProvider
from app.ai.schemas.base import ProviderResponse, TokenUsage
from app.ai.utils.errors import AIConfigError, AIProviderError, AIRateLimitError, AITimeoutError
from app.core.config import settings


class AnthropicProvider(LLMProvider):
    name = "anthropic"

    def complete(self, *, system, user, model, temperature, max_tokens, timeout_seconds) -> ProviderResponse:
        key = settings.ANTHROPIC_API_KEY or ""
        if not key:
            raise AIConfigError("anthropic: ANTHROPIC_API_KEY is not configured.")
        try:
            import anthropic  # lazy
        except ImportError as exc:  # pragma: no cover
            raise AIConfigError("The 'anthropic' package is not installed.") from exc

        try:
            client = anthropic.Anthropic(api_key=key)
            resp = client.messages.create(
                model=model,
                system=system,
                messages=[{"role": "user", "content": user}],
                max_tokens=max_tokens,
                temperature=temperature,
                timeout=timeout_seconds,
            )
        except Exception as exc:  # pragma: no cover
            raise self._classify(exc) from exc

        text = "".join(
            getattr(block, "text", "") for block in getattr(resp, "content", [])
            if getattr(block, "type", None) == "text"
        )
        u = getattr(resp, "usage", None)
        usage = TokenUsage(
            prompt_tokens=getattr(u, "input_tokens", None),
            completion_tokens=getattr(u, "output_tokens", None),
            total_tokens=(getattr(u, "input_tokens", 0) + getattr(u, "output_tokens", 0)) if u else None,
        ) if u else TokenUsage()
        return ProviderResponse(
            text=text, model=model, provider=self.name, usage=usage,
            finish_reason=getattr(resp, "stop_reason", None), raw=resp,
        )

    @staticmethod
    def _classify(exc: Exception) -> AIProviderError:
        msg = str(exc).lower()
        if "timeout" in msg or "timed out" in msg:
            return AITimeoutError(str(exc))
        if "rate" in msg or "429" in msg or "overloaded" in msg:
            return AIRateLimitError(str(exc))
        return AIProviderError(str(exc))
