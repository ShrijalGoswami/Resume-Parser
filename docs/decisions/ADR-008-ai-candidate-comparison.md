# ADR-008 — AI Candidate Comparison

**Status:** Accepted · **Date:** V4 Sprint 5

## Context

Sprints 3–4 delivered the [AI Foundation Layer](../AI_ARCHITECTURE.md) (ADR-006)
and the [Recruiter Copilot](./ADR-007-ai-recruiter-copilot.md). Recruiters can now
ask grounded questions, but the single most important hiring decision — **"which
of these candidates should I hire, and why?"** — still meant eyeballing a ranked
table. We want an **AI Hiring Analyst** that synthesises the stored data for a
short list into an executive comparison, and one comparison engine that both the
campaign UI and the Copilot reuse.

## Decision

Add a `CANDIDATE_COMPARISON` capability built entirely on the orchestration layer,
and a single shared engine consumed by two entry points.

- **One engine, two callers.** `services/comparison_service.run_comparison(...)`
  is the only place comparison logic lives. The campaign route
  (`POST /campaigns/{id}/compare`) and the Copilot (`services/copilot_comparison`)
  both call it — no duplicated logic.
- **Grounded context.** A reusable `ComparisonContextBuilder`
  (`ai/context/comparison_context.py`) composes each candidate's resume, analysis,
  ATS, match scores, and recruiter notes with the job description and campaign
  metadata into one labelled block plus a candidate roster the model must use
  verbatim (real ids/names). Per-candidate detail is condensed so 5-candidate
  prompts stay within provider limits.
- **Versioned prompt.** Comparison Prompt `v1.0` (`ai/prompts/comparison.py`) casts
  the model as a hiring analyst, forbids fabricated candidates/risks/comparisons,
  and pins a JSON contract mirroring `ComparisonLLMOutput`.
- **Structured report.** `CandidateComparisonReport` has predictable sections:
  executive summary, rankings, skill matrix, strength analysis, risk analysis,
  hiring recommendation, interview focus, and trade-off analysis. The model fills
  the analytical sections; the server attaches the compared roster and the
  authoritative `sources_used`.
- **Security.** The engine fetches the campaign and its roster through the
  RLS-scoped repositories and rejects any candidate not in that campaign — so
  cross-campaign and cross-tenant comparisons are impossible.
- **Graceful degradation.** If the LLM is unavailable, a deterministic,
  score-based report (ranked by stored `overall_score`) is returned instead of an
  error — still grounded, clearly flagged `degraded`.
- **Copilot reuse.** The Copilot detects comparison intent, resolves which roster
  candidates the recruiter means (explicit names, else top-N by score), runs the
  same engine, and folds the report into its structured answer; the full report is
  stashed in the message metadata.

## Consequences

- ✅ **Decision-grade output** — a transparent, explainable hiring recommendation,
  not a raw table.
- ✅ **No provider bypass / no duplication** — one engine, through the orchestrator,
  reused by UI and Copilot; observability captured for free.
- ✅ **Trustworthy** — grounded in stored data; sources are server-authoritative;
  risks/comparisons are never fabricated.
- ✅ **Secure** — same-campaign, recruiter-scoped enforcement.
- ✅ **Extensible** — the report is the substrate for future Executive Reports,
  Hiring Workflows, and Autonomous Recruiting.
- ⚠️ **Bounded to 2–5 candidates** to keep prompts within provider limits and the
  analysis focused.
- ⚠️ **Notes fetch is per-candidate** (bounded ≤5) — acceptable; a batched notes
  query is a future optimisation.

## Alternatives considered

| Option | Why not |
|--------|---------|
| Deterministic side-by-side table only | The vision is an analyst that explains trade-offs and recommends a hire, not a table. |
| Separate copilot comparison logic | Would duplicate ranking/grounding; instead the Copilot calls the same engine. |
| Let the model choose candidates freely | Untrustworthy; the server resolves the roster and enforces campaign scoping. |
| Unbounded candidate count | Blows past provider token limits and dilutes the analysis. |

Related: [ADR-006](./ADR-006-ai-orchestration-layer.md),
[ADR-007](./ADR-007-ai-recruiter-copilot.md),
[sprints/V4_SPRINT5.md](../sprints/V4_SPRINT5.md).
