# ADR-014 — Enterprise Platform Architecture

**Status:** Accepted · **Date:** V6 Sprint 10

## Context

V5 is feature-complete but single-tenant: everything is scoped to one recruiter
(`recruiter_id = auth.uid()`). To sell to companies we must host many independent
organizations with strict isolation, configurable permissions, enterprise-grade
auditing, and the foundations for subscriptions, billing, and compliance —
assuming thousands of orgs, millions of candidates, hundreds of recruiters.

The hard constraint: do this **without destabilizing V5**. A big-bang rewrite of
every table's RLS and every repository/route would be high-risk.

## Decision

Layer the enterprise model **additively** on top of the recruiter-scoped product.

- **Hierarchy** — Organization → Workspace → Members(role) → Campaigns → Candidates.
  A tenant anchor (`organization_id`, `active_workspace_id`) is added to
  `recruiters`; every new recruiter is **auto-provisioned** a personal org +
  default workspace + owner membership + free subscription (trigger + backfill).
  Existing recruiter-scoped tables and their RLS are untouched — org-awareness
  rolls up through membership, so V5 keeps working with zero data migration.
- **Membership RLS** — new org tables are secured by `is_org_member` /
  `is_org_admin` SECURITY DEFINER helpers (no policy recursion). A member sees only
  their org's data; cross-org access is impossible.
- **Policy-based RBAC** — a configurable `Role → {Permission}` registry
  (`enterprise/rbac.py`) is the single source of truth. Routes declare a
  `Permission` via `require_permission(...)`; handlers never inspect role names, so
  permissions can be re-mapped without touching code.
- **Immutable audit log** — `audit_logs` (insert + select only) records user, org,
  action, resource, metadata, timestamp for critical actions; searchable by action.
- **Usage accounting** — `org_usage_counters` per org/period/metric. AI usage rolls
  up automatically: the gateway `usage_tracker` calls an org hook (set by the
  enterprise layer, keeping `app.ai` free of an enterprise dependency) that reads a
  request-scoped `current_org_id` and increments `ai_requests`/`tokens`.
- **Subscription foundation** — plans (Free/Professional/Business/Enterprise) with
  centralized limits (`enterprise/plans.py`); enforcement reads from one place. No
  payment processing.
- **Feature flags** — per-org overrides resolved against plan defaults
  (`enterprise/feature_flags.py`); the AI capability routers are gated with
  `feature_gate(...)`, which also writes the audit trail.
- **API keys** — scoped (read-only / read-write / admin) scaffolding; the secret is
  shown once and only a hash is stored. Authentication wiring is a placeholder.
- **Security** — authorization is server-side (RBAC + RLS); the frontend never
  decides access. Privileged mutations use the service client but only AFTER an
  RBAC dependency authorizes, and always filtered by the resolved `organization_id`.

## Consequences

- ✅ **Multi-tenant & isolated** — membership RLS + explicit org filtering; strict
  organization/workspace isolation.
- ✅ **Non-destabilizing** — additive; V5 flows and their RLS unchanged; every user
  auto-provisioned an org.
- ✅ **Configurable authorization** — policy-based RBAC; no hardcoded role checks.
- ✅ **Auditable & metered** — immutable audit trail; AI usage rolls up to the org
  automatically via the gateway hook.
- ✅ **Billing-ready** — plans + limits + feature flags centralized; payments later.
- ⚠️ **Dual scoping** — product data is recruiter-scoped and rolls up to the org via
  membership; a full per-row `organization_id` denormalization on campaigns/candidates
  is a future optimization (not required for isolation, which membership provides).
- ⚠️ **Per-call usage writes** — the org usage hook writes best-effort per AI call;
  a batched/async flush is a future optimization for very high volume.

## Alternatives considered

| Option | Why not |
|--------|---------|
| Rewrite every table's RLS to org_id | High-risk big-bang; membership rollup gives isolation additively. |
| Hardcode role checks per route | Not configurable; policy-based RBAC keeps authorization as data. |
| Frontend-enforced permissions | Insecure; the server is the sole authority. |
| Build billing/payments now | Out of scope; this is the subscription FOUNDATION. |
| Store full API-key secrets | Never — only a hash is stored; the secret is shown once. |

Related: [ADR-003](./ADR-003-repository-pattern.md),
[ADR-011](./ADR-011-ai-gateway-and-provider-management.md),
[sprints/V6_SPRINT10.md](../sprints/V6_SPRINT10.md).
