"""
Scoring — the seam, and deliberately nothing else.

**No scorer ships in this module, and that is the design.**

The harness records facts. Whether a provider is *good enough* is a different
question with a different answer per capability, per month and per person
asking — cheapest-that-clears-the-bar for batch analysis, best-available for a
comparison a human will defend in a hiring decision. A scorer baked into the
harness would freeze one of those answers into the infrastructure and quietly
become the definition of quality for everything built afterwards.

So scoring is a Protocol over stored records. It runs AFTER a run, reads the
JSONL, and can be rewritten, replaced or run three different ways over the same
data without re-executing a single model call — which matters, because model
calls are the expensive part and re-running them to change your mind about
scoring would make people avoid changing their mind.

Phase 0 task 3 (Golden Dataset) is the first legitimate consumer: it will bring
expected-shape assertions per case, which is a scorer.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Iterable, Protocol, runtime_checkable

from app.ai.evaluation.records import EvalRecord


@dataclass(frozen=True)
class ScoreResult:
    """One scorer's verdict on one record.

    `value` is deliberately untyped-by-convention (a float, a bool cast to
    0.0/1.0, a ratio) because scorers differ. `scorer_id` and `scorer_version`
    are mandatory so a score is never comparable across scorer versions by
    accident — the same trap `prompt_version` closes for records.
    """

    record_run_id: str
    record_case_id: str
    scorer_id: str
    scorer_version: str
    value: float
    detail: dict[str, Any] = field(default_factory=dict)


@runtime_checkable
class Scorer(Protocol):
    """Turns a record into a verdict. Implementations live outside this module."""

    id: str
    version: str

    def score(self, record: EvalRecord) -> ScoreResult: ...


def apply(scorer: Scorer, records: Iterable[EvalRecord]) -> list[ScoreResult]:
    """Run a scorer over records. A convenience, not a policy.

    Note what this does NOT do: it does not aggregate, rank, average, or pick a
    winner. Anything that compares two providers is a decision, and decisions
    belong to whoever is making one — not to the layer that measured.
    """
    return [scorer.score(record) for record in records]
