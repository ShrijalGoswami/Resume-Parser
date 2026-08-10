"""
Retry backoff math, shared by every path that retries a vendor call.

Extracted from `AIOrchestrator` (A4) so the embedding service can retry with the
SAME policy and the SAME configuration instead of growing a second, subtly
different one. The functions are pure — they compute a delay and nothing else —
so a caller owns its own budgets, logging and `time.sleep`.

Both callers read their numbers from `AI_RETRY_BASE_DELAY_MS`,
`AI_RETRY_MAX_DELAY_MS` and `AI_MAX_RATE_LIMIT_RETRIES`. There is deliberately no
embedding-specific retry setting: two knobs that mean the same thing drift apart,
and the one you did not set is the one that matters at 3am.
"""

from __future__ import annotations

import random


def exponential_backoff(attempt: int, *, base_ms: int, cap_ms: int) -> float:
    """Exponential backoff with EQUAL jitter, capped. `attempt` is 1-based.

    Equal jitter (half fixed + half random) guarantees a non-trivial minimum
    wait, so backoff is provable in tests yet still de-correlates retries.
    """
    base = base_ms / 1000.0
    cap = cap_ms / 1000.0
    raw = min(cap, base * (2 ** (attempt - 1)))
    return raw / 2 + random.uniform(0, raw / 2)


def rate_limit_delay(
    retry_after: float | None, attempt: int, *, base_ms: int, cap_ms: int
) -> float:
    """Honor Retry-After when the provider sent one (capped); otherwise fall back
    to exponential jittered backoff.

    The cap applies to `retry_after` too: a provider that asks for ten minutes is
    telling us to fail, not to hold a request open for ten minutes.
    """
    cap = cap_ms / 1000.0
    if retry_after is not None:
        return min(cap, float(retry_after))
    return exponential_backoff(attempt, base_ms=base_ms, cap_ms=cap_ms)
