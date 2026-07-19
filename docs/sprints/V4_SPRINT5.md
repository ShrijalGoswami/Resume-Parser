# V4 Sprint 5 — AI Candidate Comparison Intelligence (V5)

> The first flagship AI capability on top of the Copilot: an **AI Hiring Analyst**
> that compares 2–5 candidates from one campaign into an executive hiring report,
> grounded in stored data and reused by the Recruiter Copilot. Decision record:
> [ADR-008](../decisions/ADR-008-ai-candidate-comparison.md).

## Goal

Help recruiters answer **"Which candidate should I hire, and why?"** — transparently,
explainably, grounded in stored platform data, and integrated with the Copilot.

## Architecture

One engine, two callers — no duplicated logic:

```
Campaign page → select 2–5 → "Compare with AI"
  ↓  POST /api/v1/campaigns/{id}/compare  (auth: Bearer)
                                          ┌─────────────────────────────┐
Recruiter Copilot ("Compare Rahul & John")│                             │
  ↓  services/copilot_comparison ─────────┤  services/comparison_service │
                                          │      run_comparison(...)     │
                                          └──────────────┬──────────────┘
   RLS-scoped repos → ComparisonContextBuilder → generate_comparison
   → AIOrchestrator.run(CANDIDATE_COMPARISON, schema=ComparisonLLMOutput)
   → CandidateComparisonReport (+ server-attached Sources Used)
```

### Backend — AI layer (`app/ai/`)
- `prompts/comparison.py` — versioned Comparison Prompt `v1.0` (hiring-analyst
  persona, anti-fabrication rules, JSON contract). Registered for
  `Capability.CANDIDATE_COMPARISON`.
- `context/comparison_context.py` — pure `build_comparison_context(campaign, entries)`
  → (context, roster); condenses per-candidate resume/analysis/ATS/match/notes.
- `services/comparison_service.py` — thin `generate_comparison` seam
  (orchestrator → `CandidateComparisonReport`), 4096-token budget, graceful fallback.

### Backend — product layer
- `services/comparison_service.py` — `run_comparison(campaign_id, candidate_ids, …)`:
  fetches campaign + roster (2 queries) + notes (bounded ≤5), **validates every
  candidate belongs to the campaign**, builds context, calls the engine, returns a
  deterministic score-based report if the LLM is down.
- `services/copilot_comparison.py` — bridge letting the Copilot reuse the engine:
  intent detection, name→roster resolution (else top-N by score), renders the report
  into a `CopilotStructuredResponse` (full report kept in message metadata).
- `routes/campaigns.py` — `POST /{id}/compare`.
- `schemas/comparison.py` — `ComparisonRequest`, `ComparisonLLMOutput`,
  `CandidateComparisonReport` + section models.

### Frontend (`resume-hero-section/`)
- `components/workspace/candidate-table.tsx` — the existing multi-select "Compare"
  action now launches the workspace (enforces 2–5).
- `app/campaigns/[id]/compare/page.tsx` — comparison workspace rendering every
  section: executive summary (with confidence meters), ranking table, skill matrix,
  strengths, risks, hiring recommendation, interview focus, trade-offs, sources.
- `services/comparison-api.ts`, `types/comparison.ts`.

## Structured report

| Section | Contents |
|---------|----------|
| Executive Summary | overall recommendation, hiring & comparison confidence, best + runner-up |
| Candidate Rankings | rank, overall, AI match, ATS, experience/strength/weakness summaries |
| Skill Matrix | required / preferred / missing / unique / transferable per candidate |
| Strength Analysis | technical / domain / communication / leadership indicators |
| Risk Analysis | categorised, grounded risks (never invented) |
| Hiring Recommendation | Strong Hire / Hire / Maybe / Reject + rationale |
| Interview Focus | technical & behavioral topics, areas to verify, questions |
| Trade-off Analysis | role-priority scenarios where a lower-ranked candidate wins |

## Ranking methodology

The model ranks using the JD's priorities and the stored signals — overall score,
ATS breakdown, AI match (semantic similarity), skills match, experience, projects,
and recruiter notes — and must explain what drove each ranking. The deterministic
fallback ranks purely by stored `overall_score`.

## Context composition

`ComparisonContextBuilder` composes campaign metadata + JD (truncated) once, then a
condensed block per candidate (scores, roles, skills, matching/missing skills,
strengths/weaknesses, projects, education, notes), plus a roster of real ids/names
the model must use verbatim. Detail is capped to keep 5-candidate prompts within
provider limits.

## Copilot integration

"Compare Rahul and Shrijal", "Who is the safer hire?", "Why is Rahul ranked first?"
in a campaign context invoke the same engine. Names are matched against the roster;
vague requests ("compare the top two") fall back to top-N by score. Follow-ups stay
grounded via conversation history.

## Security

Auth + RLS + explicit `recruiter_id` scoping. Every requested candidate must be in
the authenticated recruiter's campaign roster — cross-campaign and cross-tenant
comparisons return 404. The model only sees the recruiter's own data.

## Known limitations

- Bounded to **2–5 candidates** per comparison.
- Notes are fetched per candidate (bounded); a batched query is a future optimisation.
- No persistence of comparison reports yet (generated on demand; the Copilot keeps a
  copy in message metadata).
- Name resolution in the Copilot is heuristic (explicit names or top-N).

## Future improvements

Persisted comparison reports, batched notes, comparison history, and using the report
as the substrate for Executive Reports, Hiring Workflows, and Autonomous Recruiting.

## Verification

- ✅ Backend imports clean; `POST /campaigns/{id}/compare` registered (40 API routes);
  context builder + deterministic fallback + copilot bridge exercised.
- ✅ Comparison runs through the AIOrchestrator; no provider calls outside `app/ai`.
- ✅ Copilot reuses the engine (shared `run_comparison`).
- ✅ Frontend `tsc` zero errors; `next build` green (adds `/campaigns/[id]/compare`).
- ✅ Sprint 2–4 functionality intact.
