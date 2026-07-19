"""
AI error hierarchy.

All AI failures are represented by these types. `AIError` subclasses
`RuntimeError` so existing routes that do `except RuntimeError -> 503` remain
backward compatible without change. Raw provider exceptions are never allowed to
escape the AI layer — they are wrapped here, so the frontend never sees a
provider's internal error text.
"""

from __future__ import annotations


class AIError(RuntimeError):
    """Base class for all AI-layer failures (also a RuntimeError for back-compat)."""

    #: Whether retrying the same request could plausibly succeed.
    retryable: bool = False
    #: Safe, user-facing message (never leaks provider internals).
    public_message: str = "AI service is temporarily unavailable."


class AIConfigError(AIError):
    """Misconfiguration (missing key, unknown provider). Never retryable."""

    retryable = False
    public_message = "AI service is not configured."


class AIProviderError(AIError):
    """Transient provider/network failure. Retryable."""

    retryable = True
    public_message = "AI service is temporarily unavailable."


class AITimeoutError(AIProviderError):
    """Provider timed out. Retryable."""

    public_message = "AI service timed out. Please try again."


class AIRateLimitError(AIProviderError):
    """Provider rate-limited the request. Retryable (with backoff upstream)."""

    public_message = "AI service is busy. Please retry shortly."


class AIParseError(AIProviderError):
    """The model returned output that could not be parsed as JSON. Retryable."""

    public_message = "AI service returned an unreadable response."


class AIValidationError(AIProviderError):
    """Parsed output did not match the expected schema. Retryable."""

    public_message = "AI service returned an unexpected response shape."
