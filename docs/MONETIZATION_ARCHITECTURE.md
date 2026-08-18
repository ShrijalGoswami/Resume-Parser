# Hirevo — Subscription & Feature-Gating Architecture

**Status:** Design proposal · no code written · awaiting approval
**Date:** 31 Jul 2026
**Scope:** FREE · PLUS · PRO · ENTERPRISE plans, entitlement enforcement, upgrade surfaces

> ## ⚠️ BYO AI IS CANCELLED — do not implement §7 or the `/org/ai-credentials` endpoints
>
> **Product decision, 6 Aug 2026: Hirevo is Groq-only for V1** (HANDOFF §11.0).
> The `byo_ai` entitlement has been **removed** from the catalog, from both
> mirrors, from `/pricing`, and from the entitlement helpers. It was never
> implemented.
>
> This document is a **dated design proposal**, kept as the record of what was
> planned on 31 Jul 2026. It is annotated rather than rewritten, because editing
> a historical proposal to pretend it never proposed something destroys the only
> evidence of why the decision was later taken. **Everything it says about BYO
> AI — §7, the credential store, `0019_org_ai_credentials.sql`, the four
> `/org/ai-credentials` routes, `ai-credentials-section.tsx`, and rollout steps
> 5 and 10 — is superseded and must not be built.** The rest of the document
> (plans, entitlement enforcement, quotas, upgrade surfaces) is unaffected and
> was shipped.

---

## 0. Executive summary

Hirevo already has most of the machinery this needs, and that changes the shape of the work.
`app/enterprise/` ships a plan registry, a per-org feature-flag resolver, a policy-based RBAC
engine, and an `OrgContext` that every request already resolves. `/org/context` already returns
`plan`, `permissions` and `features` to the frontend, and the frontend already mirrors it in
`use-can.ts` + `permissions.ts`, with a `GateState` component that already has a `reason: 'plan'`
branch.

So this is **not** a greenfield build. It is four things:

1. **Re-tier** the plan catalog (`free/professional/business/enterprise` → `free/plus/pro/enterprise`)
   and re-map which capability unlocks where.
2. **Add the missing third axis** — a `PlanService` entitlement layer — and connect it to the
   enforcement points that currently have none.
3. **Close the enforcement gap.** The limits in `plans.py` are *displayed and never enforced*
   (verified: `within_limit()` and `limit_for()` have zero call sites outside their own module).
   Uploads, seats, and campaigns are unbounded on every plan today.
4. **Make plan state server-authoritative.** `PATCH /org/subscription` currently lets any org owner
   set their own plan to `enterprise`, free of charge. This is live in production code.

Three findings below are pre-existing defects that this program must fix rather than build on:
the self-upgrade hole (§12.1), the non-atomic usage counter (§12.2), and the fact that additive
feature-flag overrides can already grant capabilities above the paid plan (§12.9).

---

## 1. Existing architecture

### 1.1 The two axes that exist today

| Axis | Question | Where | Enforced? |
|---|---|---|---|
| **Authentication** | Who are you? | Supabase Auth → `core/auth.py` → `CurrentRecruiter` | Yes |
| **Authorization (RBAC)** | What may your *role* do? | `enterprise/rbac.py` — 6 roles × 16 permissions | Yes — 100+ endpoints |
| **Entitlement** | What has your *org bought*? | `enterprise/feature_flags.py` — 6 flags | **Partially** — 7 call sites, no limits |

The third axis is the one this program builds out. It must stay **orthogonal to RBAC**. A recruiter
on FREE and a viewer on PRO both fail to open the Copilot, but for opposite reasons with opposite
remedies — *upgrade the org* vs *ask your admin*. Conflating them produces the single worst UX
failure in a monetized product: telling a paying admin they lack permission.

### 1.2 Backend — `app/enterprise/`

| File | Role | Notes |
|---|---|---|
| `plans.py` | `Plan` enum + `PLAN_LIMITS` (`-1` = unlimited) | Single source of truth for limits. **Never read for enforcement.** |
| `feature_flags.py` | 6 features; `_PLAN_DEFAULTS` per plan; org override wins | Override precedence: `org_feature_flags` → plan default → `False` |
| `rbac.py` | `Role`, `Permission`, `ROLE_PERMISSIONS` registry | Data-driven; no role names in handlers. Keep as-is. |
| `context.py` | `OrgContext` — resolves org, workspace, role, plan, flags | 1 read + a 4-way parallel fan-out (`org`, `member`, `sub`, `flags`). Deliberately **uncached** so revocation is immediate. |
| `deps.py` | `require_permission()`, `feature_gate()`, ready-made gates | `feature_gate` also writes an audit row |
| `repositories.py` | Org/Audit/Usage/ApiKey repos (service client, org-scoped) | `update_subscription()` writes both `subscriptions` and `organizations.plan` |
| `__init__.py` | Registers the AI usage → org rollup hook | Uses the `current_org_id` contextvar |

Plan resolution precedence in `context.py:208`: `subscriptions.plan` → `organizations.plan` → `"free"`.

### 1.3 Where entitlements are enforced today (all 7 sites)

```
main.py:82    feature_gate("ai_copilot")            → /copilot/*
main.py:91    feature_gate("semantic_search")       → /search/*
main.py:103   feature_gate("executive_reports")     → /reports/*
campaigns.py:323  feature_gate("candidate_comparison")  → compare
campaigns.py:379  feature_gate("interview_intelligence") → interview pack
agent.py:65/112   feature_gate("autonomous_agent")      → agent scan/read
```

Not gated by any entitlement: **resume upload, batch analysis, export, analytics, member invites,
campaign creation.** Those are exactly the surfaces the new plan matrix needs to bound.

### 1.4 Frontend mirror

| File | Role |
|---|---|
| `components/hirelens/settings/permissions.ts` | `PERMS` — mirrors `Permission` enum |
| `components/hirelens/lib/use-can.ts` | `useCan()` (control-level) + `usePermissionGate()` (route-level, 4 states) |
| `components/hirelens/lib/api/org-context.ts` | `useOrgContext()` — one query key, `['hl','settings','org-context']` |
| `components/hirelens/states/gate-state.tsx` | Calm gate surface; **already has `reason: 'plan'` + upgrade wording** |
| `components/hirelens/settings/sections/billing-section.tsx` | Plan display + the self-serve plan switcher |
| `components/hirelens/shell/nav-config.ts` | Optional `perm` per nav item |
| `types/org.ts` | `OrgContext` — already carries `plan`, `permissions`, `features` |

`use-can.ts` carries a documented rule worth preserving verbatim into the entitlement layer:
*never withhold content on the strength of something you failed to find out.* A failed
`/org/context` must not render "upgrade to Pro" at a customer who already pays for Pro.

### 1.5 AI Gateway

```
orchestrator.run(capability, variables, schema, role, provider?, model?)
  → gateway.resolve()/fallback_chain()      # which provider + model
  → providers/registry.get_provider(name)   # PROCESS-WIDE SINGLETON
  → provider.complete(...)                  # key from settings.<PROVIDER>_API_KEY
  → usage_tracker.record(...)               # → org rollup hook via current_org_id
```

Three properties matter for BYO AI:

- `get_provider()` caches **one instance per provider name** (`_INSTANCES`), and e.g. `GroqProvider`
  holds a **class-level** `_client` built from `settings.GROQ_API_KEY`. There is no per-tenant path.
- `health_manager` is keyed by **provider name only**, globally.
- `orchestrator.run()` has **no tenant parameter**; org attribution happens out-of-band through the
  `current_org_id` contextvar.

### 1.6 Database (relevant tables)

`organizations`(plan, settings) · `subscriptions`(organization_id **unique**, plan, status, limits jsonb,
current_period_start/end) · `organization_members`(role, status) · `org_feature_flags`(flag, enabled)
· `org_usage_counters`(organization_id, period, metric, value — unique together) · `api_keys` (Hirevo-issued,
*not* provider keys) · `audit_logs` (immutable) · `candidate_uploads`(campaign_id, candidate_id,
**recruiter_id**, file_hash — unique(campaign_id, file_hash)) · `workspaces` · `campaigns` · `candidates`.

Encryption helper already exists: `app/integrations/crypto.py` (`encrypt`/`decrypt`, Fernet,
`INTEGRATION_ENCRYPTION_KEY`), used for OAuth tokens.

---

## 2. Naming decisions and collisions (resolve before coding)

| Issue | Resolution |
|---|---|
| Existing slugs `professional`/`business` vs new `PLUS`/`PRO` | Map `professional→plus`, `business→pro`. Keep slugs lowercase in DB/API; display names in the catalog. |
| "**Roles**" is overloaded | Product "roles" = job openings = `campaigns` table. RBAC "roles" = member roles. In code, the FREE limit of "2 roles" is `campaigns: 2`. Never name the entitlement `roles`. |
| Existing features `executive_reports`, `autonomous_agent` are absent from the new matrix | **Open question — needs your call.** Proposal: `executive_reports → pro` (Advanced Analytics family), `autonomous_agent → pro`. |
| Marketing page tiers say "Team $499 / Business $999" (`frame-05-conclusion.tsx:24-43`) | Regenerate from the catalog once pricing is set; today it contradicts the new four-tier story. |

### Open questions that change the schema

1. **Is the PLUS 25-resume limit monthly or lifetime?** FREE's "2 total" is clearly lifetime.
   If PLUS is also lifetime, a solo recruiter churns in month two. **Recommendation: FREE = lifetime,
   PLUS = 25/month.** The proposed schema supports both (a `period` column with a `'lifetime'`
   sentinel), so this can be decided late — but it must be decided before launch copy is written.
2. **Campaign ("roles") limits for PLUS/PRO** — unspecified. Recommendation: unlimited for both.
3. **Organization limits for PLUS/PRO** — spec says FREE 1, ENTERPRISE unlimited. Recommendation:
   1 for PLUS and PRO. See §9.3 — this limit is currently unenforceable anyway.

---

## 3. Feature gate architecture (the design rules)

### 3.1 Catalog as data, not conditionals

One registry, mirrored in TS, is the source of truth for the gate, the error message, the upsell
copy, **and** the future pricing page:

```python
# app/enterprise/catalog.py  (new)
PLAN_ORDER = [Plan.free, Plan.plus, Plan.pro, Plan.enterprise]   # ordinal → comparable

FEATURES = {
    "resume_parser":         Feature(min_plan=free,  label="Resume Parser"),
    "ats_score":             Feature(min_plan=free,  label="ATS Score"),
    "basic_ai_summary":      Feature(min_plan=free,  label="Basic AI Summary"),
    "full_resume_analysis":  Feature(min_plan=plus,  label="Full Resume Analysis"),
    "candidate_comparison":  Feature(min_plan=plus,  label="Candidate Comparison"),
    "export_pdf":            Feature(min_plan=plus,  label="PDF Export"),
    "ai_copilot":            Feature(min_plan=pro,   label="AI Copilot"),
    "semantic_search":       Feature(min_plan=pro,   label="Semantic Search"),
    "interview_intelligence":Feature(min_plan=pro,   label="Interview Intelligence"),
    "advanced_analytics":    Feature(min_plan=pro,   label="Advanced Analytics"),
    "export_excel":          Feature(min_plan=pro,   label="Excel Export"),
    "byo_ai":                Feature(min_plan=ent,   label="Bring Your Own AI"),
    "sso": ... "scim": ... "api_access": ... "webhooks": ...
    "audit_logs": ... "custom_branding": ... "dedicated_support": ...
}

LIMITS = {          # -1 = unlimited
    free:  {"resumes": 2,  "campaigns": 2,  "members": 1,  "organizations": 1},
    plus:  {"resumes": 25, "campaigns": -1, "members": 3,  "organizations": 1},
    pro:   {"resumes": -1, "campaigns": -1, "members": 25, "organizations": 1},
    ent:   {"resumes": -1, "campaigns": -1, "members": -1, "organizations": -1},
}
```

Because `min_plan` is data, `"Upgrade to Pro"` is *derived* — never typed into a component. Adding a
feature is one registry entry; the gate, the 402 body, the lock badge and the pricing table all
follow.

### 3.2 `PlanService` returns a decision, not a boolean

This is the most important refinement to the brief. `canUseCopilot() -> bool` cannot render
"Upgrade to **Pro**", cannot render "**2 of 2** uploads used", and forces every call site to
re-derive the reason — which is exactly the `if (plan === "PRO")` the rules forbid, one layer up.

```python
@dataclass(frozen=True)
class Decision:
    allowed: bool
    reason: Literal["ok","feature_not_in_plan","limit_exceeded","plan_inactive"] | None
    feature: str | None
    required_plan: str | None    # → "Upgrade to Pro"
    limit: int | None            # → "2 of 2 used"
    used: int | None
    def raise_for_denied(self) -> None: ...   # → HTTP 402 with a machine-readable body
```

`PlanService` is constructed from the already-resolved `OrgContext` + a usage reader:

```python
svc = PlanService(ctx, usage)      # no I/O in the constructor
svc.can_use_copilot()              # Decision
svc.can_upload_resume(count=5)     # Decision — batch-aware, not one-at-a-time
svc.can_invite_member()
svc.can_export(fmt="excel")
svc.can_use_own_api_key()
```

**Methods named for the act, never for the plan.** No caller ever sees a plan string except to
display it.

### 3.3 Precedence

```
plan_status inactive/canceled  →  treat as FREE (after grace, §9.4)
       ↓
entitlement_grants (negotiated, auditable)   →  may ADD above plan
       ↓
plan catalog min_plan                        →  the ceiling
       ↓
org_feature_flags override                   →  may only SUBTRACT (ops kill-switch)
```

This is a deliberate change from today, where an `org_feature_flags` row can *add* a capability
above the paid plan (§12.9). Ops toggles and commercial grants become different mechanisms because
they have different audiences and different audit requirements.

### 3.4 Two failure codes, never one

| Situation | HTTP | Body `code` | UI |
|---|---|---|---|
| Role lacks permission | **403** | `permission_denied` | "Ask an admin" |
| Feature above plan | **402** | `feature_not_in_plan` | 🔒 "Upgrade to Pro" |
| Quota exhausted | **402** | `limit_exceeded` | "2 of 2 used · Upgrade" |
| Subscription lapsed | **402** | `plan_inactive` | "Reactivate billing" |

402 bodies carry `{code, feature, required_plan, limit, used}` so the client renders the exact
upsell without parsing prose.

---

## 4. Database changes

### 4.1 Design position on the proposed schema

The brief proposes `resume_limit`, `member_limit`, `organization_limit` as columns on
`organizations`. **Recommendation: do not.** Those are *plan-derived* values; storing them per row
means every pricing change becomes a data migration across every tenant, and rows drift out of sync
with the catalog. Limits belong in `catalog.py` (already the pattern in `plans.py`).

What *is* tenant-specific — plan, status, period, Stripe identifiers, and **negotiated overrides** —
belongs in the database. `subscriptions` already exists, is 1:1 with `organizations`, and is already
the first source in plan resolution. Extend it rather than adding a parallel set of columns to
`organizations`.

Likewise `resumes_used` as a column will drift under concurrency. `org_usage_counters` already
exists with the right unique key.

### 4.2 Proposed migrations

**`0016_subscription_billing.sql`**

```sql
alter table public.subscriptions
  add column if not exists stripe_customer_id     text,
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_price_id        text,
  add column if not exists cancel_at_period_end   boolean not null default false,
  add column if not exists trial_ends_at          timestamptz,
  add column if not exists plan_started_at        timestamptz not null default now(),
  add column if not exists plan_expires_at        timestamptz,
  add column if not exists limit_overrides        jsonb not null default '{}'::jsonb,
  add column if not exists plan_version           integer not null default 1;

create unique index if not exists idx_sub_stripe_customer
  on public.subscriptions(stripe_customer_id) where stripe_customer_id is not null;

-- status vocabulary: active | trialing | past_due | canceled | incomplete
alter table public.subscriptions
  add constraint subscriptions_status_chk
  check (status in ('active','trialing','past_due','canceled','incomplete'));
```

- `limit_overrides` covers "Enterprise, but 500 seats" without a schema change or a code branch.
- `plan_version` increments on every plan change → lets the client detect a stale cached context (§8.2).
- **RLS:** members may `select` their org's subscription; **no client-side `update`/`insert`** — only
  the service role (webhook) writes. This is the schema-level half of closing §12.1.

**`0017_usage_counters_atomic.sql`**

```sql
-- Atomic increment; replaces the read-modify-write in UsageRepository.increment.
create or replace function public.increment_usage(
  p_org uuid, p_period text, p_metric text, p_delta bigint
) returns bigint language sql security definer as $$
  insert into public.org_usage_counters (organization_id, period, metric, value)
  values (p_org, p_period, p_metric, p_delta)
  on conflict (organization_id, period, metric)
    do update set value = org_usage_counters.value + excluded.value,
                  updated_at = now()
  returning value;
$$;
```

`'lifetime'` is a valid `period` value — that is how FREE's "2 total" is counted, with no schema fork.

**`0018_candidate_uploads_org_scope.sql`**

```sql
alter table public.candidate_uploads
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade;

create index if not exists idx_candidate_uploads_org on public.candidate_uploads(organization_id);

update public.candidate_uploads u set organization_id = r.organization_id
  from public.recruiters r where r.id = u.recruiter_id and u.organization_id is null;
```

Required because the resume quota is an **org** limit while `candidate_uploads` is recruiter-scoped
today. Without this, two members of the same org get two independent quotas.

**`0019_org_ai_credentials.sql`** (BYO AI) — ⚠️ **CANCELLED, never created**

```sql
create table if not exists public.org_ai_credentials (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null,                       -- openai|anthropic|gemini|groq|azure_openai
  credential_encrypted text not null,           -- Fernet, app/integrations/crypto.py
  key_prefix text not null,                     -- display only, e.g. "sk-...4f2a"
  base_url text,                                -- Azure endpoint / proxy
  deployment text,                              -- Azure deployment name
  default_model text,
  enabled boolean not null default true,
  status text not null default 'unverified',    -- unverified|valid|invalid
  last_verified_at timestamptz,
  last_error text,
  created_by uuid references public.recruiters(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider)
);
alter table public.org_ai_credentials enable row level security;
-- select: org members with api_key.manage; the ciphertext column is NEVER selected by the API.
-- insert/update/delete: service role only (the API writes after RBAC + entitlement checks).
```

**`0020_billing_events.sql`** (webhook idempotency — non-optional)

```sql
create table if not exists public.billing_events (
  id uuid primary key default gen_random_uuid(),
  provider_event_id text not null unique,       -- Stripe evt_…; the replay guard
  type text not null,
  organization_id uuid references public.organizations(id) on delete set null,
  payload jsonb not null,
  status text not null default 'received',      -- received|processed|failed|ignored
  error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);
```

**`0021_entitlement_grants.sql`** (optional, for negotiated deals)

```sql
create table if not exists public.entitlement_grants (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  feature text not null,
  granted_by uuid references public.recruiters(id) on delete set null,
  reason text not null default '',
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, feature)
);
```

This is what keeps §3.3 honest: sales grants are separable from ops kill-switches and are auditable.

### 4.3 `organizations.plan`

Keep it as a **read-model mirror** (already written by `update_subscription`), documented as
non-authoritative. It is a dual-write hazard; the alternative — dropping it — touches
`context.py:208`'s fallback and the org read model. Recommendation: keep, add a comment, and make
the webhook the only writer of both.

---

## 5. API changes

### 5.1 Extend `GET /org/context` (no new request)

Every gated surface already consumes this. Adding entitlements here means the UI gains full gating
with **zero** new round trips:

```jsonc
{
  "organization": {...}, "role": "owner", "permissions": [...],
  "plan": { "key": "plus", "label": "Plus", "status": "active",
            "current_period_end": "...", "cancel_at_period_end": false, "version": 7 },
  "entitlements": {
    "ai_copilot":  { "enabled": false, "required_plan": "pro" },
    "export_pdf":  { "enabled": true,  "required_plan": "plus" }
  },
  "limits": {
    "resumes":   { "used": 18, "limit": 25, "period": "2026-07" },
    "members":   { "used": 2,  "limit": 3 },
    "campaigns": { "used": 4,  "limit": -1 }
  }
}
```

**Cost note:** usage counts add reads to a hot path. Fold them into the existing 4-way parallel
fan-out in `context.py` (making it 5-way, same wall-clock) or expose a single RPC returning the
counter set. Do **not** introduce a serial read — that file's comments record a ~1s regression from
exactly that mistake.

### 5.2 New endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/billing/catalog` | public | Plans, features, limits, prices — powers the pricing page |
| GET | `/billing/subscription` | member | Current subscription + usage |
| POST | `/billing/checkout-session` | `ORG_MANAGE` | Create provider checkout, return redirect URL |
| POST | `/billing/portal-session` | `ORG_MANAGE` | Customer portal (change card, cancel) |
| POST | `/billing/webhook` | **signature only** | Provider → us; the only plan writer |
| GET | `/org/ai-credentials` | `API_KEY_MANAGE` + `byo_ai` | List (prefix + status; never the secret) |
| PUT | `/org/ai-credentials/{provider}` | `API_KEY_MANAGE` + `byo_ai` | Upsert + verify |
| POST | `/org/ai-credentials/{provider}/test` | `API_KEY_MANAGE` + `byo_ai` | Probe call |
| DELETE | `/org/ai-credentials/{provider}` | `API_KEY_MANAGE` + `byo_ai` | Remove |

The webhook must be excluded from auth middleware, verify the provider signature, and be idempotent
via `billing_events.provider_event_id`.

### 5.3 Changed endpoints

- **`PATCH /org/subscription` — remove or restrict.** Today (`org.py:213`) an owner sets their own
  plan. Recommendation: delete the route; plan changes arrive only via webhook. If an internal
  override is needed, move it behind a staff-only guard in `routes/admin.py` and audit it.
- **`POST /org/members`** — add `can_invite_member()` pre-check (seat limit).
- **`POST /api/v1/batch-analysis`** — add `can_upload_resume(count=len(files))` **before** any AI
  call. Enforcing only at persist lets a FREE user burn AI budget on 200 résumés and then be told no.
- **`POST /campaigns/{id}/persist-batch`** and **`.../resume`** — enforce + increment the counter
  (the counter increments here, where a resume genuinely becomes org data).
- **`POST /campaigns`** — `can_create_campaign()`.
- **`/export-report`, `/export-match-report`** — entitlement on format (`export_pdf` / `export_excel`).
- **`/analytics/overview`** — split basic vs `advanced_analytics`.

### 5.4 Endpoints gaining `feature_gate` (plan re-tiering)

`ai_copilot`, `semantic_search`, `interview_intelligence` move from FREE-default to PRO;
`candidate_comparison` from FREE-default to PLUS. That is a `_PLAN_DEFAULTS` change plus the
grandfathering decision in §11.3.

---

## 6. Backend changes — file by file

| File | Change | Risk |
|---|---|---|
| `app/enterprise/catalog.py` | **New.** Features, min-plans, limits, plan ordering, display metadata | Low |
| `app/enterprise/entitlements.py` | **New.** `PlanService`, `Decision`, `raise_for_denied()` | Low |
| `app/enterprise/plans.py` | Re-tier enum + limits; keep `professional`/`business` as **deprecated aliases** so old rows resolve | Med — plan strings are persisted |
| `app/enterprise/feature_flags.py` | Defaults derive from `catalog.min_plan`; overrides become subtract-only | **High — changes what existing orgs can do** |
| `app/enterprise/context.py` | Add usage counters to the fan-out; expose `plan_status`, `plan_version` | Med — hot path |
| `app/enterprise/deps.py` | Add `require_entitlement(feature)` and `require_quota(metric, n)`; keep `feature_gate` as an alias during migration | Low |
| `app/enterprise/repositories.py` | `increment()` → atomic RPC; add `UsageRepository.get_many()`; subscription writes move to the billing service | Med |
| `app/billing/` | **New package** — `service.py`, `webhook.py`, `provider_stripe.py`, `state.py` | Med |
| `app/routes/billing.py` | **New** — §5.2 | Low |
| `app/routes/org.py` | Remove self-serve plan setter; add AI-credential routes | Low |
| `app/routes/batch.py`, `campaigns.py`, `export.py`, `analytics.py` | Enforcement + counter increments | **High — user-facing blocking** |
| `app/ai/gateway/credentials.py` | **New** — tenant credential resolution (§7) | Med |
| `app/ai/providers/*` | Accept an injected credential instead of reading `settings` at construction | **High — touches every provider** |

---

## 7. AI Gateway changes (BYO AI) — ⚠️ CANCELLED 6 Aug 2026, do not implement

### 7.1 Resolution rule

```
resolve_credential(provider, org_id):
    if org entitled to "byo_ai"
       and org_ai_credentials[provider] exists, enabled, status != 'invalid':
           return TenantCredential(source="org", org_id=..., secret=decrypt(...))
    return ManagedCredential(source="managed", secret=settings.<PROVIDER>_API_KEY)
```

### 7.2 Three structural changes required

**a) Providers must stop being process-wide singletons.**
`registry.get_provider(name)` caches one instance per name, and providers hold a class-level client
built from `settings`. Change to a credential-aware cache:

```python
get_provider(name, credential) -> LLMProvider     # cache key: (name, credential.fingerprint)
```

with a bounded LRU (an unbounded dict keyed by tenant is a slow memory leak) and no class-level
client state. This is the single largest code change in the program and it touches every provider
class.

**b) Health must be isolated per credential scope.**
`health_manager` is keyed by provider name. Today, one enterprise customer pasting an expired
OpenAI key would mark `openai` unhealthy **globally** and push every other tenant onto the fallback
chain. Health keys become `(provider, credential_scope)` where scope is `managed` or `org:<id>`.

**c) Threading the tenant through.**
`orchestrator.run()` has no tenant parameter; `current_org_id` (a contextvar) already exists and is
how usage rollup works. Recommendation: **explicit optional parameter with contextvar fallback** —
`run(..., tenant: TenantRef | None = None)`. Implicit-only resolution means a background job or a
thread-pool branch silently bills the wrong tenant, and `context.py` already documents a
contextvar-in-threadpool bug from this exact family.

### 7.3 Policy decisions

- **No silent fallback from a tenant key to the managed key.** If a customer's key fails, falling
  back means Hirevo pays for enterprise traffic and hides the misconfiguration. Default:
  fail with a clear "your OpenAI key was rejected" error. Make it an org setting
  (`byo_fallback_to_managed`, default `false`) if a customer asks.
- **Usage attribution.** Record `credential_source` on every usage row so customer-funded tokens
  are excluded from Hirevo COGS while still showing in the customer's own usage view.
- **Secrets.** Reuse `app/integrations/crypto.py`. Never log, never return, never audit-log the
  secret — audit the *act* (`ai_credential.updated`, provider + prefix only). Verify on save with a
  cheap probe so an invalid key is caught in Settings, not mid-analysis.
- **Azure OpenAI** needs `base_url` + `deployment`, which no current provider models — it is a new
  provider class, not a key swap.

---

## 8. Auth implications

1. **Entitlement is org-scoped, not user-scoped.** It rides `OrgContext`, which is deliberately
   uncached so revocation is immediate. Adding usage reads to that path must not break that property
   (§5.1).
2. **Cache invalidation after upgrade.** The client caches `['hl','settings','org-context']`.
   On checkout return, invalidate and refetch with backoff until `plan.version` changes — the
   webhook may land after the browser redirect. Include `plan_version` in 402 bodies so a stale
   client can self-heal.
3. **Grace and lapse.** `past_due` must not instantly delete access. Proposed state machine:
   `active → past_due` (full access, banner, 7-day grace) `→ canceled` (read-only FREE, data
   retained). Write it down; it is a support-load decision as much as a technical one.
4. **Seat enforcement on invite** (`add_member_by_email`) is currently absent — a FREE org can invite
   unlimited members today.
5. **ENTERPRISE "unlimited organizations" is a real architectural gap.** `organization_members`
   already supports many orgs per user, but `resolve_org_context` resolves exactly one via
   `recruiters.organization_id`. Multi-org membership + an org switcher is a **separate workstream**,
   not a line item — it changes context resolution, the shell, and every org-scoped query's
   assumptions. Recommend scoping it out of v1 and selling ENTERPRISE on the other capabilities.
6. **SSO/SCIM** are Supabase-level concerns (`signInWithSSO` is already called in `login-form.tsx`)
   and land in the auth layer, not the entitlement layer. Entitlement only decides whether the
   *configuration UI* is available.

---

## 9. Upgrade flow

### 9.1 Locked, never hidden

Three lock surfaces, chosen by what is being locked:

| Surface | Use | Component |
|---|---|---|
| **Inline lock** | A single control (Compare, Export) | `<LockedButton feature>` — disabled + 🔒 + tooltip "Compare candidates is on Plus" |
| **Section overlay** | A panel inside a working screen | Blurred static preview + centered `GateState reason="plan"` |
| **Route gate** | A whole screen (Ask, Analytics) | `usePlanGate(feature)` → full `GateState` + Upgrade CTA |

Nav entries for locked destinations stay visible with a lock affordance. That is a deliberate
reversal of the current `nav-config.ts` rule (which hides a nav item when the destination can only
render a gate) — correct for *permissions*, wrong for *plans*: a hidden feature sells nothing.
The distinction is explicit — hide on `perm`, show-locked on `entitlement`.

### 9.2 Quota exhaustion is a different surface

Not "you can't", but "you've used it all":
- **< 80%** — silent.
- **≥ 80%** — meter in the upload dialog: "18 of 25 résumés used this month".
- **At limit** — upload input disabled *before* file selection, with "2 of 2 free résumés used" and
  Upgrade. Never accept files and fail after the spinner.
- **Batch overflow** — selecting 10 with 3 remaining offers "analyze the first 3" or "upgrade",
  rather than rejecting the whole batch.

### 9.3 The FREE upload wall (the brief's headline requirement)

Enforced in three places, and all three are needed:
1. **Client pre-flight** (`AddCandidatesDialog`, inbox upload) — reads `limits.resumes` from context;
   blocks selection, renders the upgrade screen.
2. **Pre-AI server check** in `/batch-analysis` — 402 before any token is spent.
3. **Counter increment** at persist — the moment a résumé becomes org data.

### 9.4 Checkout sequence

```
Locked surface → /pricing?feature=ai_copilot&plan=pro
  → POST /billing/checkout-session → provider hosted checkout
  → return to /settings/billing?status=success  (optimistic "Activating…")
  → webhook → subscriptions updated → plan_version++
  → client refetch (backoff) → entitlements flip → banner "You're on Pro"
```

The success page must tolerate webhook lag — never write plan state from the browser redirect.

---

## 10. Frontend changes

| Area | Change |
|---|---|
| `lib/entitlements/catalog.ts` | **New.** Mirrors the backend catalog (same discipline as `permissions.ts` mirroring `rbac.py`) |
| `lib/entitlements/use-entitlement.ts` | **New.** `useEntitlement(feature)` → `{allowed, requiredPlan, loading, error}`; `useQuota(metric)`; `usePlanGate(feature)` with the same 4-state discipline as `usePermissionGate` |
| `components/hirelens/billing/` | **New.** `<FeatureLock>`, `<LockedButton>`, `<QuotaMeter>`, `<UpgradeDialog>`, `<PlanBadge>` |
| `states/gate-state.tsx` | Extend: accept `requiredPlan`, render the derived CTA (already has the `plan` branch) |
| `settings/sections/billing-section.tsx` | Rewrite: plan cards, usage meters, manage-subscription; **remove the self-serve plan `<select>`** |
| `settings/sections/ai-credentials-section.tsx` | **New.** Enterprise-only BYO AI |
| `workspace/add-candidates-dialog.tsx` | Quota pre-flight + upgrade screen |
| `inbox/inbox-header.tsx`, `workspace/*` | Lock Compare / Export / Interview controls |
| `ask/ask-screen.tsx`, `analytics/analytics-screen.tsx`, `talent/talent-screen.tsx` | Route-level plan gates |
| `shell/nav-config.ts` | Add `entitlement?` — show-locked (distinct from `perm`, which hides) |
| `lib/api-error.ts` | Parse 402 bodies into a typed `PlanError` and route to the upgrade dialog |
| `types/org.ts` | Extend `OrgContext` |
| `(marketing)` pricing frame | Regenerate from the catalog |

---

## 11. Migration strategy

### 11.1 Phases

| Phase | Content | Reversible? |
|---|---|---|
| **0 · Catalog** | `catalog.py` + `PlanService` + mirrors. Nothing enforces. Extend `/org/context`. | Yes |
| **1 · Shadow** | Enforcement code paths run and **log** "would have blocked", never block. Run ≥1 week and read the logs. | Yes |
| **2 · Surface** | Locks + meters visible; server still permissive. Users see the future state. | Yes |
| **3 · Enforce** | Flip the shadow switch per capability, not all at once. Upload wall first. | Config flag |
| **4 · Payments** | Stripe, webhooks, checkout, portal. | Additive |
| **5 · BYO AI** | Credential store, provider refactor, health isolation. | Additive |

Phase 1 is not optional. Quota logic that miscounts and blocks *paying* customers is a worse
failure than shipping late, and shadow mode is the only way to measure that before it hurts.

### 11.2 Data migration

- Remap plan strings `professional→plus`, `business→pro` in `subscriptions` and `organizations`;
  keep the old values as deprecated aliases in `_plan()` so any straggler resolves instead of
  silently falling back to FREE. **Check the live distribution first** — the count of non-free orgs
  determines whether this is a footnote or a project.
- Backfill `candidate_uploads.organization_id`.
- Seed lifetime resume counters from `candidate_uploads`.

### 11.3 Two grandfathering decisions (your call — both are commercial, not technical)

1. **Existing FREE orgs will lose Copilot, Comparison and Semantic Search** the moment
   `_PLAN_DEFAULTS` changes, because FREE grants all three today. The override mechanism already
   solves this elegantly: one `entitlement_grants` row per existing org preserves current access
   while new signups get the new defaults.
2. **Existing FREE orgs are already over a 2-résumé limit.** Options: (a) enforce only for orgs
   created after the launch date, (b) grandfather current usage as the starting floor (they keep
   what they have, upload nothing new), (c) enforce immediately. (b) is the honest default; (c)
   will generate support tickets from people who did nothing wrong.

---

## 12. Risks

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| 1 | **`PATCH /org/subscription` lets any owner self-upgrade to enterprise, free.** Live today. | **Critical** | Remove the route; RLS denies client writes to `subscriptions`; webhook-only writes |
| 2 | **`UsageRepository.increment` is read-modify-write** — concurrent uploads undercount, letting users past the quota | **High** | Atomic RPC (§4.2); the batch path is inherently concurrent |
| 3 | Client gates are not enforcement | High | Every gate has a server counterpart; the codebase already states this contract — preserve the wording |
| 4 | Existing free orgs silently lose features | High | §11.3 grandfathering, decided before deploy |
| 5 | Existing free orgs instantly over quota | High | §11.3 option (b) |
| 6 | **BYO key poisons global provider health** | High | Health keyed by `(provider, scope)` (§7.2b) |
| 7 | Provider singletons + class-level clients make per-tenant keys impossible without refactor | High | §7.2a; largest code change; do it behind tests |
| 8 | Webhook replay / out-of-order events → wrong plan | High | `billing_events` idempotency + ignore events older than the stored period |
| 9 | **Additive feature-flag overrides already bypass the plan** | Med | Overrides become subtract-only; grants become a separate audited table (§3.3) |
| 10 | `/org/context` grows on a hot, deliberately-uncached path | Med | Fold counters into the existing parallel fan-out; never serialize |
| 11 | 402 unhandled by existing clients | Med | `api-error.ts` typed handling before enforcement flips on |
| 12 | Enterprise "unlimited orgs" implies multi-org switching that does not exist | Med | Scope out of v1 (§8.5) or fund it as its own workstream |
| 13 | Marketing pricing contradicts the catalog | Med | Generate the pricing page from `/billing/catalog` |
| 14 | Plan/permission confusion in copy ("upgrade" shown to a paying admin) | Med | Two codes, two components, never a shared "denied" state |
| 15 | Secrets in logs / audit / error bodies | Med | Prefix-only display; scrub in the provider error path |
| 16 | Free tier abuse via multiple orgs | Low | Org creation is trigger-provisioned per user today (§9.3 note); revisit with signup |

---

## 13. Recommended implementation order

Each step lands independently and is verifiable on its own.

| # | Step | Why here | Done when |
|---|---|---|---|
| **1** | **Close the self-upgrade hole** — remove `PATCH /org/subscription`, RLS on `subscriptions` | It is a live revenue hole; independent of everything else | Owner cannot change their own plan; audited attempt logged |
| **2** | Atomic usage counter RPC + repository swap | Every quota depends on a counter that currently races | Concurrent-increment test passes |
| **3** | `catalog.py` + TS mirror + `PlanService`/`Decision` | Pure additions, no behavior change | Unit tests over the full matrix; parity test backend↔frontend catalogs |
| **4** | Migrations 0016–0018 (+0021), backfills | Schema before the code that reads it | Migrations apply clean; backfill counts reconcile |
| **5** | Extend `/org/context` with entitlements + limits | Unblocks all UI work; still nothing enforced | Fan-out stays parallel; latency unchanged within noise |
| **6** | Shadow enforcement (`require_entitlement`/`require_quota` in log-only mode) | Measures real impact before blocking anyone | ≥1 week of logs; blocked-would-be rate understood |
| **7** | Frontend lock surfaces + quota meters + upload pre-flight | Users see the future state before it bites | Every locked feature visible with a derived "Upgrade to X" |
| **8** | Flip enforcement per capability — **upload wall first** | The headline requirement, and the easiest to reason about | FREE stops at 2; 402 body renders the upgrade screen |
| **9** | Billing provider: catalog, checkout, portal, webhook, `billing_events` | Only meaningful once gates are real | Test-mode upgrade flips entitlements end-to-end, replay-safe |
| **10** | BYO AI: credential store, provider credential injection, health isolation | Largest refactor; benefits only ENTERPRISE | Org key used when present; managed key otherwise; a bad tenant key cannot affect other tenants |
| **11** | Pricing page generated from `/billing/catalog` | Explicitly out of scope here; the architecture supports it | Marketing tiers match the enforced catalog by construction |

Steps 1 and 2 are worth doing **regardless** of whether the rest of this plan is approved — they are
defects in shipped code, not features.

---

## Appendix A — Decisions needed before implementation

1. PLUS 25 résumés — **monthly or lifetime?** (§2)
2. Campaign ("roles") limits for PLUS/PRO — unlimited? (§2)
3. Where do `executive_reports` and `autonomous_agent` sit in the new matrix? (§2)
4. Grandfathering: existing FREE orgs' Copilot/Comparison/Search access (§11.3.1)
5. Grandfathering: existing FREE orgs already over 2 résumés (§11.3.2)
6. Is multi-org switching in scope for ENTERPRISE v1, or sold on other capabilities? (§8.5)
7. Payment provider — Stripe assumed throughout; confirm.
8. Grace period on `past_due` before downgrade (7 days proposed) (§8.3)
9. Should a failed tenant BYO key fall back to the managed key? (default: no) (§7.3)
