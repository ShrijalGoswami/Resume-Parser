# Tenant Isolation — HireLens Security Reference

> **Status:** Approved architecture reference (A1, Launch Sprint). Documents the *as-built* tenant-isolation design.
> **Scope:** How HireLens keeps one customer's data (candidates, résumés, notes, decisions, org data) inaccessible to any other customer.
> **What this is not:** an investigation or a to-do list. Open runtime proofs live in §11 and are tracked by the A1-execution task, not here.

---

## 1. Purpose

HireLens is a multi-tenant SaaS handling candidate PII (résumés, contact details, evaluations). The baseline promise to every customer is that their data is invisible and immutable to every other tenant. This document is the permanent, canonical description of the mechanisms that deliver that promise, the invariants that must never be violated, and the runtime checks that must pass before any release.

Two isolation layers work together:

1. **Application layer (primary, browser-facing):** the FastAPI backend verifies a Supabase JWT on every request, derives the caller's identity, and scopes every query to that tenant.
2. **Database layer (defense-in-depth):** Postgres Row Level Security (RLS) on every table, plus private, tenant-namespaced Storage buckets.

---

## 2. Trust Boundary Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│  UNTRUSTED — Browser (Next.js)                                            │
│                                                                          │
│  Supabase JS client is used for AUTHENTICATION ONLY:                     │
│    sign in/up/out, session, getSession() → access_token (JWT)            │
│  NO .from(table), NO .storage, NO .rpc()  ── never reads tenant data     │
└───────────────────────────────┬─────────────────────────────────────────┘
                                 │  fetch /api/v1/*
                                 │  Authorization: Bearer <supabase JWT>
                                 ▼
════════════════════════ TRUST BOUNDARY (JWT verification) ════════════════
                                 │
┌───────────────────────────────▼─────────────────────────────────────────┐
│  TRUSTED — FastAPI backend                                               │
│                                                                          │
│  require_recruiter  → verify JWT (HS256 sig + exp + aud) → recruiter_id  │
│  OrgContext         → resolve organization_id from caller's OWN          │
│                       membership (user client, RLS-enforced)             │
│  RBAC               → require_permission(...) on org mutations           │
│                                                                          │
│  Repositories:                                                           │
│    • User client  (RLS ON)  + explicit .eq('recruiter_id', uid)         │
│    • Service client (RLS OFF, org tier only) + .eq('organization_id')   │
└───────────────────────────────┬─────────────────────────────────────────┘
                                 │  Postgres wire (per-request user token
                                 │  OR service role for org tables)
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Supabase / Postgres                                                     │
│    • RLS on ALL 28 tenant tables (recruiter_id = auth.uid()  OR          │
│      org membership via is_org_member/is_org_admin)                      │
│    • 4 PRIVATE Storage buckets, keys namespaced <recruiter_id>/...       │
│    • security_invoker view; SECURITY DEFINER helpers (search_path fixed) │
└─────────────────────────────────────────────────────────────────────────┘
```

**Key consequence:** for the browser, RLS is *not* the access-control boundary — the backend is. RLS becomes primary only for a direct-to-Postgres connection, which the product never makes from the client. RLS is therefore genuine defense-in-depth behind the backend.

---

## 3. Authentication Flow

1. Browser authenticates via the Supabase JS client (`lib/supabase/client.ts`) — password, OTP/magic-link, or SSO. Supabase issues a JWT held in a cookie-backed session.
2. Every backend call attaches `Authorization: Bearer <access_token>` (`services/*.ts` → `authHeaders()`), targeting `${NEXT_PUBLIC_API_URL}/api/v1`.
3. The backend gate `require_recruiter` (`app/core/auth.py:108-137`) verifies the token **server-side**:
   - **Primary:** local HS256 verification against `SUPABASE_JWT_SECRET`, enforcing signature, `exp`, `sub`, and `aud` (`auth.py:69-83`).
   - **Fallback (no shared secret):** remote `get_user_client(token).auth.get_user(token)` — Supabase validates and returns the user (`auth.py:86-105`).
4. On success it yields `CurrentRecruiter(id = auth.uid(), email, access_token, role, claims)`. A bad/expired/wrong-audience token → **401**. Tokens are never trusted from an unverified header.

---

## 4. Authorization Flow

**Recruiter-scoped resources (product data):**
- The per-request client is built *as the recruiter* — `get_user_client(recruiter.access_token)` (`app/core/deps.py:33-34`) — so RLS applies.
- Repositories add a second, explicit `.eq('recruiter_id', recruiter.id)` on every query (defense in depth). Access to a foreign UUID returns no row → **404**.

**Organization-scoped resources (enterprise tier):**
- `organization_id` is resolved from the caller's **own** `recruiters.organization_id` and active membership, under the user client with RLS (`app/enterprise/context.py:65-109`). It is never read from the request body.
- Mutations pass through RBAC `require_permission(...)` (`app/enterprise/deps.py:41-56`), then org-scoped repositories operate with the service client bound to the already-authorized `organization_id`.
- Org-scoped mutations are audit-logged (`app/enterprise/deps.py:59-77`); `audit_logs` is append-only.

---

## 5. Tenant Models

HireLens has **two** tenant models, applied to disjoint sets of tables.

### 5.1 `recruiter_id` (per-recruiter) — product data
- Rule: `recruiter_id = auth.uid()`.
- Isolation is **per recruiter**, which is *stricter* than per-organization.
- **Coherence note:** org teammates do **not** share campaigns/candidates through these tables — the data layer is recruiter-scoped even though the org tier exists. Any "shared workspace" product behavior is not delivered by the current data model. This is a functionality gap, **not** a data leak (the boundary is tighter, not looser).

### 5.2 `organization_id` (membership) — enterprise tier
- Rule: `is_org_member(organization_id)` for reads, `is_org_admin(organization_id)` for privileged writes (some tables member-writable).
- Membership is evaluated by `SECURITY DEFINER` helpers to avoid RLS recursion, each with `set search_path = public`.
- Every new recruiter is auto-provisioned a **single-member personal org** (`provision_default_org`), so today `is_org_member` ≈ "is the owner."

---

## 6. Supabase Clients

Defined in `app/db/supabase_client.py`.

### 6.1 User Client — `get_user_client(access_token)`
- Anon key + the end user's token (`postgrest.auth(token)`); **RLS is enforced as that user**.
- Constructed **per request** (cheap, no network on construction).
- Used for all per-recruiter product tables, Storage, self-profile, and org-context resolution.

### 6.2 Service Client — `get_service_client()`
- Service-role key; **bypasses RLS entirely** (Postgres design).
- Cached singleton; server-trusted only.
- Used **exclusively** for the org tier, **after** RBAC authorization, always explicitly filtered by a server-derived `organization_id`.

---

## 7. Service Role Usage Inventory

**Trust chain:** JWT verified → `organization_id` resolved from the caller's own membership under the user client (RLS) → RBAC permission checked → *only then* a service-role repo bound to that authorized `organization_id`. Service-role never sees a client-supplied org id.

| Module | Client | Tenant filter | Why service role |
|---|---|---|---|
| `app/enterprise/repositories.py` (orgs, workspaces, members, subscriptions, audit_logs, usage counters, api_keys, feature flags) | **Service** | `.eq('organization_id', org_id)` on every query | Operations span beyond one member's RLS view (admins manage other members' rows; audit logs appended on the org's behalf; usage metered server-side; invite-by-email resolves another user). RBAC-gated first. *Documented in-code (`repositories.py:1-9`).* |
| `app/integrations/repositories.py` (connections, automation rules, executions, webhooks) | **Service** | `.eq('organization_id', org_id)` throughout | Admin-configured, org-owned integration state + encrypted secrets, written on the org's behalf; RBAC-gated. *Documented in-code (`repositories.py:1`).* |
| `app/knowledge/store.py` (knowledge items + edges) | **Service** | `.eq('organization_id', org_id)` | Org long-term memory written by server/agent flows, not individual member actions. *Client choice inferred from usage; scoping is code-proven.* |
| `app/services/prediction_service.py` (digital twin, forecasts) | **Service** | `.eq('organization_id', org_id)` / org_id in payload | Server-computed org aggregates written on the org's behalf. *Client choice inferred from usage; scoping is code-proven.* |

**All per-recruiter product repositories use the User Client** (`CampaignRepository`, `CandidateRepository`, `NoteRepository`, `ConversationRepository`, `ActivityRepository`, `EmbeddingRepository`, `AgentRepository`, `AnalyticsRepository`, `StorageService`, plus self-profile at `routes/account.py` and org-context resolution). There is **zero** service-role access to per-recruiter product tables.

---

## 8. RLS Coverage Summary

RLS is enabled on **all 28 tenant tables** (migrations `0001–0014`), the analysis view uses `security_invoker`, and all `SECURITY DEFINER` helpers fix `search_path`.

**Recruiter-scoped (12):** `recruiters` (self), `campaigns`, `candidates`, `candidate_analyses`, `recruiter_notes`, `copilot_conversations`, `copilot_messages`, `interview_packs`, `activity_events`, `candidate_embeddings`, `agent_recommendations`, `candidate_uploads` — policy: `recruiter_id = auth.uid()` (recruiters: `id = auth.uid()`) for SELECT/INSERT/UPDATE/DELETE.

**Org-scoped (16):** `organizations`, `workspaces`, `organization_members`, `audit_logs`, `org_usage_counters`, `subscriptions`, `org_feature_flags`, `api_keys`, `integration_connections`, `automation_rules`, `integration_executions`, `webhook_endpoints`, `knowledge_items`, `knowledge_edges`, `prediction_snapshots`, `digital_twin_state` — policy: `is_org_member` (read) / `is_org_admin` or `is_org_member` (write). `audit_logs` has **no UPDATE/DELETE policy → immutable**.

**Known hardening notes (documented, low impact):**
- Migration `0002` comment says "Enable + force RLS" but the SQL applies `ENABLE` only, not `FORCE`. `authenticated` is fully covered by `ENABLE`; `FORCE` would additionally subject the table-owner role. Practical gap limited to a direct connection as the owner role.
- Within-tenant least-privilege: `webhook_endpoints.secret` (plaintext), `api_keys.key_hash`, and `integration_connections.credentials_encrypted` are SELECT-able by any org member. Not cross-tenant; currently moot (single-member orgs), relevant once teams ship.

---

## 9. Storage Isolation

Four buckets, **all private** (`0003`): `resumes`, `job-descriptions`, `interview-packs`, `avatars`.

- **Object keys are tenant-namespaced:** `<recruiter_id>/<campaign_id>/<candidate_id>/<filename>` (`storage_service.py:36-39`).
- **Object-level RLS:** `(storage.foldername(name))[1] = auth.uid()::text` for SELECT/INSERT/UPDATE/DELETE, to authenticated.
- **Uploads** run on the user client and explicitly reject any key not prefixed `"{recruiter_id}/"` (`storage_service.py:57-61`); the route first verifies candidate ownership and validates extension/magic-bytes/size (`routes/campaigns.py:248-258`).
- **Downloads** never touch Supabase from the browser: the backend mints a short-TTL signed URL from a recruiter-owned row's `resume_path` (`routes/campaigns.py:268-277`).
- **Documented asymmetry:** `StorageService.signed_url` does not itself re-assert the `recruiter_id/` prefix (unlike `upload`); it relies on the caller signing only owned paths + Storage RLS. Interview packs / JDs are generated in-memory today and are not persisted or signed.

---

## 10. Threat Model

| Attack | Expected defense | Enforced at |
|---|---|---|
| Modify `organization_id` in request | Ignored — `org_id` derived from caller's own membership | backend (`context.py`) + RLS `is_org_member` |
| Guess another tenant's candidate/campaign UUID | Recruiter-scoped lookup returns no row → **404** | backend repos + RLS |
| Edit `role_id`/`campaign_id` in URL | Same scoped lookup → **404** | backend + RLS |
| Read another candidate | `recruiter_id`-filtered query; RLS `recruiter_id = auth.uid()` | backend + RLS |
| Download another résumé | Signed URL only for an owned row's path; Storage RLS `foldername[1] = auth.uid()` | backend + Storage RLS |
| Update/delete another note | `.eq('id').eq('recruiter_id')` + RLS U/D | backend + RLS |
| Bypass frontend filters (call API directly) | Irrelevant — enforcement is server-side, not UI | backend |
| Forged/expired/wrong-audience JWT | HS256 signature + `exp` + `aud` checks → **401** | `auth.py` |
| Non-admin org member escalates | `is_org_admin` write policies + `require_permission` RBAC | RLS + backend RBAC |

---

## 11. Runtime Verification Checklist

These **cannot** be proven from source and must pass against a live Supabase + backend before any external release. This list is the acceptance bar.

**Runtime evidence:** executed by the canonical suite `backend/tests/test_tenant_isolation.py`; the last run is recorded in [`RUNTIME_VALIDATION_A1.md`](./RUNTIME_VALIDATION_A1.md) (auto-generated — do not hand-edit). Checked items below were proven by that live run; the report supersedes this checklist if they ever disagree — re-run the suite.

- [x] All migrations `0001–0014` are **applied** to the live database. *(Runtime PASS — 28/28 tenant tables present.)*
- [x] **Cross-tenant API denial** — recruiter A gets **404** on every one of recruiter B's resources: campaign read/edit/delete, candidate list/detail, notes, résumé signed URL, agent recommendation, org endpoints. *(Runtime PASS; mutations also verified against the victim's untouched ground truth.)*
- [x] **Direct-DB RLS backstop** — A's JWT via user client returns **0 rows** for B's `candidates`/`campaigns`/etc. *(Runtime PASS.)*
- [x] **Storage RLS backstop** — A cannot list/read an object under B's prefix; a signed URL cannot be minted for a foreign prefix. *(Runtime PASS — foreign signed-URL denied and direct object download denied; this is behavioural proof that buckets are private and object RLS is enabled.)*
- [x] **Auth gate** — expired / wrong-signature / wrong-audience / missing token → **401**. *(Runtime PASS.)*
- [ ] `SUPABASE_JWT_SECRET` and `SUPABASE_JWT_AUD` set correctly **in production** (or the remote-verify fallback confirmed). *(Not yet verified: the suite ran against the non-prod project via the JWKS path; production JWT config is confirmed at deploy time.)*
- [ ] **RBAC** — a non-admin org member is **403** on admin-only actions. *(Out of scope of the current suite: orgs auto-provision single-member; to be added when team membership ships — see §12.)*

**How to run** (destructive — creates & deletes real users/data; never point at production):

```bash
# from backend/, venv active, ENVIRONMENT non-production, Supabase configured,
# and the backend running at HL_TEST_BASE_URL (default http://localhost:8000)
HL_ALLOW_DESTRUCTIVE_TESTS=1 python -m tests.test_tenant_isolation
```

The suite aborts via `preflight()` unless `HL_ALLOW_DESTRUCTIVE_TESTS=1`, `ENVIRONMENT` is non-production, and Supabase is fully configured. It writes `docs/security/RUNTIME_VALIDATION_A1.md` from the actual results and exits non-zero on any failure. See the module docstring for the full env list.

---

## 12. Known Assumptions

- **Migrations are applied and RLS is enabled.** Proven at runtime on the non-production project by the §11 suite (migrations 0001–0014 present; RLS + storage isolation exercised behaviourally — see [`RUNTIME_VALIDATION_A1.md`](./RUNTIME_VALIDATION_A1.md)). **Production** deployment of the same migrations/RLS is still confirmed at release time; the repo carries the SQL but no CI/link proof of the prod database.
- **Service-role paths depend entirely on the application `organization_id` filter** (RLS is bypassed there), which in turn trusts the RBAC + org-context resolution done first under the user client.
- **JWT config is correct in prod** (secret/audience). Misconfiguration degrades to the remote-verify path or fails closed (401).
- **Single-member orgs today.** Within-tenant least-privilege notes (§8) are latent until multi-member teams are enabled.
- **Residual code gaps** (`signed_url` prefix guard; `add_analysis`/`embedding.upsert`/`add_message` child-id ownership pre-checks) rely on RLS/FKs as backstop; not shown exploitable through current routes.

---

## 13. Security Invariants

These are non-negotiable. Any change that violates one is a release blocker.

1. **The browser never accesses tenant data directly from Supabase.** The Supabase JS client is authentication-only — no `.from(table)`, `.storage`, or `.rpc()`. All tenant data flows through the backend API.
2. **Every backend request derives `recruiter_id` from the JWT.** Identity comes from server-side token verification, never from a header, body, or query parameter.
3. **`organization_id` is never accepted from client input.** It is always resolved from the caller's own membership, server-side.
4. **Every recruiter-scoped query must include `recruiter_id` filtering.** RLS plus an explicit `.eq('recruiter_id', …)` predicate — defense in depth.
5. **Every service-role query must include `organization_id` filtering.** Service-role bypasses RLS, so the application filter is the sole guard and must always be present.
6. **Storage object paths are always tenant-namespaced.** `<recruiter_id>/...`, enforced on upload and by object-level RLS.
7. **Cross-tenant access must always fail.** No API path, query, or signed URL may expose another tenant's data — the expected result of any cross-tenant attempt is 404/403/empty.
8. **Runtime authorization tests must pass before release.** The §11 checklist is a hard gate; a green build/test-suite that omits cross-tenant proofs does not qualify.

---

*Maintenance: update this document whenever a new tenant-scoped table, bucket, RPC, service-role usage, or client path is added. It is the canonical tenant-isolation reference for HireLens.*
