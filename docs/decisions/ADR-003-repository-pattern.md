# ADR-003 — Use the Repository pattern for data access

**Status:** Accepted · **Date:** V4 Sprint 1

## Context

V4 introduced database access across many routes (campaigns, candidates, notes,
conversations, activity). We needed data access that is **strongly typed**,
**tenant-scoped by construction**, **consistent**, and **testable** — without
scattering raw Supabase query builders through the route handlers.

## Decision

Introduce a **repository layer** (`backend/app/repositories/`): one repository
per aggregate, all extending `BaseRepository`, each holding a Supabase client +
the authenticated `recruiter_id`. Every query is explicitly filtered
`.eq("recruiter_id", self.recruiter_id)` (in addition to RLS). Routes depend on
repositories via DI (`app/core/deps.py`), never on the raw client. Pydantic
models are returned, not dicts.

## Consequences

- ✅ Tenant scoping is enforced in **two** places — RLS *and* the repository —
  so even an RLS-bypassing service client can't leak cross-tenant data here.
- ✅ Data access is centralized, typed, and uniform (`create/list/get/update/delete`).
- ✅ Routes are thin and readable; repositories are trivially mockable in tests.
- ✅ Consistent error mapping (`_wrap` → `502`, `_one_or_404` → `404`).
- ⚠️ Some boilerplate per aggregate; acceptable for the clarity gained.

## Alternatives considered

| Option | Why not |
|--------|---------|
| Raw Supabase calls in routes | Duplicated scoping/error logic; easy to forget the `recruiter_id` filter. |
| Full ORM (SQLAlchemy) | Redundant with Supabase's PostgREST client; adds a second data path + migrations tool. |
| Service-layer only (no repos) | Mixes business logic with query building; harder to test data access in isolation. |

See [ARCHITECTURE.md](../ARCHITECTURE.md), [SECURITY.md](../SECURITY.md).
