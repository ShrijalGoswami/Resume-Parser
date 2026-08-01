# Monetization — Phase 1 Implementation Plan

**Status:** awaiting approval · no code written
**Date:** 31 Jul 2026
**Scope:** database · backend enforcement · feature gating
**Out of scope:** frontend experience (Phase 2), billing/Stripe (Phase 3), BYO AI (Phase 4)
**Companion:** `docs/MONETIZATION_ARCHITECTURE.md`

---

## 0. Locked decisions

| # | Decision |
|---|---|
| 1 | PLUS = **25 resume credits per billing cycle (monthly)**. FREE = 2 **lifetime**. |
| 2 | **All existing organizations are grandfathered.** Only FREE orgs created *after* the release get the new FREE limits. |
| 3 | `PATCH /org/subscription` never lets a normal user change their own plan. Plan changes come from billing, admin action, or system automation only. |
| 4 | Limits live in a central catalog, never as per-org columns. Overrides only where genuinely needed. |
| 5 | `PlanService` returns a structured `Decision` (allowed · reason · current plan · required plan · usage · upgrade target) that drives both server enforcement and client messaging. |
| 6 | Resume usage must be concurrency-safe **before** any quota is enforced. |
| 7 | ENTERPRISE V1 = one organization. Multi-org is a later phase. |
| 8 | BYO AI never silently falls back to the managed key — surface a configuration error. |
| 9 | Plan matrix as specified in §1.2. |

### 0.1 How grandfathering is implemented — `plan_ruleset`

Decision 2 says existing orgs keep everything and only *new* FREE orgs get the new rules. The
cheapest correct way to express that is **one column, not N grant rows**:

```
subscriptions.plan_ruleset  text not null default 'v1'    -- existing rows backfilled to 'legacy'
```

- `legacy` → resolves against the current capability set, **no limits enforced** (today's behaviour, exactly).
- `v1` → resolves against the new catalog in §1.2.

New organizations get `v1` from the column default; the auto-provision trigger needs no change.
This makes the grandfather story a single auditable branch that can be inspected, tested, and
reversed per-org by flipping one value — rather than a scattered set of grant rows whose absence is
indistinguishable from a bug. `entitlement_grants` still lands, but for its real purpose: negotiated
one-off deals ("Enterprise, plus X").

**Consequence to accept:** the legacy capability set must be kept in the catalog as a frozen ruleset
for as long as legacy orgs exist. That is the honest cost of promising no one loses access.

### 0.2 Enforcement posture at the end of Phase 1

Phase 1 ships enforcement **in shadow mode** (`ENTITLEMENT_ENFORCEMENT=shadow`, the default): every
gate evaluates, logs what it *would* have blocked, and allows the request. Nothing blocks a real
user until Phase 2 ships the UI that can render a 402.

This is deliberate. A 402 with no upgrade surface is a generic error toast — the user is stopped
with no explanation and no route forward, which is worse than no gate. Shadow mode also produces
the data that says whether the limits are set correctly *before* they can hurt anyone.

The flag is per-environment, so staging can run `on` for verification while production stays
`shadow`.

---

## 1. Target state after Phase 1

### 1.1 What is true when Phase 1 is done

- Plan definitions live in one catalog module; nothing reads a plan string to make a decision.
- `PlanService` answers every entitlement question with a `Decision`.
- Every monetized endpoint carries a gate that evaluates correctly and logs its verdict.
- Resume usage is counted atomically, org-scoped, and dedupe-aware.
- `GET /org/context` returns entitlements, limits and usage — Phase 2 needs no new endpoint.
- No user's behaviour has changed. Nothing blocks. Nothing is hidden.
- The self-upgrade hole is closed.

### 1.2 Plan matrix (catalog source of truth)

| | FREE | PLUS | PRO | ENTERPRISE |
|---|---|---|---|---|
| Resume credits | **2 lifetime** | **25 / month** | unlimited | unlimited |
| Team members | 1 | 3 | 25 | unlimited |
| Organizations | 1 | 1 | 1 | 1 *(V1 — decision 7)* |
| Campaigns ("roles") | 2 | unlimited | unlimited | unlimited |
| Resume Parser · ATS Score · Basic AI Summary | ✓ | ✓ | ✓ | ✓ |
| Full Resume Analysis | — | ✓ | ✓ | ✓ |
| Candidate Comparison | — | ✓ | ✓ | ✓ |
| PDF Export | — | ✓ | ✓ | ✓ |
| AI Copilot | — | — | ✓ | ✓ |
| Semantic Search | — | — | ✓ | ✓ |
| Interview Intelligence | — | — | ✓ | ✓ |
| Advanced Analytics | — | — | ✓ | ✓ |
| Excel Export | — | — | ✓ | ✓ |
| BYO AI · API Access · SSO · Audit Logs · Dedicated Support | — | — | — | ✓ |

Two existing capabilities are not named in your matrix. Proceeding with these placements — say the
word and they move:

- `executive_reports` → **PRO** (it is the Advanced Analytics family)
- `autonomous_agent` → **PRO**

---

## 2. Migrations

All additive. Each is independently applicable and re-runnable (`if not exists` / idempotent
backfills). Numbering continues from `0015_decision_ledger_immutability.sql`.

### `0016_subscription_plan_state.sql`

```sql
alter table public.subscriptions
  add column if not exists plan_ruleset           text not null default 'v1',
  add column if not exists plan_status            text,          -- mirrors status, explicit vocabulary
  add column if not exists plan_started_at        timestamptz not null default now(),
  add column if not exists plan_expires_at        timestamptz,
  add column if not exists cancel_at_period_end   boolean not null default false,
  add column if not exists trial_ends_at          timestamptz,
  add column if not exists limit_overrides        jsonb not null default '{}'::jsonb,
  add column if not exists plan_version           integer not null default 1,
  add column if not exists stripe_customer_id     text,
  add column if not exists stripe_subscription_id text;

-- Grandfather every organization that exists at release time (decision 2).
update public.subscriptions set plan_ruleset = 'legacy' where created_at < now();

-- Orgs with no subscription row yet are also pre-existing → give them a legacy row.
insert into public.subscriptions (organization_id, plan, status, plan_ruleset)
select o.id, coalesce(o.plan,'free'), 'active', 'legacy'
from public.organizations o
left join public.subscriptions s on s.organization_id = o.id
where s.id is null;

alter table public.subscriptions
  add constraint subscriptions_ruleset_chk check (plan_ruleset in ('legacy','v1'));

-- Plan is server-authoritative: no client-role writes. (Decision 3, schema half.)
revoke insert, update, delete on public.subscriptions from authenticated, anon;
```

Stripe columns land now, unused, purely so Phase 3 needs no migration on the hot table.
`plan_version` increments on every plan change and lets a stale client detect it must refetch.

### `0017_usage_counters_atomic.sql`

```sql
create or replace function public.increment_usage(
  p_org uuid, p_period text, p_metric text, p_delta bigint
) returns bigint language sql security definer as $$
  insert into public.org_usage_counters (organization_id, period, metric, value)
  values (p_org, p_period, p_metric, p_delta)
  on conflict (organization_id, period, metric)
    do update set value = org_usage_counters.value + excluded.value, updated_at = now()
  returning value;
$$;
revoke all on function public.increment_usage(uuid,text,text,bigint) from public, anon, authenticated;
```

Replaces the read-modify-write in `UsageRepository.increment` (decision 6). `'lifetime'` is a valid
`period` value — that is how FREE's 2 credits are counted, with no schema fork.

### `0018_org_scope_usage_sources.sql`

```sql
alter table public.candidate_uploads
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade;
alter table public.campaigns
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade;

create index if not exists idx_candidate_uploads_org on public.candidate_uploads(organization_id);
create index if not exists idx_campaigns_org        on public.campaigns(organization_id);

update public.candidate_uploads u set organization_id = r.organization_id
  from public.recruiters r where r.id = u.recruiter_id and u.organization_id is null;
update public.campaigns c set organization_id = r.organization_id
  from public.recruiters r where r.id = c.recruiter_id and c.organization_id is null;
```

Both tables are recruiter-scoped today, but the résumé and campaign limits are **org** limits.
Without this, two members of one org get two independent quotas.

### `0019_entitlement_grants.sql`

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
alter table public.entitlement_grants enable row level security;
-- select: org members. insert/update/delete: service role only.
```

### `0020_usage_backfill.sql`

```sql
-- Seed lifetime résumé counters from the real upload history so the counter is
-- truthful from day one (it is displayed in Phase 2 even for legacy orgs).
insert into public.org_usage_counters (organization_id, period, metric, value)
select organization_id, 'lifetime', 'resumes', count(*)
from public.candidate_uploads where organization_id is not null
group by organization_id
on conflict (organization_id, period, metric) do update set value = excluded.value;
```

**Deferred to their own phases:** `org_ai_credentials` (Phase 4), `billing_events` (Phase 3).

---

## 3. Backend files

### 3.1 New

| File | Contents |
|---|---|
| `app/enterprise/catalog.py` | `PlanKey` (free/plus/pro/enterprise), `PLAN_ORDER`, slug aliases (`professional→plus`, `business→pro`), `FEATURES` (key → label, min_plan), `LIMITS` per plan, `RESUME_WINDOW` per plan (`lifetime`/`month`), and the frozen `legacy` ruleset. Pure data + lookups, no I/O. |
| `app/enterprise/entitlements.py` | `Decision` dataclass, `PlanError` (→402), `PlanService` with act-named methods: `can_upload_resume(count)`, `can_use_copilot()`, `can_use_semantic_search()`, `can_use_interview_ai()`, `can_compare_candidates()`, `can_invite_member()`, `can_create_campaign()`, `can_export(fmt)`, `can_use_own_api_key()`, `can_use_advanced_analytics()`. |
| `app/enterprise/usage.py` | `UsageReader` — batched counter reads (`resumes` lifetime + current month, member/campaign counts) in one round trip. |
| `scripts/set_org_plan.py` | Service-role plan setter + audit row. The Phase-1 answer to "admin actions" (see §5.2). |

### 3.2 Modified

| File | Change | Risk |
|---|---|---|
| `app/enterprise/plans.py` | Becomes a thin shim over `catalog.py` (keeps `limits_for` for `repositories.update_subscription` and `OrgContext.limits()`); old slugs resolve via aliases instead of silently degrading to free | Med — plan strings are persisted |
| `app/enterprise/feature_flags.py` | `_PLAN_DEFAULTS` derived from the catalog; org overrides become **subtract-only**; ruleset-aware | **High — defines who keeps what** |
| `app/enterprise/context.py` | Add `plan_ruleset`, `plan_status`, `plan_version`, grants + usage to the resolution; new branches join the **existing parallel fan-out** (4→6), never serialized | **High — hot path** |
| `app/enterprise/deps.py` | Add `require_entitlement(feature)` and `require_quota(metric, n)`; keep `feature_gate()` as a deprecated alias so the 7 existing call sites keep working during migration | Low |
| `app/enterprise/repositories.py` | `UsageRepository.increment` → `increment_usage` RPC; add `increment_many`; `OrgRepository.update_subscription` moves behind the service-role path | Med |
| `app/enterprise/schemas.py` | `OrgContextResponse` gains `entitlements`, `limits`, `plan` block; `Subscription` gains the new fields | Low |
| `app/routes/org.py` | **Remove** `PATCH /org/subscription`; extend `GET /org/context` | Low |
| `app/routes/batch.py` | `can_upload_resume(len(files))` **before** any AI call | Med |
| `app/routes/campaigns.py` | Quota + counter on `persist-batch` and `.../resume`; `can_create_campaign()` on create; migrate the two existing `feature_gate`s | Med |
| `app/routes/export.py` | `can_export("pdf"/"excel")` | Low |
| `app/routes/analytics.py` | Split basic vs `advanced_analytics` | Low |
| `app/routes/copilot.py`, `search.py`, `reports.py`, `agent.py`, `main.py` | Migrate existing `feature_gate` → `require_entitlement` | Low |
| `app/core/config.py` | `ENTITLEMENT_ENFORCEMENT: str = "shadow"` (`off`/`shadow`/`on`), `MONETIZATION_RELEASE_AT` | Low |
| `app/main.py` | Exception handler: `PlanError` → 402 with the structured body | Low |
| `app/services/persistence_service.py` | Count only genuinely new `candidate_uploads` rows (dedupe must not consume credits) | Med |

### 3.3 The 402 contract

```jsonc
{
  "detail": "AI Copilot is available on the Pro plan.",
  "code": "feature_not_in_plan",        // | limit_exceeded | plan_inactive
  "feature": "ai_copilot",
  "current_plan": "plus",
  "required_plan": "pro",
  "upgrade_target": "pro",
  "limit": null, "used": null,
  "plan_version": 7
}
```

403 remains exclusively "your role may not"; 402 exclusively "your plan does not". Never one code
for both.

---

## 4. Frontend files touched in Phase 1

The Phase 2 experience is **not** built here. These three are the minimum required to keep the app
coherent while the backend changes land:

| File | Change | Why unavoidable |
|---|---|---|
| `components/hirelens/settings/sections/billing-section.tsx` | Remove the plan `<select>` + save button; render the plan read-only with a "managed by billing" note | It calls `PATCH /org/subscription`, which is being deleted — leaving it would 404 on click |
| `types/org.ts` | Extend `OrgContext` with `plan`, `entitlements`, `limits` | Response shape changes; TS must match |
| `lib/api-error.ts` | Recognise 402 and surface its `detail` (typed `PlanError` shape, no UI yet) | Otherwise a shadow-mode misconfiguration would surface as a raw unhandled error |

`components/hirelens/lib/api/settings.ts` also loses its `useUpdateSubscription` mutation.

Everything else — locks, meters, upgrade dialogs, nav changes, pricing page — is Phase 2.

---

## 5. API changes

### 5.1 Extended: `GET /org/context`

Adds `plan` (key, label, status, ruleset, version, period_end), `entitlements`
(`{feature: {enabled, required_plan}}`), and `limits`
(`{resumes: {used, limit, window, period}, members: {...}, campaigns: {...}}`).
Additive only — existing consumers keep working.

### 5.2 Removed: `PATCH /org/subscription`

Decision 3. Replacement paths:

- **Now (Phase 1):** `scripts/set_org_plan.py` — service-role, writes `subscriptions` + an
  `audit_logs` row. There is currently **no staff/superuser guard anywhere in the codebase**
  (`routes/admin.py` is AI-gateway routes behind ordinary org permissions), so inventing an HTTP
  admin surface here would mean inventing a staff auth model as a side effect of a billing change.
  A service-role script is the smaller, safer Phase-1 answer.
- **Phase 3:** the billing webhook becomes the only automated writer.

If you want an HTTP admin path in Phase 1 instead, the minimal version is a shared-secret header
(`HL_ADMIN_TOKEN`) on an internal route — say so and I will include it.

### 5.3 New status code

402 on monetized endpoints, currently unused by the API. Wired into `api-error.ts` in the same phase
so it can never surface as an unhandled error.

---

## 6. Tests

Extending the existing suites rather than inventing patterns — this codebase already inspects the
**live dependency graph** (`test_feature_flag_enforcement.py`) and runs real-infrastructure checks
behind preflight guards (`_authz_helpers.py`), which is exactly the right shape for gate coverage.

### 6.1 New

| File | Asserts |
|---|---|
| `tests/test_plan_catalog.py` | Every feature has a `min_plan`; plan monotonicity (each tier ⊇ the one below); alias resolution (`professional→plus`, `business→pro`); unknown slug → free, never a crash; the `legacy` ruleset matches today's live behaviour exactly |
| `tests/test_entitlements.py` | Full plan × feature × ruleset matrix; `Decision` field correctness (`required_plan`, `used`, `limit`); quota arithmetic at boundary (1 left, exactly 0 left, batch of 5 with 3 left); `plan_status` lapse → FREE; grants add, flags only subtract |
| `tests/test_entitlement_enforcement.py` | Live-graph walk: every endpoint in the monetized set carries a gate; no monetized endpoint is reachable ungated; 403 vs 402 never confused |
| `tests/test_usage_counters.py` | N concurrent increments = N (the decision-6 proof); dedupe (same file hash twice) consumes one credit; lifetime and monthly written together; month rollover |
| `tests/test_grandfathering.py` | A `legacy` org is unaffected by every new limit and keeps every previously-available feature; a `v1` FREE org gets the new matrix; the backfill assigns the ruleset correctly |

### 6.2 Extended

| File | Addition |
|---|---|
| `tests/test_feature_flag_enforcement.py` | Extend to the full catalog; assert an org override cannot *add* a capability above plan |
| `tests/test_org_context_fanout.py` | Fan-out stays parallel at 6 branches; per-branch failure attribution preserved; no added serial read |
| `tests/test_rbac_enforcement.py` | `PATCH /org/subscription` is gone; RBAC unchanged elsewhere |
| `tests/test_upload_concurrency.py` | Concurrent uploads consume credits exactly once |
| `tests/test_tenant_isolation.py` | One org's counters and grants are invisible and unwritable from another |

### 6.3 Runtime verification (not just tests)

Per the project's static-vs-runtime rule, each gate below is exercised against the **running**
backend with a real token, and the response recorded:

- `PATCH /org/subscription` → 404/405
- FREE `v1` org, 3rd résumé, `ENTITLEMENT_ENFORCEMENT=on` → 402 with the full body
- Same org under `shadow` → 200 **plus** an `entitlement.shadow_block` log line
- `legacy` org, same requests → 200, no shadow line
- `/org/context` → entitlements + limits present; fan-out timing unchanged within noise

---

## 7. Rollout order

Each step is independently shippable and independently revertable. Steps 1 and 2 are defect fixes
and are worth landing even if the rest slips.

| Step | Work | Gate before proceeding |
|---|---|---|
| **1.0** | **Pre-flight (read-only):** plan distribution, org count, résumés-per-org and members-per-org distributions | Numbers in hand; grandfather blast radius known |
| **1.1** | Close the self-upgrade hole: remove route, revoke client writes, billing-section read-only, `set_org_plan.py` | `PATCH` returns 404; RBAC suite green; Settings renders without the select |
| **1.2** | Atomic counters: `0017` + repository swap | Concurrency test proves N increments = N |
| **1.3** | `catalog.py` + shim in `plans.py` (pure addition, nothing reads it yet) | Catalog suite green; existing suites unchanged |
| **1.4** | Migrations `0016`/`0018`/`0019`/`0020` + backfills | Migrations idempotent on re-run; backfill counts reconcile against source tables |
| **1.5** | `PlanService` + `Decision` + `PlanError`→402 handler | Entitlement matrix suite green; no route uses it yet |
| **1.6** | Ruleset-aware feature flags + grandfathering | Grandfathering suite green; a legacy org's resolved features are byte-identical to pre-change |
| **1.7** | Usage metering on the résumé path (org-scoped, dedupe-aware) | Counters move only on genuinely new uploads |
| **1.8** | `require_entitlement` / `require_quota` wired to every monetized endpoint, **shadow mode** | Live-graph test proves full coverage; shadow logs appear; **no user is blocked** |
| **1.9** | `/org/context` extension | Contract matches what Phase 2 needs; fan-out still parallel |
| **1.10** | Phase 1 acceptance: full backend + frontend suites, runtime matrix, shadow-log review | See §8 |

---

## 8. Definition of done

1. Full backend suite green; frontend suite (135 tests) still green.
2. Runtime matrix in §6.3 executed against the running server, outputs recorded.
3. **Zero behaviour change for every existing user** — the central invariant. Shadow logs show what
   *would* block; nothing does.
4. Shadow logs reviewed against the §1.2 matrix; limits confirmed sane before Phase 2 makes them visible.
5. `PATCH /org/subscription` gone; no client-role write path to `subscriptions` remains.
6. Every migration verified idempotent and reversible; each backfill reconciled against its source.

---

## 9. Rollback

| Failure | Rollback |
|---|---|
| Gate misfires in shadow | `ENTITLEMENT_ENFORCEMENT=off` — one env var, no deploy |
| Counter drift | Re-run `0020` backfill (it is an upsert-recompute) |
| Grandfathering wrong for an org | Flip that row's `plan_ruleset` to `legacy` |
| Catalog wrong | Data-only edit in `catalog.py`, no schema change |
| Migration problem | All additive: columns/tables are nullable or defaulted; drop-column reverses cleanly |

---

## 10. Open items (non-blocking; defaults stated)

1. `executive_reports` → PRO, `autonomous_agent` → PRO (§1.2). Say if either moves.
2. Grace period on a lapsed subscription before it resolves to FREE — **7 days** proposed. Matters
   in Phase 3, not Phase 1.
3. HTTP admin plan-change route in Phase 1, or service-role script only (§5.2). **Script proposed.**

---

**On approval I will begin at step 1.0 and land steps in the order above, reporting at each gate.**
