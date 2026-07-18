# ADR-005 — Verify recruiter identity with JWTs

**Status:** Accepted · **Date:** V4 Sprint 1

## Context

The backend must authenticate recruiters on every persistence request and map
them to a database identity that RLS can use (`auth.uid()`). Supabase Auth issues
JWT access tokens. We needed verification that is **fast** (on the hot path),
**stateless** (no server-side session store), and **provider-agnostic** so OAuth
can be added later without reworking the backend.

## Decision

Use **Supabase-issued JWTs** as the credential. The frontend attaches the access
token as `Authorization: Bearer <token>`. The backend (`app/core/auth.py`)
verifies it **locally with HS256** against `SUPABASE_JWT_SECRET` (checking
`exp`, `sub`, `aud`) — no network round-trip — with a remote
`auth.get_user()` fallback if no shared secret is configured. The `sub` claim is
the recruiter id used directly by RLS. Two dependencies expose this:
`require_recruiter` (strict) and `optional_recruiter` (degrades to anonymous).

## Consequences

- ✅ **Fast:** local signature verification, no auth round-trip per request.
- ✅ **Stateless:** no session table; scales horizontally with the stateless backend.
- ✅ **Provider-agnostic:** any Supabase token (email/password today; Google,
  GitHub, SAML later) verifies identically — OAuth is a dashboard change only.
- ✅ **Uniform identity:** `sub` → `recruiters.id` → `auth.uid()` in RLS.
- ⚠️ Token revocation is limited to expiry (short-lived access tokens + refresh
  mitigate this).
- ⚠️ The JWT secret is sensitive; kept server-side only, rotatable.

## Alternatives considered

| Option | Why not |
|--------|---------|
| Server-side sessions | Stateful; needs a session store; harder to scale statelessly. |
| Verify every token via Supabase API | Network round-trip on every request → latency. |
| Custom auth (password hashing, tokens) | Reinvents a solved, security-sensitive problem. |
| API keys | No per-user identity for RLS; poor UX for human recruiters. |

See [SECURITY.md](../SECURITY.md), [ARCHITECTURE.md](../ARCHITECTURE.md#authentication-lifecycle).
