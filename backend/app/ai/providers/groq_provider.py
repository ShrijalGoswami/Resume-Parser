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

        choice = resp.choices[0]
        text = choice.message.content or ""
        return ProviderResponse(
            text=text,
            model=model,
            provider=self.name,
            usage=TokenUsage.from_raw(getattr(resp, "usage", None)),
            finish_reason=getattr(choice, "finish_reason", None),
            raw=resp,
        )

    @staticmethod
    def _classify(exc: Exception) -> AIProviderError:
        msg = str(exc).lower()
        if "timeout" in msg or "timed out" in msg:
            return AITimeoutError(str(exc))
        if "rate limit" in msg or "429" in msg or "too many requests" in msg or "quota" in msg:
            # Per-DAY limits (TPD/RPD) do not clear today → quota, fail fast.
            # Per-minute limits (RPM/TPM) clear in seconds → transient, retryable.
            is_quota = any(k in msg for k in ("per day", "tpd", "rpd", "daily", "quota"))
            return AIRateLimitError(
                str(exc), retry_after=_retry_after_of(exc), is_quota=is_quota
            )
        return AIProviderError(str(exc))


def _retry_after_of(exc: Exception) -> float | None:
    """Best-effort parse of a Retry-After (seconds) from the vendor exception's
    HTTP response headers. Returns None when absent/unparseable."""
    resp = getattr(exc, "response", None)
    headers = getattr(resp, "headers", None)
    if not headers:
        return None
    raw = None
    try:
        raw = headers.get("retry-after") or headers.get("Retry-After")
    except Exception:  # pragma: no cover — non-mapping headers
        return None
    if not raw:
        return None
    try:
        return max(0.0, float(raw))
    except (TypeError, ValueError):  # pragma: no cover — HTTP-date form, ignore
        return None
