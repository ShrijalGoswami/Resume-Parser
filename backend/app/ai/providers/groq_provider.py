"""
Groq provider.

Reuses the existing singleton client from `app.llm.groq_client` (no duplicated
SDK setup) but performs a single attempt and captures token usage, so the
orchestrator can own retries and observability. Wraps every vendor exception in
the AI error hierarchy.
"""

from __future__ import annotations

import logging

from app.ai.providers.base import LLMProvider
from app.ai.schemas.base import ProviderResponse, TokenUsage
from app.ai.utils.errors import AIConfigError, AIProviderError, AIRateLimitError, AITimeoutError
from app.llm.groq_client import GroqConfigError, get_groq_client

logger = logging.getLogger(__name__)


class GroqProvider(LLMProvider):
    name = "groq"

    def complete(
        self,
        *,
        system: str,
        user: str,
        model: str,
        temperature: float,
        max_tokens: int,
        timeout_seconds: int,
    ) -> ProviderResponse:
        try:
            client = get_groq_client()
        except GroqConfigError as exc:
            raise AIConfigError(str(exc)) from exc

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
            )
        except Exception as exc:  # normalize vendor errors → AI error hierarchy
            raise self._classify(exc) from exc

        text = resp.choices[0].message.content or ""
        return ProviderResponse(
            text=text,
            model=model,
            provider=self.name,
            usage=TokenUsage.from_raw(getattr(resp, "usage", None)),
            raw=resp,
        )

    @staticmethod
    def _classify(exc: Exception) -> AIProviderError:
        msg = str(exc).lower()
        if "timeout" in msg or "timed out" in msg:
            return AITimeoutError(str(exc))
        if "rate limit" in msg or "429" in msg or "too many requests" in msg:
            return AIRateLimitError(str(exc))
        return AIProviderError(str(exc))
