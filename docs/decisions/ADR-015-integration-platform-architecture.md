# ADR-015 — Integration Platform Architecture

**Status:** Accepted · **Date:** V6 Sprint 11

## Context

V6 made HireLens enterprise-ready internally. To fit into a real hiring
organization it must connect to the tools recruiters already use — email
(Gmail/Outlook), calendars, Slack/Teams, Zoom/Meet, ATSs, and generic webhooks —
and automate hand-offs between them. The goal is to **orchestrate**, not replace,
these tools, keeping all AI reasoning, approvals, and governance inside HireLens.

Hard constraints: no feature may call an external API directly; integrations must
be organization-scoped with encrypted credentials; and the Autonomous Agent must
never touch integrations directly.

## Decision

Build an **Integration Platform** — a provider-plugin layer with an event-driven
workflow engine.

- **One provider interface** (`app/integrations/base.py`): every external service
  is a plugin exposing a category, supported actions, and OAuth config. Features and
  workflows resolve providers via a **registry**; they never import an adapter.
  Providers run in dry-run mode until connected, so the whole platform is
  exercisable offline and wiring a real SDK is a single `_perform` override.
- **OAuth 2 + encrypted credentials**: an OAuth manager builds authorize URLs and
  exchanges codes; refresh tokens are **encrypted with Fernet** before persistence
  (`credentials_encrypted`) — never plaintext, never returned to the frontend.
  Organizations enable integrations independently.
- **Event-driven automation**: product actions and the Agent **emit events**
  (`candidate_shortlisted`, `agent_recommendation_approved`, …). The **dispatcher**
  matches an event to the org's enabled **automation rules**; the **workflow engine**
  runs each rule's steps through the Integration Layer with retry + exponential
  backoff and idempotency. The engine is pure (rules/context injected) and testable.
- **Clean AI separation**: Agent → emit_event → Dispatcher → Workflow → Integration
  → External Service. The agent (and every feature) only emits events; it never
  calls a provider. On approval of an agent recommendation the route emits the
  event — the agent service stays integration-free.
- **Webhooks**: HMAC-SHA256 signature verification + in-memory idempotency guard for
  at-least-once inbound delivery.
- **Persistence** (migration `0009`): `integration_connections`, `automation_rules`,
  `integration_executions` (history/retry queue), `webhook_endpoints` — all
  org-scoped (membership RLS). Execution records capture status, per-step outcome,
  attempts, and latency for observability and **replay**.
- **Admin surface**: the Integration Hub (providers, connections, automation rules,
  execution history + replay, health) — RBAC-gated (`INTEGRATION_MANAGE`) + audited.
- **Async-ready**: `emit_event` is best-effort and off the recruiter's critical
  path; the backoff schedule is exposed so a future queue/worker executes steps with
  identical semantics without changing callers.

## Consequences

- ✅ **Orchestrates the ecosystem** — one architecture for every provider; adding one
  is a subclass + registration.
- ✅ **No direct external calls** — features/agent go through the layer; verifiable.
- ✅ **Secure** — org-scoped, Fernet-encrypted credentials, HMAC-verified webhooks,
  no secrets to the frontend.
- ✅ **Reliable** — retry + backoff, idempotency, execution history + replay.
- ✅ **AI governance preserved** — reasoning/approvals stay in HireLens; integrations
  are downstream of human approval.
- ⚠️ **Providers ship in dry-run** — live API calls need OAuth app registrations +
  per-provider `_perform`; the interface and everything above it are already done.
- ⚠️ **In-process dispatch** — synchronous best-effort today; a queue is the natural
  next step (interfaces are ready).

## Alternatives considered

| Option | Why not |
|--------|---------|
| Call Gmail/Slack/Zoom SDKs from features | Couples features to vendors; no governance; the layer forbids it. |
| Let the Agent call integrations | Breaks separation; the Agent emits events only. |
| Store OAuth tokens in plaintext / frontend | Insecure; tokens are Fernet-encrypted, server-side only. |
| Third-party iPaaS (Zapier/Merge) | External data flow + cost; a native layer keeps AI + governance in-house (a generic ATS/webhook provider still allows bridging). |
| Build a queue/worker now | Out of scope; the engine is async-ready for it. |

Related: [ADR-011](./ADR-011-ai-gateway-and-provider-management.md),
[ADR-013](./ADR-013-autonomous-agent-architecture.md),
[ADR-014](./ADR-014-enterprise-platform-architecture.md),
[sprints/V6_SPRINT11.md](../sprints/V6_SPRINT11.md).
