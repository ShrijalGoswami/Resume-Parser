# V4 Sprint 9 — Autonomous Recruiting Workflows & AI Agent (V5)

> The first step toward an AI employee: an agent that proactively watches the
> pipeline, detects situations, coordinates the existing engines, and produces
> explainable recommendations for human approval. Decision record:
> [ADR-013](../decisions/ADR-013-autonomous-agent-architecture.md).

## Goal

Proactively identify recruiting opportunities and risks without waiting for
prompts — coordinating the platform's existing intelligence engines into
explainable, evidence-backed recommendations that require human approval.

## Architecture

The agent is an ORCHESTRATOR — it owns no business logic:

```
Trigger (deterministic, per workflow)
   ↓  via Tool Registry (wraps existing services — no duplication)
Context Collection (cached ToolContext — no N+1)
   ↓
Recommendation (explainable: why · evidence · confidence · tools · sources · action)
   ↓
AI Reasoning (one AGENT_REASONING pass → prioritised briefing)
   ↓
Approval (pending → approved / rejected / dismissed;  executed = future)
```

### Agent framework (`app/ai/agent/`)
- `tools.py` — **Tool Registry**: `ToolContext` (recruiter-scoped repos + per-scan
  cache) + tools wrapping existing services: `search_candidates`, `compare_candidates`,
  `generate_interview_pack`, `generate_executive_report`, plus retrieval tools
  (analytics, campaigns, campaign/candidate context, notes).
- `workflows.py` — 5 built-in workflows (deterministic triggers → explainable
  recommendations referencing the right engine tool), configurable thresholds.
- `engine.py` — `AgentEngine.scan()` + `briefing()` (one `AGENT_REASONING` pass via
  the orchestrator; deterministic fallback).
- `ai/prompts/agent.py` — versioned agent-reasoning prompt.

### Persistence & services
- Migration `0007` — `agent_recommendations` (RLS, `dedupe_key` for idempotent scans).
- `AgentRepository` — create-many, list, get, update-status, open-dedupe-keys.
- `services/agent_service.py` — `run_agent_scan(...)` (idempotent persistence +
  briefing; **schedulable — takes repos**), list, approval lifecycle.
- `services/copilot_agent.py` — Copilot bridge reusing the agent.
- `routes/agent.py` — `POST /agent/scan`, `GET /agent/recommendations`,
  `PATCH /agent/recommendations/{id}`, `GET /agent/workflows`.

### Frontend
- `app/agent/page.tsx` — Agent Workspace: AI briefing card + grouped sections
  (Urgent Alerts, Candidate Alerts, Campaign Risks, Recommended Actions, Completed);
  approve / reject / dismiss; expandable evidence · sources · engine.
- Nav link **Agent**; Copilot available on `/agent`; `services/agent-api.ts`,
  `types/agent.ts`.

## Built-in workflows

| Workflow | Trigger | Engine tool referenced |
|----------|---------|------------------------|
| Stalled Campaign | active + inactive ≥ 14 days | executive report |
| High-Potential Candidate | overall ≥ 85 & ATS ≥ 80, still early | interview pack |
| Weak Candidate Pool | avg match < 55 with ≥ 3 candidates | semantic search |
| Interview Backlog | ≥ 8 candidates in screening/shortlisted | comparison |
| Hiring Deadline Risk | metadata deadline ≤ 14 days, 0 hires | executive report |

## Tool Registry

Every tool wraps an existing service or a repository read; the agent never
reimplements search/comparison/interview/report logic. A shared cached `ToolContext`
means each expensive read (analytics, rosters) happens once per scan.

## Trigger system

Deterministic detectors over stored data (grounded, no fabrication); thresholds are
configurable constants. Scans are idempotent via `dedupe_key` (workflow+entity) — an
open recommendation is never duplicated.

## Approval lifecycle

`pending → approved / rejected / dismissed` (persisted). `executed` is reserved for
future automatic execution. **No workflow modifies production candidate/campaign
data** — human approval is required.

## Explainability model

Every recommendation carries: **why** it fired, **evidence** (grounded facts),
**confidence** (0–100), **tools used**, **data sources**, and the **recommended next
action** (plus the engine tool + params that could act on it). Nothing is unexplained.

## Future automation strategy

`run_agent_scan(...)` is a reusable unit a scheduler (cron / queue / serverless /
worker) can invoke with recruiter-scoped repos — enabling scheduled briefings.
`executed` + the tool params on each recommendation pave the way for approved-action
execution and multi-agent collaboration.

## Verification

- ✅ End-to-end scan test: all 5 workflows fire with correct severity/confidence;
  each references the right engine tool; scans are idempotent (re-scan generated 0);
  every recommendation has evidence + confidence.
- ✅ Agent reuses existing engines via tools (no duplicated logic); Copilot reuses
  the agent; approval lifecycle works.
- ✅ 52 API routes; frontend `tsc` zero errors; `next build` green (adds `/agent`);
  Sprint 2–8 intact.
