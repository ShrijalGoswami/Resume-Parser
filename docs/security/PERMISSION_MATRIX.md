# Hirevo Permission Matrix

**Source of truth:** `backend/app/enterprise/rbac.py` — `ROLE_PERMISSIONS`.
This document is generated from it; if they disagree, the code is right.

## Enforcement model

Authorization is enforced **server-side only**. Routes declare a `Permission`
via `dependencies=[RequireX]`; `require_permission()` resolves the caller's org
context, looks up their role, and raises **403** with the denied permission
named in the detail. Handlers never inspect role names.

The frontend reads the same permission list from `GET /org/context` and hides
controls the member cannot use. **That is a courtesy, not a control** — every
gated action answers 403 whether or not the button was rendered.

## Matrix

| Permission | owner | admin | hiring_manager | recruiter | interviewer | viewer |
|---|---|---|---|---|---|---|
| `org.manage` | yes | - | - | - | - | - |
| `member.manage` | yes | yes | - | - | - | - |
| `workspace.manage` | yes | yes | yes | - | - | - |
| `feature_flag.manage` | yes | yes | - | - | - | - |
| `api_key.manage` | yes | yes | - | - | - | - |
| `integration.manage` | yes | yes | - | - | - | - |
| `audit.view` | yes | yes | yes | - | - | - |
| `usage.view` | yes | yes | yes | yes | - | - |
| `campaign.manage` | yes | yes | yes | yes | - | - |
| `campaign.delete` | yes | yes | yes | - | - | - |
| `campaign.view` | yes | yes | yes | yes | yes | yes |
| `candidate.manage` | yes | yes | yes | yes | - | - |
| `candidate.view` | yes | yes | yes | yes | yes | yes |
| `ai.use` | yes | yes | yes | yes | yes | - |
| `agent.manage` | yes | yes | yes | yes | - | - |
| `export` | yes | yes | yes | yes | - | - |

## Role summaries

| Role | Can | Cannot |
|---|---|---|
| **owner** | Everything, including deleting the organization and changing billing | — |
| **admin** | Runs the organization: members, workspaces, feature flags, API keys, integrations, audit, usage, and every product action | **Delete the organization; change billing/subscription** (`org.manage`) |
| **hiring_manager** | Create/edit/**delete** roles, upload & manage candidates, analytics & audit, AI, export, approve agent recommendations, manage workspaces | Manage organization, members, billing, feature flags, API keys, integrations |
| **recruiter** | Create/edit roles, upload & manage candidates, notes, inbox, AI, export, analytics, approve agent recommendations | **Delete roles**, view the audit log, manage workspaces, anything org-admin |
| **interviewer** | View roles & candidates, use AI | Any mutation; **exporting**; analytics |
| **viewer** | View roles & candidates | Everything else, including AI and export |

### Decisions of record (29 Jul 2026)

These four were inferred during the initial sweep and have since been confirmed
explicitly. They are policy, not accident:

1. **`org.manage` is owner-only.** An admin runs the organization; only an owner
   can dispose of it. Previously `owner` and `admin` were identical, which meant
   an admin could delete the organization.
2. **`export` is its own permission**, not a synonym for `candidate.view`.
   Reading candidates in-app and bulk-extracting them are different acts;
   interviewers and viewers may do the first only.
3. **Recruiters have `usage.view`**, so Analytics is available to them. Analytics
   is pipeline health across the roles they run — operational data for the person
   running the pipeline. If org spend ever needs to be hidden from recruiters,
   split `usage.view` rather than removing their analytics.
4. **`GET /ai/usage` is gated `usage.view`**, matching `/org/usage`. It exposes
   organization AI spend and was previously readable by every authenticated
   member, including `viewer`.

## Endpoint coverage

Product surface (`campaigns`, `copilot`, `prediction`, `agent`, `analytics`,
`analyze`, `batch`, `match`, `reports`, `search`, `export`) is gated per route.
Org-administration (`org`, `admin`, `integrations`, `knowledge`) was already
gated via signature-level dependencies.

`admin.py` (AI gateway): `POST /ai/provider` is `org.manage`; `GET /ai/usage` is
`usage.view`; `GET /ai/config` and `GET /ai/health` are authenticated-only
(provider names, capability flags and health counters — no secrets, no spend);
`POST /ai/qa/reset` is refused outside development by an `ENVIRONMENT` check.

`account.py` (`GET/PATCH /me`, `GET /activity`) is intentionally ungated: it is
self-service over the caller's own record, scoped by RLS.

## Adding a permission

1. Add to `Permission` in `rbac.py`.
2. Grant it in `ROLE_PERMISSIONS`.
3. Add a `RequireX = Depends(require_permission(Permission.X))` in `enterprise/deps.py`.
4. Attach it to routes via `dependencies=[RequireX]`.
5. Mirror the string in `frontend/components/hirelens/settings/permissions.ts`
   only if the UI needs to hide a control.
