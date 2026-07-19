# ADR-012 — Executive Intelligence Architecture

**Status:** Accepted · **Date:** V4 Sprint 8

## Context

The platform answers candidate-level questions well (Copilot, Comparison, Search,
Interview Intelligence). Leadership — founders, hiring managers, HR — needs the
opposite: strategic answers about the hiring *organisation* (pipeline health,
campaign performance, recruiter productivity, skill shortages, risks, and what to
do next) without manually inspecting dozens of candidates. This must be an
AI-powered decision system, not another dense dashboard, and every statistic must
be grounded in real stored data — never fabricated.

## Decision

Add an `EXECUTIVE_REPORT` capability that **composes existing engines and analytics**
into a grounded executive briefing.

- **Deterministic first, narrative second.** `services/report_data.py` gathers the
  real numbers from the EXISTING repositories in a bounded set of queries
  (`AnalyticsRepository.overview()` + `CampaignRepository.stats_for_recruiter()` +
  `ActivityRepository.recent()`) — no per-campaign loops, no N+1. These metrics are
  the ground truth. The LLM only **explains** them.
- **Metrics ⊕ narrative merge.** The model fills `ExecutiveReportLLMOutput`
  (executive summary, campaign insights, productivity recommendations, skill-gap
  analysis, hiring risks, prioritised recommendations). The server attaches the
  real `metrics`, `campaigns`, `productivity`, and `talent_snapshot`, so the model
  cannot invent statistics — the prompt is explicit: cite only provided numbers.
- **Reuse, no duplication.** The report composes the analytics/semantic aggregates
  (top technologies, common missing skills, distributions, funnel) and the activity
  feed; drill-downs link to the Comparison and Interview engines. The Copilot reuses
  the SAME report engine (`services/copilot_report.py`) for interactive follow-ups
  ("why is Campaign X underperforming?", "what changed?", "biggest risks?").
- **Interactive & focused.** `focus`/`instruction`/`sections` regenerate only the
  requested part (executive summary, campaign intelligence, risks, …) instead of
  the whole report.
- **Schedulable by design.** `run_executive_report(...)` takes repositories, so a
  future cron/queue can build recruiter-scoped repos and invoke it unchanged — no
  background scheduler is implemented in this sprint.
- **Security.** Recruiter-scoped (RLS + repos): a leader sees only their own data.
  Reports flow through the gateway; keys/provider details are never exposed.
- **Export.** Recruiter-ready PDF is produced client-side (print document).

## Consequences

- ✅ **Decision system, not a dashboard** — explains what/why/what-next with
  prioritised, evidence-backed recommendations.
- ✅ **Grounded** — statistics are server-computed; the LLM narrates only. Graceful
  metrics-only fallback when the LLM is unavailable.
- ✅ **Composes, not duplicates** — reuses analytics + engines; the Copilot reuses
  the report engine.
- ✅ **Cheap** — bounded aggregate queries, no N+1; runs off the event loop.
- ✅ **Scheduler-ready** — the service is a reusable unit for future briefings.
- ⚠️ **Aggregates are "recent"** — productivity is derived from the recent activity
  feed (bounded window), not an all-time ledger. A durable metrics store is future.
- ⚠️ **Per-campaign deep insight** links to the Comparison/Interview engines rather
  than running them for every campaign (cost).

## Alternatives considered

| Option | Why not |
|--------|---------|
| Another chart dashboard | The goal is explanation + recommended action, not more charts. |
| Let the LLM compute the statistics | Invites fabrication; numbers are server-computed, the LLM only narrates. |
| Duplicate analytics inside the report | Wasteful; the report composes the existing analytics + engines. |
| Build the scheduler now | Out of scope; the service is designed to be invoked by one later. |

Related: [ADR-006](./ADR-006-ai-orchestration-layer.md),
[ADR-008](./ADR-008-ai-candidate-comparison.md),
[ADR-010](./ADR-010-interview-intelligence-engine.md),
[ADR-011](./ADR-011-ai-gateway-and-provider-management.md),
[sprints/V4_SPRINT8.md](../sprints/V4_SPRINT8.md).
