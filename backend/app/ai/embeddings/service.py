"""
Embedding service — the single entry point for turning text into vectors.

Resolves the active provider, runs the embedding call, and records lightweight
observability (provider, model, dimensions, count, latency). This is the
retrieval-side analogue of the AIOrchestrator; it NEVER calls the LLM.
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass

from app.ai.config import get_ai_config
from app.ai.embeddings.base import EmbeddingProvider
from app.ai.embeddings.registry import get_embedding_provider
from app.ai.utils.backoff import exponential_backoff, rate_limit_delay
from app.ai.utils.errors import (
    AIConfigError,
    AIProviderError,
    AIRateLimitError,
    AITimeoutError,
)

logger = logging.getLogger("app.ai")


@dataclass
class EmbeddingResult:
    vectors: list[list[float]]
    provider: str
    model: str
    dimensions: int
    latency_ms: int


def _invoke(prov: EmbeddingProvider, texts: list[str], input_type: str | None) -> list[list[float]]:
    """One provider attempt. `input_type` reaches only providers that accept it."""
    if input_type and getattr(prov, "supports_input_type", False):
        return prov.embed(texts, input_type=input_type)
    return prov.embed(texts)


def _embed_with_retry(
    prov: EmbeddingProvider, texts: list[str], input_type: str | None
) -> list[list[float]]:
    """Call the provider, retrying only failures that could plausibly clear.

    WHY THIS LIVES HERE AND NOT IN THE PROVIDER
    -------------------------------------------
    `EmbeddingProvider.embed` is documented as "one attempt; raise on failure",
    and that contract is worth keeping: it makes each provider trivially
    testable, and it means a new provider inherits this policy for free rather
    than reimplementing it. So the ladder wraps the provider from outside.

    THE POLICY (identical to the orchestrator's, from the same settings)
    -------------------------------------------------------------------
    Two SEPARATE bounded budgets, because the two failures mean different things:

      * transient 429  → `AI_MAX_RATE_LIMIT_RETRIES`, waiting `Retry-After` when
        the provider sent one, otherwise exponential jittered backoff;
      * timeout / 5xx  → `AI_MAX_NETWORK_RETRIES`, exponential jittered backoff.

    Never retried, because a retry cannot change the answer:
      * `AIConfigError`  — missing/refused credential, unknown provider;
      * quota exhaustion (`AIRateLimitError.is_quota`) — will not clear today,
        and retrying only burns more of a scarce daily budget;
      * any error whose `retryable` is False — notably a permanent 4xx from NIM.

    Worst case is `1 + max_rate_limit_retries + max_network_retries` attempts
    (6 at the defaults), so a failing provider cannot become a retry storm. The
    caller above (`talent_search`) still degrades to lexical-only once this
    ladder is exhausted — retrying makes that rarer, not unnecessary.

    Retries re-send the whole batch. Embedding is a pure function of its input,
    so a repeat is safe; and every batch this app sends is small (indexing embeds
    one profile, search embeds one query).
    """
    cfg = get_ai_config()
    rate_limit_retries = 0
    network_fails = 0
    attempt = 0

    while True:
        attempt += 1
        try:
            return _invoke(prov, texts, input_type)
        except AIConfigError:
            # Configuration/authentication. Permanent by definition.
            raise
        except AIRateLimitError as exc:
            if exc.is_quota or rate_limit_retries >= cfg.max_rate_limit_retries:
                _log_retry(prov, attempt,
                           "rate_limit_quota" if exc.is_quota else "rate_limit_exhausted",
                           0.0, exc, final=True)
                raise
            rate_limit_retries += 1
            delay = rate_limit_delay(
                exc.retry_after, rate_limit_retries,
                base_ms=cfg.retry_base_delay_ms, cap_ms=cfg.retry_max_delay_ms,
            )
            _log_retry(prov, attempt, "rate_limit", delay, exc, retry_after=exc.retry_after)
            time.sleep(delay)
        except AIProviderError as exc:
            # Covers AITimeoutError (a subclass) and 5xx. A permanent 4xx arrives
            # here too, flagged `retryable = False` by the provider.
            if not exc.retryable:
                _log_retry(prov, attempt, "permanent", 0.0, exc, final=True)
                raise
            network_fails += 1
            if network_fails >= cfg.max_network_retries:
                reason = "timeout_exhausted" if isinstance(exc, AITimeoutError) else "provider_error_exhausted"
                _log_retry(prov, attempt, reason, 0.0, exc, final=True)
                raise
            delay = exponential_backoff(
                network_fails, base_ms=cfg.retry_base_delay_ms, cap_ms=cfg.retry_max_delay_ms
            )
            reason = "timeout" if isinstance(exc, AITimeoutError) else "provider_error"
            _log_retry(prov, attempt, reason, delay, exc)
            time.sleep(delay)


def _log_retry(prov, attempt: int, reason: str, delay: float, exc,
               *, retry_after=None, final: bool = False) -> None:
    """One structured line per retry decision, mirroring the orchestrator's."""
    logger.warning(
        "Embedding retry | provider=%s model=%s attempt=%d reason=%s delay_ms=%d "
        "retry_after=%s outcome=%s error=%s",
        prov.name, prov.model, attempt, reason, round(delay * 1000),
        ("none" if retry_after is None else f"{retry_after}s"),
        ("giving_up" if final else "retrying"), str(exc)[:120],
    )


def embed_texts(
    texts: list[str],
    *,
    provider: str | None = None,
    input_type: str | None = None,
) -> EmbeddingResult:
    """Embed a batch of texts through the configured provider (observed).

    `input_type` is "passage" when indexing and "query" when searching. It is
    forwarded ONLY to providers that advertise `supports_input_type`, so the
    symmetric providers (hashing) keep their existing single-argument call and
    their behaviour is unchanged.
    """
    prov = get_embedding_provider(provider)
    start = time.time()
    vectors = [] if not texts else _embed_with_retry(prov, texts, input_type)
    latency = round((time.time() - start) * 1000)
    logger.info(
        "Embedding | provider=%s model=%s dim=%s count=%d latency=%dms",
        prov.name, prov.model, prov.dimensions, len(texts), latency,
    )
    return EmbeddingResult(
        vectors=vectors, provider=prov.name, model=prov.model,
        dimensions=prov.dimensions, latency_ms=latency,
    )


def embed_query(text: str, *, provider: str | None = None) -> list[float]:
    """Embed a single SEARCH QUERY.

    Tagged `query` so asymmetric retrieval models project it into the same space
    as the stored passages. Getting this wrong does not raise — it just makes
    every ranking quietly worse — which is why the distinction lives here rather
    than at each call site.
    """
    result = embed_texts([text], provider=provider, input_type="query")
    return result.vectors[0] if result.vectors else []


def active_embedding_model() -> str:
    """Identifier for the active provider+model (stored to detect staleness)."""
    prov = get_embedding_provider()
    return f"{prov.name}:{prov.model}"
