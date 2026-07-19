# V6 Sprint 10 — Enterprise Platform & Organization Management

> The transition from an AI recruiting application to an enterprise AI recruiting
> platform: multi-tenant organizations with strict isolation, policy-based RBAC,
> immutable auditing, usage accounting, subscription foundations, feature flags,
> and scoped API keys — all layered additively over V5. Decision record:
> [ADR-014](../decisions/ADR-014-enterprise-platform-architecture.md).

## Goal

Safely host multiple independent organizations with strict isolation, configurable
permissions, enterprise-grade auditing, and the infrastructure for subscriptions,
billing, and compliance — without destabilizing the V5 feature set.

## Organization hierarchy

```
Organization → Workspace → Members(role) → Campaigns → Candidates
```

A tenant anchor (`organization_id`, `active_workspace_id`) is added to
`recruiters`. Every new recruiter is **auto-provisioned** a personal organization +
default workspace + owner membership + free subscription (trigger + backfill), so
existing single-recruiter flows keep working with zero data migration. Org-awareness
rolls up through membership; existing recruiter-scoped tables and RLS are untouched.

## RBAC model

Policy-based (`app/enterprise/rbac.py`): a configurable `Role → {Permission}`
registry is the single source of truth. Default roles: **owner, admin,
hiring_manager, recruiter, interviewer, viewer**. Routes declare a `Permission` via
`require_permission(...)`; handlers never inspect role names.

## Authorization flow

```
Bearer token → require_recruiter → resolve_org_context (RLS reads: org, role, plan, flags)
   → require_permission(P) / require_feature(F)  (403 on failure)
   → handler → org-scoped repository (service client, filtered by organization_id)
   → audit_logs.record(...)   (immutable)
```

The frontend never decides access. Privileged mutations use the service client only
AFTER an RBAC dependency authorizes, always scoped to the resolved `organization_id`.

## Audit architecture

`audit_logs` is insert + select only (immutable). Critical actions write user, org,
workspace, action, resource, metadata, timestamp — e.g. `member.invited`,
`feature_flag.changed`, `subscription.changed`, `ai_provider.changed`,
`report.generated`, `agent.accessed`, `api_key.created`. Searchable by action.

## Subscription model

Plans (`app/enterprise/plans.py`): **Free / Professional / Business / Enterprise**,
each with centralized limits (recruiters, workspaces, campaigns, ai_requests,
storage_mb, report_exports, agent_scans). `-1` = unlimited. Enforcement reads from
this one module. No payment processing (foundation only).

## Usage accounting

`org_usage_counters` per org/period/metric. **AI usage rolls up automatically**: the
gateway `usage_tracker` invokes an org hook (registered by the enterprise layer, so
`app.ai` has no dependency on `app.enterprise`) that reads a request-scoped
`current_org_id` and increments `ai_requests`/`tokens`. The Admin Console shows usage
vs plan limits.

## Feature flags

Per-org overrides (`org_feature_flags`) resolved against plan defaults
(`app/enterprise/feature_flags.py`): ai_copilot, candidate_comparison, semantic_search,
interview_intelligence, executive_reports, autonomous_agent. The reports and agent
routers are gated with `feature_gate(...)` (also audited); disabled → 403.

## Workspace isolation

Multiple workspaces per organization (Engineering Hiring, Sales Hiring, …). Users
switch the active workspace without switching accounts (`POST /org/switch-workspace`,
reflected in the header switcher).

## Admin Console

`/admin` (backend `/api/v1/org/*`): Settings, Workspaces, Members, Roles (permission
matrix), Feature Flags, Usage, Audit Logs, Subscription, API Keys. Guarded by RBAC;
the header shows the org, plan, role, workspace switcher, and an Admin shortcut.

## Backend surface (new)

`app/enterprise/` — rbac, plans, feature_flags, schemas, context (OrgContext +
`current_org_id`), repositories (Org/Audit/Usage/ApiKey), deps
(`require_permission`, `require_feature`, `feature_gate`). Routes: `app/routes/org.py`
(19 endpoints). Migration `0008` (8 tables + tenant anchor + provisioning + RLS).

## Performance

Bounded org-context resolution (a few indexed reads per admin request); no
org-level N+1; indexes on all org foreign keys and audit/usage lookup columns.
Usage rollup is best-effort and out of the request's critical path.

## Verification

- ✅ Pure-logic tests: RBAC (owner=all, viewer≠AI_USE, recruiter≠MEMBER_MANAGE), plan
  limits (within/over, unlimited), feature resolution (plan defaults + overrides).
- ✅ Org usage hook registered with the gateway; AI usage attributes to the org.
- ✅ 71 API routes (19 org); backend imports clean; frontend `tsc` zero errors +
  `next build` green (adds `/admin`); Sprint 2–9 intact.
