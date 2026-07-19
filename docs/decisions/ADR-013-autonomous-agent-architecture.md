# ADR-013 — Autonomous Recruiting Agent Architecture

**Status:** Accepted · **Date:** V4 Sprint 9

## Context

The platform has strong reactive intelligence — the Copilot, Comparison, Semantic
Search, Interview Intelligence, and Executive Reports all answer when asked. The
next step is a *proactive* AI teammate: an agent that continuously observes the
pipeline, detects situations that need attention, reasons using the existing
engines, and produces recommendations — the first step toward an AI employee.

Two hard constraints: the agent must **coordinate existing engines, never
reimplement them**, and it must **never modify production data** — every
recommendation requires human approval; automatic execution is deferred.

## Decision

Build an **Agent Framework** that is an orchestration layer over the existing
capabilities.

- **Tool Registry** (`ai/agent/tools.py`) — the agent never reaches into business
  logic; it acts through tools, each a thin wrapper over an existing service
  (`search_candidates`→talent search, `compare_candidates`→comparison,
  `generate_interview_pack`→interview, `generate_executive_report`→report) or a
  repository read. A shared, cached `ToolContext` carries recruiter-scoped repos so
  expensive reads happen once (no N+1).
- **Workflows** (`ai/agent/workflows.py`) — each is a deterministic TRIGGER over
  stored data → an explainable `Recommendation` that references the engine tool
  able to act on it. Five built-ins ship: stalled campaign, high-potential
  candidate, weak pool, interview backlog, hiring-deadline risk. Thresholds are
  configurable constants. Adding a workflow is one `detect(ctx)` + registration.
- **Engine** (`ai/agent/engine.py`) — runs the workflows and adds ONE portfolio-
  level reasoning pass through the AIOrchestrator (`AGENT_REASONING`) to prioritise
  the findings into a briefing. It owns no business logic.
- **Explainability** — every recommendation carries why, evidence, confidence,
  data sources, tools used, and the recommended next action. Nothing is unexplained.
- **Approval lifecycle** — recommendations persist (`agent_recommendations`,
  migration `0007`) with `pending → approved / rejected / dismissed` (and a future
  `executed`). Scans are **idempotent** (dedupe by workflow+entity). The agent only
  writes its own recommendations — it never mutates candidates/campaigns.
- **Reuse everywhere** — the Copilot invokes the SAME agent for "what needs my
  attention?" (`services/copilot_agent.py`).
- **Scheduler-ready** — `run_agent_scan(...)` takes repositories, so a future cron /
  queue / serverless / worker can invoke it with recruiter-scoped repos unchanged.
  No infrastructure scheduler is built this sprint.
- **Security** — recruiter-scoped (RLS + repos); reports only over authorised data;
  no prompts, reasoning traces, or provider details are exposed.

## Consequences

- ✅ **Proactive** — surfaces opportunities and risks without being asked.
- ✅ **Orchestrates, never duplicates** — tools wrap existing engines; the agent is
  thin. The Copilot reuses it.
- ✅ **Explainable & safe** — evidence-backed, confidence-scored, human-approved;
  zero automatic data changes.
- ✅ **Idempotent & efficient** — dedupe keys, cached context, bounded scans.
- ✅ **Extensible** — new workflows/tools/agents register without architectural
  change; the foundation for autonomous execution and multi-agent collaboration.
- ⚠️ **Execution is deferred** — recommendations stop at approval; acting on them
  automatically is a future sprint.
- ⚠️ **Scans read per-campaign rosters** — bounded and cached per scan; a periodic
  operation, not a hot path.

## Alternatives considered

| Option | Why not |
|--------|---------|
| A fully autonomous agent that acts | Unsafe without approval; this sprint stops at recommendation. |
| Re-implement analysis inside the agent | Violates "coordinate, don't duplicate"; the agent uses tools over existing engines. |
| An LLM "agent loop" that free-form calls tools | Non-deterministic, costly, hard to ground; deterministic workflows + one reasoning pass are reliable and explainable. |
| Ephemeral (non-persisted) recommendations | Approval state must persist; hence `agent_recommendations` + idempotent scans. |

Related: [ADR-006](./ADR-006-ai-orchestration-layer.md),
[ADR-008](./ADR-008-ai-candidate-comparison.md),
[ADR-010](./ADR-010-interview-intelligence-engine.md),
[ADR-012](./ADR-012-executive-intelligence-architecture.md),
[sprints/V4_SPRINT9.md](../sprints/V4_SPRINT9.md).
