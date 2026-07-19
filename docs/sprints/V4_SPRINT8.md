# V4 Sprint 8 — Executive Hiring Intelligence & AI Reports (V5)

> An AI-powered executive decision system: leaders open the platform and see what's
> happening in their hiring, why, and what to do — grounded in real data, composing
> the existing engines. Decision record:
> [ADR-012](../decisions/ADR-012-executive-intelligence-architecture.md).

## Goal

Let founders / hiring managers / HR understand the health of their hiring
organisation without inspecting campaigns or candidates manually — with
explanations and prioritised, evidence-backed recommendations, not just charts.

## Architecture

Deterministic metrics first (never fabricated); the LLM only narrates:

```
Analytics overview + Campaign stats + Activity feed
        │  (bounded queries, no N+1)
   ReportDataService.gather()  ─►  ReportData (real metrics)
        │
   build_report_context()  ─►  labelled data block
        │
   generate_executive_report() ─► AIOrchestrator.run(EXECUTIVE_REPORT, role=LONG_CONTEXT)
        │                                   │  LLM narrative (explain, risks, recs)
        ▼                                   ▼
   ExecutiveReport = real metrics ⊕ LLM narrative (+ Sources Used)
        │
   /reports page (expandable insight cards, PDF)   +   Copilot (interactive follow-ups)
```

### Backend — data + AI layer
- `services/report_data.py` — `gather_report_data(...)`: deterministic aggregates
  from `AnalyticsRepository.overview()` + `CampaignRepository.stats_for_recruiter()`
  + `ActivityRepository.recent()` (metrics, per-campaign snapshots with
  days-since-activity, productivity counts, talent snapshot). No N+1.
- `ai/context/report_context.py` — pure builder → labelled data block.
- `ai/prompts/report.py` — versioned Executive Report Prompt `v1.0` + per-focus task
  instructions. Registered for `Capability.EXECUTIVE_REPORT`.
- `ai/services/report_service.py` — thin seam: orchestrator → merge metrics ⊕
  narrative → `ExecutiveReport`; graceful metrics-only fallback.

### Backend — product layer
- `services/report_service.py` — `run_executive_report(...)`: composes data +
  context, calls the engine, deterministic fallback. **Takes repositories → reusable
  by a future scheduler.**
- `services/copilot_report.py` — Copilot bridge reusing the report engine for
  executive-scope questions.
- `routes/reports.py` — `POST /reports/executive` (auth, recruiter-scoped).

### Frontend
- `app/reports/page.tsx` — Executive Intelligence workspace: pipeline-health badge +
  KPI tiles, expandable insight cards (Campaign Intelligence, Recruiter Productivity,
  Skill Gap, Hiring Risks, AI Recommendations, Talent Snapshot with skill bars).
- `lib/report-pdf.ts` — recruiter-ready **PDF export**.
- Nav link **Reports**; Copilot available on `/reports`; `services/report-api.ts`,
  `types/report.ts`.

## Report sections

| Section | Deterministic | AI narrative |
|---------|---------------|--------------|
| Executive Summary | KPI metrics | headline, pipeline health, what changed, blockers, attention |
| Campaign Intelligence | per-campaign snapshot table | trend explanation + concerns |
| Recruiter Productivity | activity-derived counts | recommendations |
| Skill Gap Intelligence | top tech / missing skills | emerging / oversaturated / hard-to-fill |
| Hiring Risks | — | category + evidence + impact + action |
| AI Recommendations | — | prioritised, evidence-backed |
| Talent Snapshot | distributions, funnel, top skills | — |

## Data composition

All numbers come from existing recruiter-scoped repositories in a bounded set of
queries. Productivity is derived from the activity feed (interview packs, comparisons,
copilot messages, stage changes, notes, uploads). The talent snapshot reuses the
analytics `ai_insights` + `charts`.

## AI reasoning strategy

The prompt casts the model as a hiring-org analyst that MUST cite only provided
numbers (never fabricate), explain trends and causes, and produce evidence-backed
risks and prioritised recommendations. The server merges these with the real metrics.

## Export strategy

Client-side, dependency-free print document (inline styles, break-inside protection)
— clean for printing or sharing with leadership.

## Performance considerations

Bounded aggregate queries (no N+1); reuses analytics + engines instead of recomputing;
runs off the event loop; interactive follow-ups regenerate only the requested section.

## Future scheduling support

`run_executive_report(...)` is a reusable unit that a cron/queue can invoke with
recruiter-scoped repos to produce scheduled executive briefings — no code change.

## Verification

- ✅ Reports use the AIOrchestrator (`EXECUTIVE_REPORT`, `LONG_CONTEXT` role) via the
  gateway; reuse analytics + engines; Copilot reuses the report engine.
- ✅ End-to-end test: metrics server-computed and preserved (LLM path + fallback);
  productivity correctly derived; days-since-activity computed; no fabricated stats.
- ✅ 48 API routes; frontend `tsc` zero errors; `next build` green (adds `/reports`);
  PDF export works; Sprint 2–7.5 intact.
