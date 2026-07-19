# Rollback Runbook — v1.0

How to safely revert HireLens if a deployment goes wrong. HireLens has three
independently-deployable planes — **frontend** (Vercel), **backend** (Render/
Railway), and **database** (Supabase) — that can be rolled back separately.

> **Golden rule:** roll back **code** freely; roll back the **database** only with
> a restore, never by blindly reverting a migration. Migrations are
> forward-only unless they ship an explicit `down`.

## 0. Triage (first 5 minutes)

1. Check `GET /health` on the backend — `dependencies.{llm,persistence,auth}` and status.
2. Check the frontend loads and `/login` works.
3. Identify the failing plane: frontend, backend, or database.
4. If it's **security or data integrity**, roll back immediately; otherwise assess.

## 1. Frontend (Vercel)

- **Instant rollback:** Vercel → Deployments → select the last-known-good deployment → **Promote to Production**. Zero downtime; no data impact.
- Or `vercel rollback <deployment-url>`.
- Frontend is stateless — always safe to roll back.

## 2. Backend (Render / Railway)

- **Instant rollback:** Render → the service → **Rollback** to the previous deploy (or redeploy the prior Git SHA).
- The backend is **stateless** (no local DB); rolling back code is safe.
- **Config rollback:** if the incident is an env var (e.g. a bad `ALLOWED_ORIGINS` or a revoked `GROQ_API_KEY`), fix the env var and redeploy — no code rollback needed.
- **Important:** a backend rollback must remain compatible with the **current DB schema**. If you rolled the DB back too, ensure the code version matches the schema version.

## 3. Database (Supabase) — handle with care

Migrations `0001`–`0014` are forward-only. Do **not** hand-drop tables to "undo" a
migration on a database with real data.

- **Preferred:** Supabase **Point-in-Time Recovery** (Pro plan) or a pre-deploy
  **backup/snapshot** → restore to the timestamp just before the bad migration.
- **Additive migrations** (most of ours — new tables/columns/indexes: `0006`–`0011`,
  `0013`) are safe to leave in place even if you roll back code; older code simply
  ignores the new objects.
- **Behavioral migrations** need care:
  - `0012` (auth-provision trigger timing) — reverting reintroduces the signup
    500 bug; keep it.
  - `0013` (content-hash dedup + `UNIQUE(campaign_id, file_hash)`) — the backend
    degrades to filename dedup if the table is absent, so rolling back the app
    without this table is safe.
  - `0014` (drop `candidates.resume_hash`) — a **column drop**; only apply when the
    deployed code no longer writes it (v1.0 code does not). To "roll back", re-add
    the column: `alter table public.candidates add column if not exists resume_hash text;`
    (harmless; the column is unused).

### Migration compatibility matrix

| Code version | Requires | Safe without |
|--------------|----------|--------------|
| v1.0 | 0001–0013 applied | 0014 (optional cleanup) |
| pre-0013 | 0001–0012 | 0013/0014 (app self-detects & falls back) |

## 4. AI provider incident (not a deploy)

- Groq outage / quota exhaustion is **not** a rollback event — features degrade
  gracefully to deterministic output and recover automatically.
- To mitigate: rotate `GROQ_API_KEY` (env var, redeploy backend) or, once
  configured, switch the active provider at runtime via `POST /api/v1/ai/provider`
  (org-admin).

## 5. Post-rollback verification

Run the smoke checks:
1. `GET /health` → healthy, all dependencies configured.
2. Log in → create a campaign → upload one résumé → confirm analysis.
3. `GET /api/v1/ai/usage` → confirm LLM path healthy.
4. Confirm tenant isolation (a second account cannot see the first's campaign).

## Contacts / escalation

Record on-call + Supabase/Render/Vercel project owners here before launch.
