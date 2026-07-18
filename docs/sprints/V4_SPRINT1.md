# V4 — Sprint 1: Supabase Foundation

> Sprint record. Converts HireLens from a stateless AI app into a persistent SaaS
> platform **without modifying the AI pipeline**. Supersedes the earlier
> `docs/V4_SPRINT1_SUPABASE_FOUNDATION.md`. Cross-refs: [ARCHITECTURE.md](../ARCHITECTURE.md),
> [DATABASE.md](../DATABASE.md), [API.md](../API.md), [SECURITY.md](../SECURITY.md).

- **Status:** ✅ Feature-complete
- **Version line:** `v4.0.0` (unreleased; backend `APP_VERSION` still `1.2.0`)
- **Theme:** Persistence foundation (auth, campaigns, storage, RLS)

---

## Objectives

1. Introduce recruiter **authentication** (email + password, OAuth-ready).
2. Add a **persistent** data model — recruiters own campaigns, candidates,
   analyses, notes, conversations, activity.
3. Persist **AI outputs** by reference (store, never recompute).
4. Add **private storage** with signed-URL access.
5. Enforce **Row Level Security** everywhere.
6. Do all of the above **additively** — existing AI endpoints and pipeline
   untouched; app still runs stateless with no config.

---

## Completed work

- 4 SQL migrations (schema, RLS, storage, auth triggers).
- Backend: config, Supabase clients, JWT auth dependency, repository layer,
  persistence + storage services, campaign + account routers, health status.
- Frontend: Supabase clients, route-guard middleware, auth provider, authed API
  layer, and the Login → Dashboard → Campaigns → Campaign-detail flow.
- Verification suite (see [Testing](#testing)).

---

## Architecture changes

- Introduced the codebase's **first `Depends()`** and the first authenticated,
  stateful request path (previously every request was stateless).
- New layering: routes → **repositories** → user-scoped Supabase client → RLS.
- Two request families now coexist: stateless AI (unchanged) and authed
  persistence. See [ARCHITECTURE.md](../ARCHITECTURE.md#request-lifecycle-persistence-endpoint).

## Database changes

`supabase/migrations/`:
- `0001_initial_schema.sql` — 9 tables, enums, indexes, `updated_at` triggers,
  `candidate_latest_analysis` view.
- `0002_rls_policies.sql` — RLS + owner policies on every table.
- `0003_storage_buckets.sql` — 4 private buckets + object RLS.
- `0004_auth_triggers.sql` — auto-provision `recruiters` on sign-up; email sync.

Full detail in [DATABASE.md](../DATABASE.md).

## API changes

All **additive** under `/api/v1` (no existing endpoint changed): `/me`,
`/activity`, `/campaigns` (+ nested candidates, notes, stage, resume
upload/signed-URL, `persist-batch`, activity). `/health` now reports
`persistence` + `auth` status. Full list in [API.md](../API.md).

## Frontend changes

- `lib/supabase/{client,server}.ts`, `middleware.ts`,
  `components/auth/auth-provider.tsx`, `services/campaigns-api.ts`,
  `types/campaign.ts`.
- Pages: `app/login`, `app/dashboard`, `app/campaigns`, `app/campaigns/new`,
  `app/campaigns/[id]`.
- Reuses the existing shadcn design system (`#5B8CFF` primary). Public AI pages
  unchanged.

## Testing

| Check | Result |
|-------|--------|
| Backend byte-compiles (`compileall`) | ✅ |
| `app.main` imports with **and without** `supabase`/`PyJWT` | ✅ |
| `/health` reports `persistence` + `auth` status | ✅ |
| Protected route → `503` unconfigured, `401` on missing/invalid/expired token | ✅ |
| Valid HS256 token → passes auth, builds user client, reaches DB layer | ✅ |
| All 19 `/api/v1` routes register; existing AI endpoints still `200` | ✅ |
| Frontend `tsc --noEmit` | ✅ |
| `pnpm install` clean | ✅ |

> Full end-to-end against a live Supabase project was not run in this
> environment (no provisioned project); the auth→client→repository→DB chain was
> verified via `TestClient`, failing only at DNS for a fake DB host, as expected.

## Known issues

- Copilot conversation persistence: tables + repository exist but the copilot
  route does not yet auto-save turns.
- Resume binaries from the batch flow are analyzed then discarded; storing them
  needs the dedicated upload endpoint or client-side upload.
- No realtime, no pagination, no rate limiting yet.

## Next sprint

See [ROADMAP.md](../ROADMAP.md#development-phases). Priorities:
1. Wire Copilot conversation persistence (P0).
2. Client-side resume upload to storage during batch (P0).
3. Realtime pipeline board + keyset pagination (P1).
4. Interview-pack generation → PDF in `interview-packs` bucket (P2).
