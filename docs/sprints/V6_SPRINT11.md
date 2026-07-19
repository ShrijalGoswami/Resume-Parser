# V6 Sprint 11 — Enterprise Integrations Hub & Workflow Automation

> HireLens as the AI layer above existing HR software: a provider-plugin
> integration platform + event-driven workflow automation that orchestrates the
> tools recruiters already use, while all AI reasoning, approvals, and governance
> stay inside HireLens. Decision record:
> [ADR-015](../decisions/ADR-015-integration-platform-architecture.md).

## Goal

Let organizations connect their hiring ecosystem (email, calendar, messaging,
meetings, ATS, webhooks) and automate workflows — without any feature calling an
external API directly, and without the Agent ever touching integrations.

## Integration lifecycle

```
Feature/Agent → emit_event → Dispatcher → matched Automation Rules
   → Workflow Engine (retry + backoff, idempotent) → Integration Layer → Provider → External Service
```

## Architecture (`app/integrations/`)
- `base.py` — one `IntegrationProvider` interface (category, actions, OAuth config);
  `SimulatedProvider` runs dry-run until connected (a live SDK is a `_perform` override).
- `providers.py` — adapters: Gmail, Outlook, Google/Microsoft Calendar, Slack, Teams,
  Google Meet, Zoom, Generic ATS, Generic Webhook.
- `registry.py` — provider registry (features resolve providers here, never import one).
- `oauth.py` — OAuth 2 authorize URLs + code exchange (client secrets from settings).
- `crypto.py` — Fernet encryption for credentials (refresh tokens **never** plaintext).
- `context.py` — `IntegrationContext` (org connections + in-process decrypted creds).
- `events.py` — event model (candidate uploaded/shortlisted/hired/rejected, interview
  scheduled/completed, campaign created, agent recommendation approved).
- `workflow.py` — pure workflow engine (steps through the layer, retry + exponential
  backoff, idempotency; async/queue-ready).
- `dispatcher.py` — event → matched rules → engine; webhook HMAC verification +
  idempotency guard.

## OAuth architecture

Authorize URL built per provider from `settings` client id + scopes; code exchanged
server-side for tokens; tokens **Fernet-encrypted** into `integration_connections.credentials_encrypted`.
When a client secret is not configured, exchange returns a clearly-marked simulated
credential so the platform is fully exercisable. Providers reconnect by re-running OAuth.

## Workflow engine & event model

An automation rule = trigger event + ordered steps `{action, provider, params}`. The
engine runs each step via `provider.execute(...)`, retries up to 3× with backoff
`[2,4,8]s` (honoured by async executors), records per-step outcome (ok/attempts/error),
and stops the chain on hard failure. Events are dispatchable to any number of rules.

## Retry strategy

Immediate bounded retry on the synchronous path (non-blocking), with the exponential
backoff schedule exposed for a future queue/worker. Executions persist to
`integration_executions` (status, steps, latency, attempts) → history + **replay** of
failed executions.

## AI integration (clean separation)

Agent → **Workflow Engine** → Integration Layer. The agent service is
integration-free; approving a recommendation (route) emits `agent_recommendation_approved`,
which the dispatcher routes to rules. Verified: `app/ai/agent` never imports
`app/integrations`.

## Admin Console / Integration Hub

`/integrations` (backend `/api/v1/integrations/*`): connect/disconnect/test providers,
automation rules (create/enable/disable/delete/test-fire), execution history with
replay, connection health. RBAC-gated (`INTEGRATION_MANAGE`) + audited.

## Security

Organization-scoped (membership RLS); Fernet-encrypted credentials; webhook HMAC-SHA256
signature verification + idempotency; no secrets or provider details exposed to the
frontend; management gated by RBAC + audited.

## Observability

Execution history (success/failed/partial, per-step attempts, latency), connection
health, webhook delivery idempotency — surfaced in the Integration Hub.

## Provider onboarding guide

1. Subclass `SimulatedProvider`, set `spec` (name, display, category, actions, OAuth).
2. Override `_perform(action, ctx, params)` to call the SDK using `ctx.credentials(name)`.
3. Add to `ALL_PROVIDERS` (auto-registered). No route/engine/frontend change.

## Verification

- ✅ End-to-end: automation rule (calendar → Slack → webhook) executes through the
  integration layer (status success); non-matching events → no execution; retry test
  (fail×2 → success on attempt 3, backoff `[2,4,8]`).
- ✅ Crypto roundtrip (never plaintext); webhook HMAC verify (valid/invalid);
  idempotency guard.
- ✅ Agent → workflow separation (agent never imports integrations); approval emits event.
- ✅ 89 API routes (17 integration); frontend `tsc` zero errors + `next build` green
  (adds `/integrations`); Sprint 2–10 intact.
