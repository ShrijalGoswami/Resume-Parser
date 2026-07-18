# ADR-001 — Use Supabase as the backend platform

**Status:** Accepted · **Date:** V4 Sprint 1

## Context

HireLens was a stateless AI app (no database, auth, or storage). V4 required
turning it into a persistent SaaS: recruiters must sign in, own data, create
campaigns, and return later. We needed **Postgres + authentication + file
storage + row-level multi-tenancy**, delivered fast by a small team, without
building auth or an object store from scratch.

## Decision

Adopt **Supabase** as the unified persistence platform: managed **PostgreSQL**,
**Auth** (GoTrue, JWT-based), **Storage** (S3-compatible with policies), and
**Row Level Security** as the tenant-isolation primitive. The FastAPI backend
talks to Postgres/Storage **as the end user** (anon key + user JWT) so RLS is
always enforced; a service-role key is reserved for admin operations.

## Consequences

- ✅ Auth, DB, and storage from one provider with one identity (`auth.uid()`)
  threading through RLS on tables and storage objects.
- ✅ RLS gives defense-in-depth tenant isolation at the database, not just the app.
- ✅ Realtime is available later with no new infrastructure.
- ✅ The app still runs fully stateless when Supabase env vars are absent
  (graceful degradation).
- ⚠️ Vendor coupling to Supabase's SQL + policy conventions; mitigated by keeping
  schema in plain SQL migrations (portable to any Postgres).
- ⚠️ Postgres connection limits require pooling at scale (planned).

## Alternatives considered

| Option | Why not |
|--------|---------|
| Raw Postgres + custom auth | Rebuilds auth, storage, and RLS tooling ourselves — slow, error-prone. |
| Firebase | NoSQL model fits our relational campaign/candidate graph poorly; weaker SQL/RLS story. |
| Auth0 + S3 + RDS | Three vendors to wire together; more ops, no unified `auth.uid()` in the DB. |
| Prisma + Postgres | Good ORM, but still needs a separate auth + storage stack. |

See [DATABASE.md](../DATABASE.md), [SECURITY.md](../SECURITY.md).
