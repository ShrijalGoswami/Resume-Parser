# ADR-004 — Store AI output instead of recomputing

**Status:** Accepted · **Date:** V4 Sprint 1

## Context

The batch pipeline produces a rich `CandidateResult` per resume (scores, skills,
strengths, recommendation, interview questions). Once persistent campaigns
existed, we had to decide whether to **store** these results or **recompute**
them whenever a recruiter views a candidate. Recomputation means re-parsing,
re-scoring, and re-calling the LLM.

## Decision

**Store the AI output verbatim.** `candidate_analyses.result` (jsonb) holds the
exact `CandidateResult` JSON the pipeline produced; scalar columns
(`overall_score`, `ats_score`, …) are denormalized projections for cheap
ranking/filtering. Records are **versioned** (append on re-run). The
`persist_batch` service writes results; it never re-invokes AI logic.

## Consequences

- ✅ **Cost:** repeat views are free — no LLM tokens spent re-reading a candidate.
- ✅ **Latency:** dashboard reads are instant vs. seconds to recompute.
- ✅ **Consistency:** a recruiter always sees the exact analysis they decided on;
  no LLM drift between views.
- ✅ **Auditability:** versioned history preserves the output behind each decision.
- ✅ **Decoupling:** the AI pipeline stays untouched; persistence is a thin adapter.
- ⚠️ Stored results can become stale if scoring logic changes; mitigated by
  versioning + the ability to re-run and append a new analysis.
- ⚠️ jsonb duplication of some fields; accepted for read performance and fidelity.

## Alternatives considered

| Option | Why not |
|--------|---------|
| Recompute on every read | Multiplies LLM cost by traffic; slow; non-deterministic drift. |
| Store only scalar scores | Loses the rich narrative (strengths, questions, evidence) recruiters rely on. |
| Cache with TTL | Adds complexity; a hiring decision's analysis should be permanent, not expiring. |

See [AI_PIPELINE.md](../AI_PIPELINE.md#why-ai-results-are-stored-not-recomputed),
[DATABASE.md](../DATABASE.md).
