"""
The per-request budget for paid model invocations. One owner, one counter.

WHY THIS EXISTS (S-5)
---------------------
The retry ladder is three nested loops — network, JSON, schema — and their bounds
MULTIPLY: 3 x 3 x 2 is **18 provider calls for one logical request**, and the
failover loop wraps all of it, so N providers cost 18N. Nothing counted the
total. Each loop knew its own bound and none knew the product.

`/batch-analysis` accepts 100 files at 20 POSTs/min/IP, so the arithmetic reaches
tens of thousands of provider calls per minute from a single client. On Groq's
free tier — ~100k tokens/day for the whole platform — a request that reliably
fails schema validation is a cheaper denial-of-service than one that succeeds.

WHAT THIS IS, AND WHAT IT IS NOT
--------------------------------
It is **one counter with a ceiling**, consulted immediately before every paid
call. It is not a fourth retry loop and it does not decide whether something is
retryable — `app/ai/providers/errors.py` owns that (§9A rule 14) and this owns
only *how many more times anything may be tried at all*.

The distinction matters for the next person: a new retry rule extends this
budget, it does not bring its own counter. The reason the ladder could reach 18
in the first place is that three bounds existed and nothing added them up.

ONE COUNTER, NOT TWO
--------------------
`AIExecution.network_attempts` still reports calls made during a single
provider's attempt, because that is what the field means and the evaluation
harness reads it. It is derived from this budget with `mark()`/`spent_since()`
rather than from a second variable — the request total and the per-attempt count
are two readings of one counter, never two counters that can disagree.

FAILING CLEANLY
---------------
Exhaustion raises `AIBudgetExhaustedError`, which is **not retryable** and is
**not** a provider failure: it says the request stopped because it had spent
enough, names both numbers, and does not fail over to another provider — trying
somewhere else is exactly the spending the budget exists to prevent.
"""

from __future__ import annotations

import logging

from app.ai.utils.errors import AIBudgetExhaustedError
from app.core.config import settings

logger = logging.getLogger("app.ai")


class CallBudget:
    """How many paid model invocations one logical request may still make.

    Deterministic: it counts, it does not sample or time out. The same sequence
    of outcomes always spends the same amount, which is what keeps an evaluation
    run repeatable.
    """

    def __init__(self, limit: int | None = None, *, capability: str = "") -> None:
        self._limit = int(settings.AI_MAX_PROVIDER_CALLS_PER_REQUEST if limit is None else limit)
        self._capability = capability
        self._spent = 0

    @property
    def limit(self) -> int:
        return self._limit

    @property
    def spent(self) -> int:
        return self._spent

    @property
    def remaining(self) -> int:
        return max(0, self._limit - self._spent)

    def mark(self) -> int:
        """A point to measure from — see `spent_since`."""
        return self._spent

    def spent_since(self, mark: int) -> int:
        """Calls made since `mark`. This is how the per-attempt count is derived
        without keeping a second counter that could drift from this one."""
        return self._spent - mark

    def spend(self, *, provider: str = "") -> None:
        """Account for one provider call, or refuse to allow it.

        Called immediately BEFORE the invocation, so an exhausted budget costs
        nothing rather than being noticed after the money is spent.
        """
        if self._spent >= self._limit:
            raise AIBudgetExhaustedError(
                f"AI call budget exhausted for this request: {self._spent} of "
                f"{self._limit} provider calls used"
                + (f" (capability={self._capability})" if self._capability else "")
                + (f", refused another call to '{provider}'" if provider else "")
                + ". Raise AI_MAX_PROVIDER_CALLS_PER_REQUEST if this is a "
                "legitimate workload; otherwise the request was failing "
                "repeatedly and stopping is the cheaper answer."
            )
        self._spent += 1
        if self._spent == self._limit:
            # Said once, at the moment it becomes true, rather than after the
            # refusal — an operator wants to know a request reached its ceiling
            # even when the last call happens to succeed.
            logger.warning(
                "AI call budget reached | capability=%s provider=%s spent=%d limit=%d",
                self._capability or "unknown", provider or "unknown",
                self._spent, self._limit,
            )
