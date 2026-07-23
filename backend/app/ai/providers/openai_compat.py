"""
OpenAI-compatible providers (OpenAI, OpenRouter, and any compatible endpoint).

Uses the `openai` SDK with a configurable base URL. The SDK is imported lazily so
it is only required when one of these providers is actually selected — an
unconfigured provider raises AIConfigError, which the gateway treats as a signal
to fall back to the next provider.
"""

from __future__ import annotations

from app.ai.providers.base import LLMProvider
from app.ai.schemas.base import ProviderResponse, TokenUsage
from app.ai.utils.errors import AIConfigError, AIProviderError, AIRateLimitError, AITimeoutError
from app.core.config import settings


class OpenAICompatProvider(LLMProvider):
    name = "openai_compat"
    key_setting = "OPENAI_API_KEY"
    base_url: str | None = None

    def _api_key(self) -> str:
        return getattr(settings, self.key_setting, "") or ""

    def complete(self, *, system, user, model, temperature, max_tokens, timeout_seconds) -> ProviderResponse:
        key = self._api_key()
        if not key:
            raise AIConfigError(f"{self.name}: {self.key_setting} is not configured.")
        try:
            from openai import OpenAI  # lazy — only needed for this provider
        except ImportError as exc:  # pragma: no cover
            raise AIConfigError("The 'openai' package is not installed.") from exc

        try:
            client = OpenAI(api_key=key, base_url=self.base_url) if self.base_url else OpenAI(api_key=key)
            resp = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                temperature=temperature,
                max_tokens=max_tokens,
                timeout=timeout_seconds,
            )
        except Exception as exc:  # pragma: no cover — normalize vendor errors
            raise self._classify(exc) from exc

        choice = resp.choices[0]
        text = choice.message.content or ""
        return ProviderResponse(
            text=text, model=model, provider=self.name,
            usage=TokenUsage.from_raw(getattr(resp, "usage", None)),
            finish_reason=getattr(choice, "finish_reason", None), raw=resp,
        )

    @staticmethod
    def _classify(exc: Exception) -> AIProviderError:
        msg = str(exc).lower()
        if "timeout" in msg or "timed out" in msg:
            return AITimeoutError(str(exc))
        if "rate limit" in msg or "429" in msg or "too many requests" in msg:
            return AIRateLimitError(str(exc))
        return AIProviderError(str(exc))


class OpenAIProvider(OpenAICompatProvider):
    name = "openai"
    key_setting = "OPENAI_API_KEY"
    base_url = None


class OpenRouterProvider(OpenAICompatProvider):
    name = "openrouter"
    key_setting = "OPENROUTER_API_KEY"
    base_url = "https://openrouter.ai/api/v1"
