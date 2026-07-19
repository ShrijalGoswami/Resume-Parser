# ADR-010 — Interview Intelligence Engine

**Status:** Accepted · **Date:** V4 Sprint 7

## Context

The platform can parse, score, match, compare, and semantically discover
candidates. The last mile of a hiring loop — actually *interviewing* and
*deciding* — was unsupported. We want more than a question generator: a complete
AI hiring workbench that, for any candidate, produces why they're strong, why they
may fail, what to verify, how to probe, an interviewer scorecard, and a hiring
recommendation — all grounded in stored platform data, and reusable by the
Copilot, Comparison, and future Hiring Reports.

## Decision

Add an `INTERVIEW_GENERATION` capability built on the orchestration layer, exposed
through a single reusable engine.

- **One engine, many callers.** `services/interview_service.run_interview(...)` is
  the only place interview logic lives. The candidate-detail tab (route), the
  Copilot (`services/copilot_interview`), and comparison follow-ups all call it —
  no duplicated prompt logic.
- **Grounded context.** An `InterviewContextBuilder` composes the reusable
  multi-source candidate context (resume, resume analysis, ATS, match, ranking,
  recruiter notes, JD — the same builder the Copilot uses) with campaign
  requirements and optional comparison/semantic findings. Routes never
  concatenate context.
- **Versioned prompt + focuses.** Interview Prompt `v1.0` casts the model as an
  interview intelligence system with anti-fabrication rules and a JSON contract
  mirroring `InterviewLLMOutput`. Versioned per-focus task instructions
  (blueprint, technical, behavioral, leadership, manager, culture_fit, scorecard,
  followup) power interactive mode without duplicating the base prompt.
- **Structured pack.** `InterviewPack` has predictable sections: executive
  summary, interview strategy/stages, technical questions (reason, expected
  answer, red flags, follow-ups, evaluation criteria, difficulty), behavioral
  questions, skill verification, risk assessment, interviewer scorecard, and final
  recommendation. Sources are server-authoritative.
- **Interactive mode.** `focus`/`instruction`/`sections` let follow-ups
  ("generate harder questions", "only behavioral", "focus on system design")
  regenerate only the requested sections; the UI merges them into the existing
  pack, avoiding needless regeneration.
- **Security.** The engine fetches the candidate through RLS-scoped repositories
  and generates only for candidates the recruiter owns.
- **Graceful degradation.** When the LLM is unavailable, a deterministic pack
  (summary, missing-skill risks + verifications, a full seven-category scorecard,
  and a recommendation derived from stored scores) is returned, clearly flagged.
- **Export.** A recruiter-ready PDF is produced client-side (print document) — no
  new dependency, clean formatting for printing or internal sharing.

## Consequences

- ✅ **Decision-grade interviewing** — a full workbench, not a list of questions.
- ✅ **No provider bypass / no duplication** — one engine through the orchestrator,
  reused by the tab, Copilot, and comparison; observability captured for free.
- ✅ **Grounded & trustworthy** — every question/risk ties to stored data; sources
  attributed server-side.
- ✅ **Interactive & efficient** — focused follow-ups regenerate only what's asked.
- ✅ **Secure** — recruiter-scoped generation.
- ✅ **Extensible** — the pack is the substrate for future Executive Reports,
  Hiring Decisions, and Autonomous Recruiting.
- ⚠️ **Requires a stored analysis** — a candidate must be analysed before a pack
  can be generated (409 otherwise).
- ⚠️ **PDF via browser print** — recruiter-ready, but not a server-rendered PDF
  (a future enhancement if pixel-perfect templates are needed).

## Alternatives considered

| Option | Why not |
|--------|---------|
| A plain question generator | The vision is an evaluation/decision workbench, not questions. |
| Separate copilot interview logic | Would duplicate prompt logic; the Copilot calls the same engine. |
| Server-side PDF (headless browser / library) | Heavier dependency; client print ships a clean recruiter-ready doc now. |
| Always regenerate the whole pack on follow-up | Wasteful; focus/sections regenerate only what changed. |

Related: [ADR-006](./ADR-006-ai-orchestration-layer.md),
[ADR-007](./ADR-007-ai-recruiter-copilot.md),
[ADR-008](./ADR-008-ai-candidate-comparison.md),
[ADR-009](./ADR-009-semantic-search-architecture.md),
[sprints/V4_SPRINT7.md](../sprints/V4_SPRINT7.md).
