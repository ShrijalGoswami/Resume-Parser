# HireLens Monetization Handoff — Phases 1, 2 and 2.5 Complete

**Written:** 1 Aug 2026 · supersedes the 28–29 Jul handoff entirely
(that version is recoverable at `git show 6ba960a:docs/HANDOFF.md`)

This file is written to be read **alone**. Nothing below depends on chat history.

> ## READ THIS FIRST
>
> **Implementation of the monetization system is finished. Validation is not.**
>
> | | |
> |---|---|
> | Phase 1 — backend enforcement | ✅ complete, approved, audited |
> | Phase 2 — frontend experience (2.1–2.5) | ✅ complete, approved |
> | RC checklist | ✅ written — `docs/RELEASE_CANDIDATE_CHECKLIST.md` |
> | Phase 3 — payments | ⛔ **deliberately not started** |
>
> **Nothing in Phase 2 has ever been seen in a browser.** Not one lock, not the
> résumé wall, not the quota meter, not the upgrade dialog. Every claim about
> the rendered product rests on unit tests against a mocked `/org/context`.
>
> **The next engineering milestone is executing
> `docs/RELEASE_CANDIDATE_CHECKLIST.md`** — not writing more code. Do not start
> Phase 3, do not extend the monetization system, do not "just add" a pricing
> page. §12 of this file explains why, and what the milestone actually is.
>
> Sections 1–10 describe Phase 1 and remain accurate. Section 12 is the current
> state and the only part that changes week to week.

---

## 0. How to get running

Two servers. Both must be up or the app looks broken in confusing ways.

```bash
# Frontend
cd resume-hero-section && npx next dev            # :3000

# Backend  ← forgetting this cost an hour, once
cd backend && .venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Verify: `curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health` → `200`.

**Backgrounding caveat learned today:** a backend started as a tracked background
shell gets reaped between turns (its log ends cleanly at "Uvicorn running", no
traceback). `next dev` survives because npx spawns a detached child. If it keeps
dying, launch it detached:

```powershell
Start-Process -FilePath "E:\Resume-Parser\backend\.venv\Scripts\python.exe" `
  -ArgumentList "-m","uvicorn","app.main:app","--host","127.0.0.1","--port","8000" `
  -WorkingDirectory "E:\Resume-Parser\backend" -WindowStyle Hidden
```

Dev auth: every `next dev` restart signs you out on purpose (see §10.7).

---

## 1. Repository State

> **Superseded — this table is the state at the END OF PHASE 1 and is kept as a
> record of that moment. For the current state see §12.3.** Phase 2 has since
> been completed; the figures below (57 changes, "Phase 2 not started") are no
> longer true.

| | |
|---|---|
| **Branch** | `manus-ui-v1` |
| **Latest commit** | `6ba960a` — *feat: redesign marketing experience, enterprise UI, RBAC and transport stability* (31 Jul 2026) |
| **Working tree** | **57 uncommitted changes** of mine: 37 tracked modified (incl. this file), 20 untracked new. Plus 122 deletions under `Manus Design/` which the **user** made deliberately — ignore them, they are not part of this work. |
| **Backend** | Running on `:8000`, `/health` → 200. Enforcement **LIVE**. |
| **Frontend** | Running on `:3000` → 200. Phase 2 UI **not built**. |
| **Database** | Live Supabase project `vmqhigckfkedkwfkvnij`. Migrations **0016–0021 applied**. |
| **Phase** | Phase 1 **complete, approved, audited**. Phase 2 **not started** (this handoff was requested immediately before starting it). |
| **Tests** | Backend **136 passed** · Frontend **135 passed** · `tsc --noEmit` clean · `eslint` **4 known errors** (see §11) |

Still zero commits for this work — the tree is intentionally intact so history can
be structured after review.

---

## 2. Architecture Decisions Finalized Today

### 2.1 Monetization sits ON TOP of the existing RBAC system — never merged with it

Three orthogonal axes, and keeping them separate is the single most important
decision in this design:

```
authentication   who are you?            core/auth.py            401
authorization    what may your ROLE do?  enterprise/rbac.py      403
entitlement      what has your ORG paid? enterprise/entitlements 402
```

A recruiter on FREE and a viewer on PRO both fail to open the Copilot — but the
first needs an upgrade and the second needs an admin. **Telling a paying owner
they "lack permission" is the worst sentence a monetized product can show.** Two
axes, two status codes, two messages, never collapsed.

RBAC was left completely untouched. `rbac.py`, `Permission`, `ROLE_PERMISSIONS`
and all ~100 `require_permission` call sites are exactly as they were.

### 2.2 A central Entitlement layer — nothing checks a plan directly

`app/enterprise/entitlements.py` is the only module that answers "has this
organization bought this?". No code anywhere writes `if plan == "pro"`. Methods
are named for the **act**, never the plan: `can_upload_resume()`,
`can_use_copilot()`, `can_invite_member()`, `can_export(fmt)`,
`can_use_own_api_key()`.

### 2.3 Structured `Decision`, not booleans — this was a deliberate rejection of the brief

The original brief asked for `canUseCopilot() -> bool`. **A bool cannot render the
product.** It cannot say "Upgrade to *Pro*" (it doesn't know the tier) or
"*2 of 2* used" (it doesn't know the usage), so every call site would re-derive
those — which is exactly the `if plan === "PRO"` the design forbids, one layer up.

Every method returns:

```python
Decision(allowed, reason, message, feature, metric, current_plan,
         required_plan, upgrade_target, limit, used, plan_version, extra)
```

`required_plan` comes from the catalog, so **upsell copy is derived, never typed
into a component**. `Decision.__bool__` returns `allowed`, so `if svc.can_x():`
still reads naturally; enforcement paths use `.raise_for_denied()` instead so the
reason reaches the client.

### 2.4 Plan catalog architecture — limits are code, not columns

The brief proposed `resume_limit` / `member_limit` / `organization_limit` columns
on `organizations`. **Rejected and approved as rejected.** Plan-derived values as
per-row columns mean every pricing change is a data migration across every tenant,
and rows drift from the catalog. `app/enterprise/catalog.py` holds plans, order,
aliases, 22 features with `min_plan`, limits, and résumé windows. The database
stores only what is tenant-specific: plan, status, period, Stripe ids, and
negotiated `limit_overrides`.

### 2.5 Grandfathering: the FOUNDING ruleset — one column, not N rows

`subscriptions.plan_ruleset ∈ {'founding', 'v1'}`.

- `founding` → the capability set those accounts had on monetization day, **and no
  limits at all**.
- `v1` → the new plan matrix.

All **68 existing organizations** were backfilled to `founding`. New ones default
to `v1` from the column default (the auto-provision trigger needed no change).

Chosen over per-org grant rows because a scatter of rows whose *absence* is
indistinguishable from a bug is not an auditable promise. One value you can read,
test, and reverse per-org. **Accepted cost:** the founding capability set must stay
frozen in the catalog for as long as those accounts exist. It is a record of a
promise, not dead code — do not "clean it up".

### 2.6 PLUS credits are monthly; FREE is lifetime

FREE's 2 credits are for the lifetime of the organization (it is a trial, not an
allowance). PLUS/PRO renew per calendar month, UTC. **Both counters are always
written** on every résumé — so the figure is independent of whichever plan was
active at the time, and an upgrade-then-lapse cannot leave a hole or restore
spent trial credits.

### 2.7 Enterprise V1 = ONE organization

`organization_members` already supports many orgs per user, but
`resolve_org_context` resolves exactly one via `recruiters.organization_id`.
Multi-org needs an org switcher plus changes to context resolution and every
org-scoped query's assumptions. Deferred. `LIMITS[enterprise]["organizations"] = 1`
on purpose — the catalog test skips `organizations` in its monotonicity check for
this reason.

### 2.8 BYO AI never falls back silently (Phase 4, decided now)

If an organization's own key is invalid or exhausted, **surface a configuration
error**. Never fall back to the HireLens managed key — that means HireLens paying
for an enterprise customer's traffic while hiding the misconfiguration.

### 2.9 `PATCH /org/subscription` — a live hole, now closed twice over

It let anyone holding `ORG_MANAGE` (i.e. **every organization owner**) set their
own plan to `enterprise`, free, in production. Removed. Migration 0016 also
revokes `insert/update/delete` on `subscriptions` from `authenticated` and `anon`.
The API has no write path **and** the database refuses one.

Plan changes now come only from: `scripts/set_org_plan.py` (service-role, audited)
or the future billing webhook. There is **no staff/superuser auth model in this
codebase** — `routes/admin.py` is AI-gateway routes behind ordinary org
permissions — so an HTTP admin route would have meant inventing one as a side
effect of a billing change. The script was the smaller, safer answer.

### 2.10 Backend-first rollout

Enforce on the server, then build the UI. The server is the authority; the client
only decides whether to render a control or a calm gate. Every client-side gate
in Phase 2 must have a server counterpart that already exists.

---

## 3. Phase 1 Completed

### 3.1 Database — migrations 0016–0021 (all applied to the live project)

| Migration | Purpose |
|---|---|
| `0016_subscription_plan_state.sql` | +9 columns on `subscriptions` (`plan_ruleset`, `plan_started_at`, `plan_expires_at`, `cancel_at_period_end`, `trial_ends_at`, `limit_overrides`, `plan_version`, `stripe_customer_id`, `stripe_subscription_id`). Backfills **all 68 orgs to `founding`**; creates rows for the 5 orgs that had none; CHECK constraints on ruleset and status; **revokes client writes to `subscriptions`** |
| `0017_usage_counters_atomic.sql` | `increment_usage(org, period, metric, delta)` — single-statement upsert-add replacing the read-modify-write |
| `0018_org_scope_usage_sources.sql` | `organization_id` on `candidate_uploads` and `campaigns` + indexes + backfill. Both were recruiter-scoped, but the quotas are **org** limits — without this a 3-person team gets 3 free quotas |
| `0019_entitlement_grants.sql` | Commercial add-ons above plan: attributed, expiring, service-role only, RLS |
| `0020_usage_backfill.sql` | Seeds résumé counters from upload history (no-op — zero uploads exist) |
| `0021_usage_snapshot.sql` | `usage_snapshot(org, period)` — all four quota counts in ONE round trip |

**Deliberately NOT added:** a `plan_status` column. `subscriptions.status` already
carries that fact and is already read by the Settings UI; two columns for one fact
is how they drift. A CHECK pins the vocabulary:
`active | trialing | past_due | canceled | incomplete`.

#### The rollback incident (read this before writing migrations here)

The first `supabase db push` **failed**. `usage_snapshot` was written inside 0017,
where it counts `campaigns.organization_id` — a column **0018** adds. A
SQL-language function body is validated *at creation time*, so the forward
reference is a hard error, not a deferred one:

```
ERROR: column g.organization_id does not exist (SQLSTATE 42703)
```

0016 applied and was recorded; 0017 rolled back cleanly; **no partial state**.
Resolution: the function moved to its own migration `0021`, which runs after 0018.
The second push applied 0017–0021 cleanly. Lesson: a function that references a
later migration's column must live in a later migration.

### 3.2 Backend

**New (5 files)**

- `app/enterprise/catalog.py` — plans (`free/plus/pro/enterprise`), `PLAN_ORDER`,
  legacy aliases (`professional→plus`, `business→pro`), 22 features with
  `min_plan`, `LIMITS`, `RESUME_WINDOW`, the frozen `FOUNDING_FEATURES`,
  `catalog_snapshot()` for the future pricing page.
- `app/enterprise/entitlements.py` — `Decision`, `PlanError` (402), `PlanService`.
- `app/enterprise/usage.py` — `UsageSnapshot`, `read_snapshot()` (1 RPC),
  `record_resumes()` (writes lifetime **and** month), `current_period()` in UTC.
- `app/enterprise/plans.py` → rewritten as a thin shim over the catalog so its
  existing callers never had to change.
- `scripts/set_org_plan.py` — `show` / `list` / `set`, audited, service-role.

**Modified (16)** — `feature_flags.py` (catalog-derived; overrides now
**subtract-only**), `context.py`, `deps.py`, `repositories.py`, `schemas.py`,
`routes/{org,batch,campaigns,export,analytics,agent,analyze,match,integrations}.py`,
`main.py`, `core/config.py`, `repositories/{candidate,campaign}_repository.py`,
`services/persistence_service.py`.

**Key mechanics**

- **Entitlement resolution order:**
  `plan status inactive → FREE` → `entitlement_grants` (may ADD) → catalog
  `min_plan` (the ceiling) → `org_feature_flags` (may only SUBTRACT).
  The last is a change: a flag row used to be able to switch a capability **on**
  above the paid plan, making an ops toggle and a commercial decision the same
  row. `enabled = true` rows are now inert.
- **`past_due` keeps working.** Dunning is a billing conversation, not a reason to
  lock a team out of its pipeline mid-week. `canceled` resolves to FREE. Founding
  orgs ignore status entirely (their plan predates billing).
- **Org context fan-out** grew from 4 to 6 parallel branches. `grants` and `usage`
  are **degradable**: if they fail, the request still succeeds with zero usage and
  no grants, logged at WARNING. Making billing tables a single point of failure for
  every authenticated request would be strictly worse than briefly allowing one
  extra résumé. The original four remain critical → 503.
- **Résumé accounting.** Checked at `/batch-analysis` **before any AI call** (an
  exhausted org must be stopped before tokens are spent, not after), consumed at
  persist using `len(stored)` — the post-dedup set, so re-uploading the same file
  costs nothing. `/ats-analysis` and `/match-analysis` are stateless, so they both
  check *and* consume.
- **`upload_candidate_resume` is deliberately NOT gated** — it attaches a file to a
  candidate that persist already charged for; gating it would bill twice and leave
  an already-counted candidate permanently without their document.

### 3.3 Frontend

Only what was unavoidable — no Phase 2 UI exists.

| File | Change |
|---|---|
| `lib/api-error.ts` | Typed `PlanDenial`, `apiErrorFrom()`, `isPlanGateError()`, `planDenialOf()`; `isFeatureGateError` kept as a deprecated alias |
| `types/org.ts` | `PlanState`, `Entitlement`, `LimitUsage`, extended `OrgContext` |
| `settings/sections/billing-section.tsx` | Plan `<select>` removed (it called the deleted endpoint); reads read-only |
| `lib/api/settings.ts`, `services/org-api.ts` | `useUpdateSubscription` / `updateSubscription` removed |
| 9 API clients | `agent`, `ai-gateway`, `campaigns`, `comparison`, `copilot`, `interview`, `org`, `search`, `lib/api/activity` |

**Why 12 files instead of the 3 planned.** Every client threw
`new Error(err.detail)`, which discards the status code and the entire 402
payload. With enforcement live from day one, a gated user would have seen a bare
toast with no upgrade path, and the UI could not tell 402 from 500. The clients
now build the typed error. **The user reviewed and approved this deviation**,
noting it makes Phase 2 cleaner — which it does: `PlanDenial` is already typed and
thrown, so Phase 2 only has to render it.

### 3.4 Tests

| | |
|---|---|
| Backend | **136 passed** (was 65 at session start) |
| Frontend | **135 passed** (unchanged — no Phase 2 UI yet) |

**New suites:** `test_plan_catalog.py` (14) · `test_entitlements.py` (29) ·
`test_quota_enforcement.py` (5) · `test_grandfathering.py` (11) ·
`test_monetization_audit.py` (5).

**Extended:** `test_feature_flag_enforcement.py` (detects `require_entitlement`;
every catalog feature is route-gated or has a recorded exemption) ·
`test_org_context_fanout.py` (5 concurrent branches + degradation tests).

**Two tests caught real defects in my own work:**
1. `test_usage_writes_go_through_the_atomic_rpc` — I had converted
   `record_resumes` but left `UsageRepository.increment` on the read-modify-write.
2. The audit's must-gate check — the four newly-gated capabilities weren't listed,
   which surfaced only after fixing the pytest-visibility bug below.

**Concurrency verification:** 24 threads released from a barrier simultaneously →
counter = **24, zero lost updates**.

---

## 4. Monetization Decisions of Record

| | FREE | PLUS | PRO | ENTERPRISE |
|---|---|---|---|---|
| Résumé credits | **2 lifetime** | **25 / month** | unlimited | unlimited |
| Team members | 1 | 3 | 25 | unlimited |
| Organizations | 1 | 1 | 1 | 1 *(V1)* |
| Roles (campaigns) | 2 | unlimited | unlimited | unlimited |

**FREE** — Resume Parser · ATS Score · Basic AI Summary
**PLUS** — + Full Resume Analysis · Candidate Comparison · PDF Export
**PRO** — + AI Copilot · Semantic Search · Interview Intelligence · Advanced
Analytics · Executive Reports · Excel Export · **Predictive Intelligence** ·
**Organizational Knowledge** · **Integrations**
**ENTERPRISE** — + BYO AI · API Access · SSO · Audit Logs · Dedicated Support ·
**Webhooks** · **Autonomous Agent**

Placements decided today beyond the original brief: `executive_reports`→PRO,
`autonomous_agent`→**ENTERPRISE**, `predictive_intelligence`→PRO,
`org_knowledge`→PRO, `integrations`→PRO, `webhooks`→ENTERPRISE.

**Also of record:**
- Existing organizations use the **FOUNDING** ruleset — nothing is taken away.
- New organizations use **v1**.
- **Multi-organization deferred.**
- **BYO AI never falls back silently** to the managed key.
- **Subscription changes cannot be self-service** — no client write path exists.

---

## 5. Monetization Audit Results

Run after Phase 1 was approved, at the user's request. **Result: clean.**

- **87 routes classified**, every one of them, in `tests/test_monetization_audit.py`.
  An unclassified route **fails the test**, so a new endpoint cannot be added
  without someone deciding whether it is monetized.
- **9/9 runtime checks passed** on a throwaway account: FREE → 402 on prediction,
  knowledge, integrations, webhooks; PRO → 200 on the three Pro subsystems and
  still 402 on webhooks; ENTERPRISE → 200 on webhooks.

**Hidden AI endpoints fixed.** `/ats-analysis` and `/match-analysis` each accept a
résumé file and run the full AI pipeline, and **neither was metered** — an
authenticated FREE account could analyse résumés without limit and never reach the
wall. Both now check and consume. Neither is called by the V4 frontend, so
exposure was API-level, but both were reachable with any valid token.

**Three subsystems gated** (32 routes) that predated the plan matrix and were
reachable by everyone: **Prediction** → Pro, **Knowledge** → Pro, **Integrations**
→ Pro, with **webhooks** → Enterprise (per-endpoint, because that router also
serves the ordinary connections Pro includes).

**FOUNDING preservation.** All four new keys were added to `FOUNDING_FEATURES`.
Grandfathering is about what an account **could do** on monetization day — not
about which release happened to gate a subsystem. A founding org that used the
Learning screen yesterday still can.

**`/campaigns/{id}/embeddings/reindex` is intentionally NOT gated.** It costs
embedding compute, and `semantic_search` would be the natural gate — but the
add-candidates flow calls reindex as its **third step**, so a 402 there would fail
an upload that had already succeeded. That is the same shape as the
agent/Ledger incident this repo already documents in `UNGATEABLE`. Retrieval
(`/search/*`) is gated; index-building is not. Recorded with this reasoning in
`KNOWN_UNGATED`.

**A test-harness defect found during the audit:** the enforcement suites *return*
failure lists (they double as standalone runners), and pytest treats a returned
list as a **pass**. So the standalone runner could report FAILED while CI reported
green. All three suites now have an asserting `test_all_checks_pass()` bridge.
**If you add a check to those files, add it to the bridge too.**

---

## 6. Known Behaviour

- **Enforcement is LIVE** (`ENTITLEMENT_ENFORCEMENT=on`, the default). The user
  explicitly rejected shadow mode: FREE users genuinely stop at their limits.
- **Phase 2 UI does not exist.** No locks, no meters, no upgrade dialog.
- **Users currently receive plain 402 toasts** carrying the server's sentence
  (e.g. *"AI Copilot is available on the Pro plan."*). Accurate, but not an upgrade
  path. This is the strongest argument for doing Phase 2 next.
- **Analytics is gated whole for FREE and PLUS** — `/analytics/overview` is one
  aggregate response, and the matrix locks Analytics below PRO. Carving out a
  "basic" subset would invent a surface the plans do not describe.
- **Upgrade UX is not implemented.** There is no way for a user to change plan
  from inside the product, by design — until billing ships, only
  `scripts/set_org_plan.py`.
- A FREE user hitting `/integrations/webhooks` is told "upgrade to **Pro**", not
  Enterprise, because the router gate fires before the endpoint gate. Accurate as
  a next step; does not name the ultimate requirement.

---

## 7. Remaining Work

### Phase 2 — frontend experience (next)

1. **Client entitlement catalog** — `lib/entitlements/catalog.ts`, mirroring
   `app/enterprise/catalog.py` (same discipline as `permissions.ts` ↔ `rbac.py`).
2. **Entitlement hooks** — `useEntitlement(feature)`, `useQuota(metric)`,
   `usePlanGate(feature)`. Must keep the four-state discipline of
   `usePermissionGate`: loading / error / allowed / denied. **Never claim
   "upgrade" because a request failed.**
3. **Locked dashboard experience** — locked, never hidden.
4. **Locked feature cards / placeholders** — Compare, Export, Interview, Ask,
   Analytics, Talent, Learning.
5. **Résumé usage widget** — meter; silent < 80%, visible ≥ 80%, hard stop at limit.
6. **Upload limit dialog** — block at file *selection*, not after the spinner;
   offer "analyze the first N" when a batch overflows.
7. **Upgrade CTA** — derived from `required_plan`, never hardcoded.
8. **Pricing page integration** — generate from `catalog_snapshot()`. The current
   marketing frame still says "Team $499 / Business $999", which contradicts the
   enforced matrix.
9. **Plan badges** — including a FOUNDING badge for grandfathered orgs.
10. **Upgrade flow** — routing 402 → dialog; `plan_version` to detect a stale context.

### Future phases

- **Phase 3 — payments:** Stripe or Razorpay, `billing_events` table (webhook
  idempotency — non-optional), checkout, portal, grace period on `past_due`
  (7 days proposed), credit packs.
- **Phase 4 — BYO AI:** `org_ai_credentials` table, per-credential provider
  instances (providers are currently process-wide singletons with class-level
  clients — this is the largest refactor), health isolation per credential scope,
  Azure OpenAI as a new provider class, Enterprise settings UI.
- **Multi-organization** — org switcher + context resolution changes.
- **Billing portal**, invoices, seat billing.

---

## 8. Verification

### ✅ Verified

**Static** — backend 136/136 · frontend 135/135 · `tsc --noEmit` clean.
`eslint` is **not** clean: 4 pre-existing errors, all in one marketing
component. See §11 — this line previously claimed "eslint clean", which was
wrong.

**Schema (post-migration reads against the live DB)** — 68/68 subscriptions
`founding`; 0 orgs without a subscription row (was 5); `campaigns` and
`candidate_uploads` org-scoped with 0 nulls; `entitlement_grants` present; both
RPCs callable.

**Concurrency** — 24 simultaneous `increment_usage` calls → 24. Zero lost updates.

**Self-upgrade hole** — `PATCH /org/subscription` → **405**; OpenAPI exposes only
`['get']`; no subscription write route anywhere in the spec.

**End-to-end on a throwaway account (12/12)** — new org resolves `v1`; context
carries plan_state + entitlements + limits; locked feature → 402 with the full
flat body; seat quota → 402 with `used:1, limit:1, required_plan:"plus"`;
flipping `plan_ruleset` to `founding` restores access; flipping back re-locks.

**Audit gates end-to-end (9/9)** — FREE/PRO/ENTERPRISE across prediction,
knowledge, integrations, webhooks.

Both throwaway accounts and their organizations were deleted; cleanup confirmed
in the run output.

### ❌ NOT Verified

- **The résumé wall itself, end-to-end.** Proving it needs real PDFs through the
  AI pipeline against a 100k-tokens/day Groq free tier. It is covered by boundary
  unit tests (0/1/2/3 credits, batch of 3 with 2 left) and a static check that the
  quota precedes `process_batch`. The **seat** quota — identical
  `PlanService.quota()` → 402 path — *was* proven live, so the machinery is
  exercised; only the résumé call site is not.
- **`/ats-analysis` and `/match-analysis` metering at runtime.** Unit- and
  source-verified only, same token-cost reason.
- **Any Phase 2 UI.** None exists.
- **Migration rollback.** Forward-only was tested (the 0017 failure rolled back
  cleanly); a deliberate down-migration was never exercised.
- **Browser-level behaviour.** The Claude Chrome extension was not connected all
  session; every HTTP claim here came from curl/httpx, not a real browser.
- **Multi-user concurrent quota behaviour in the real app** (only the RPC was
  stress-tested, not the full request path).

---

## 9. Tomorrow's Starting Point

> **Superseded — this was the plan for Phase 2, and Phase 2 is now complete.**
> Everything in steps 3–6 below was built (see §12.1). Kept because it records
> the order the work was done in and why. **For what to do next, see §12.7 —
> the answer is executing the RC checklist, not writing code.**

1. **Read this HANDOFF.** You need nothing else.
2. **Start both servers** (§0) and confirm `/health` → 200.
3. **Resume Phase 2** — do not re-audit, do not re-verify Phase 1. It is approved.
4. **Build the client entitlement system first** — `lib/entitlements/catalog.ts`
   mirroring the Python catalog, then `useEntitlement` / `useQuota` /
   `usePlanGate`. Everything else depends on this layer.
5. **Then the locked dashboard experience** — `<FeatureLock>`, `<LockedButton>`,
   `<QuotaMeter>`, `<UpgradeDialog>`, `<PlanBadge>`; extend the existing
   `GateState` (it already has a `reason: 'plan'` branch) to take `requiredPlan`.
6. **Then verify the FREE user journey** end-to-end: sign up → see locks → hit the
   2-résumé wall → see the upgrade screen rather than a toast.

A throwaway v1 account is the fastest way to see FREE behaviour — every new signup
is `v1`, while all 68 existing orgs are `founding` and will show **no locks at
all**. If the UI looks unlocked, check `plan_state.ruleset` before assuming a bug.

---

## 10. Notes to Future Claude

**10.1 The catalog is the source of truth. Mirror it, never fork it.**
`lib/entitlements/catalog.ts` must mirror `app/enterprise/catalog.py` the way
`permissions.ts` mirrors `rbac.py`. Add a parity test. If the two disagree, the
server wins — always.

**10.2 Never hardcode a plan name in a component.** `required_plan` arrives in
both `/org/context` and every 402 body. "Upgrade to Pro" is *derived*. A hardcoded
tier is the same defect as `if plan === "PRO"`, just wearing a nicer coat.

**10.3 Locked ≠ hidden — and this REVERSES the nav rule.**
`nav-config.ts` currently *hides* a nav item when the destination can only render
a gate. That is right for **permissions** and wrong for **plans**: a hidden
feature sells nothing. Add a separate `entitlement?` field that shows-locked,
distinct from `perm` which hides.

**10.4 Never withhold content because a request failed.** `use-can.ts` documents
this hard-won rule: a failed `/org/context` must not render "upgrade to Pro" at a
customer who already pays for Pro. `usePlanGate` must keep loading / error /
allowed / denied distinct. Copy the discipline, not just the shape.

**10.5 Quota exhaustion and feature locks are different surfaces.** A lock says
"this isn't in your plan" (static, upsell). A quota says "you've used 2 of 2"
(dynamic, has a meter, warns at 80%). Do not render them with the same component.

**10.6 Check quota BEFORE the expensive thing.** The upload dialog must block at
file selection with "2 of 2 used", not accept files and fail after the spinner.
The backend already does this at `/batch-analysis`; the client should not be worse.

**10.7 Dev auth resets on every server restart** — deliberate, added earlier today.
`lib/dev-session-reset.ts` + `proxy.ts`: a per-boot id in an `hl-dev-boot` cookie;
a request without the current id gets its Supabase cookies expired. Boot id lives
on `globalThis` so a proxy recompile doesn't sign you out on every save. The PKCE
verifier is deliberately never cleared. Production is untouched
(`isDevSessionResetEnabled()` is false when `NODE_ENV === 'production'`);
`HL_DEV_PERSIST_SESSION=1` opts a dev run back into persistent login.

**10.8 `ENTITLEMENT_ENFORCEMENT=off` is the rollback lever.** One env var, no
deploy, every gate inert, denials logged as `entitlement.not_enforced`. Use it if
a quota misfires against a real customer — then diagnose.

**10.9 The org-context fan-out is a hot path with a history.** It runs on nearly
every authenticated request and is deliberately **never cached** so a revoked role
or lapsed plan takes effect on the next request. It has already caused one ~1s
regression from serial reads and one "cannot enter context" bug from a shared
`Context` copy. If you add a branch: run it in the pool, give it its own
`contextvars.copy_context()`, and decide explicitly whether it is critical (503)
or degradable (log + fall back).

**10.10 Founding orgs are the ones you'll actually be looking at.** All 68 existing
organizations — including both real recruiter accounts — are `founding` and see
**no locks and no limits**. Testing Phase 2 UI against your own account will show
you nothing. Create a throwaway account, or flip one org to `v1` with
`scripts/set_org_plan.py` and flip it back.

**10.11 Product philosophy that shaped every decision here.**
*Never take something away from someone who already had it* (the founding ruleset).
*Never charge twice for one résumé* (dedup-aware counting; the upload endpoint is
not gated). *Never bill someone for a failure* (charge on success only).
*Never block a paying customer because billing infrastructure hiccuped*
(degradable branches, generous-on-failure). *Never tell a paying owner they lack
permission* (402 vs 403). These are not style preferences — each one is a specific
failure that was designed out.

**10.12 Things deliberately left undone — do not "fix" them.**
- `organizations.plan` is a denormalized read-model mirror; `subscriptions.plan` is
  authoritative. Both are written together.
- `feature_gate()` remains as a deprecated alias of `require_entitlement()`.
- `export_excel` has no endpoint yet; declared for matrix completeness.
- `audit_logs` is an Enterprise *feature key* but the read route is **not** gated —
  every org can read its own history. Gating it would hide a customer's record
  behind a plan.
- `/embeddings/reindex` ungated — see §5.

**10.13 Lint is not clean, and the earlier version of this file said it was.**
See §11. Treat "clean" claims in older documents as unverified until re-run.

**10.14 The user's working style.** Decisions are given explicitly and are final;
they approve deviations when the reasoning is sound (both of mine were approved).
They ask for plans before implementation and want honest separation of verified
from unverified. They asked for — and got — pushback on the boolean API and on the
per-org limit columns, and accepted both. Flag concerns once, clearly, then
proceed with their call.

---

## 11. Known Technical Debt

Recorded honestly rather than fixed. Nothing here is scheduled; each entry needs
a deliberate decision before anyone touches it.

### 11.1 `eslint` — 4 errors in `components/marketing/NeuralBackground.tsx`

Found 1 Aug 2026 while verifying Phase 2.1. **Earlier versions of this file, and
`docs/archive/monetization/MONETIZATION_PHASE1_COMPLETE.md`, claimed "`eslint` clean". That claim was
wrong** — it appears to have been carried forward rather than re-run after the
marketing redesign landed.

```
components/marketing/NeuralBackground.tsx:292:7   react-hooks/refs
components/marketing/NeuralBackground.tsx:292:39  react-hooks/refs
components/marketing/NeuralBackground.tsx:293:7   react-hooks/refs
components/marketing/NeuralBackground.tsx:293:36  react-hooks/refs
```

All four are the same defect: `circles.current` and `segs.current` are resized
**during render**, which React's rules forbid because a ref write in render does
not participate in reconciliation and can leave the component not updating as
expected.

- **Provenance:** committed in `6ba960a` (the marketing redesign). It predates
  the monetization work and is unmodified in the working tree — no part of
  Phase 1 or Phase 2 introduced it or touched the file.
- **Status:** **deliberately not fixed.** The user's instruction on 1 Aug 2026
  was to record it and leave it until the work is intentionally scheduled.
  It is a canvas/SVG animation component, so a careless fix risks a visible
  regression on the landing page for no functional gain.
- **Consequence today:** `npx eslint .` exits with findings. Do not treat a
  non-empty eslint run as a regression from your own change without first
  confirming the errors are not these four.
- **When it is scheduled:** the resize belongs in a `useMemo` keyed on `d.n`/`d.m`,
  or in the effect that already owns the animation loop — not in the render body.

### 11.2 Two catalog features deliberately have NO client lock

Checked against the code on 1 Aug 2026 during Phase 2.5, not assumed. Recorded
here and enforced by `tests/entitlement-surface-coverage.test.tsx`, which fails
if a catalog feature is neither locked nor given a reason.

- **`export_pdf`** — the gated `/export/*` routes have **no client caller at
  all**; there is no `services/export-api.ts`. The only "Export PDF" in the UI
  is the interview pack's, and that is `lib/interview-pdf.ts` building HTML and
  printing it locally. It never touches the server. Locking it would refuse an
  action the server never sees, on data already delivered to the customer.
  A test asserts that file makes no network call, so if that ever changes the
  reason above becomes false and the suite says so.
- **Analytics "Export CSV"** — serialises the overview already in memory
  (`URL.createObjectURL`). It is already behind the Analytics plan gate; a
  second gate on a local download would add nothing.

`export_excel` has neither an endpoint nor a UI and is declared for matrix
completeness only (see §10.12).

### 11.3 Browser verification is outstanding for ALL of Phase 2

**Release gate: `docs/RELEASE_CANDIDATE_CHECKLIST.md`.** That is the single
document to work through before monetization is called production-ready — it
combines backend, frontend, browser, responsive, accessibility, performance,
monetization, upgrade-flow and regression validation into one run, so the
validation happens once and completely instead of in scattered pieces.

Its §3 defers to **`docs/BROWSER_QA_CHECKLIST.md`** — the running list, kept in the repo
because it has already outlived one session. Nothing in Phase 2 has been seen
rendering in a browser against the live backend: not the résumé wall, not the
meter, not the upgrade dialog, not one lock. The blocker is that the Chrome
extension cannot reach `localhost`; the diagnosis is in §0 of that file.

Do not treat the green test suites as release readiness. They verify the layer,
not the rendered product.

### 11.4 `tsc --noEmit` and the test suites ARE clean

Stated explicitly so this section is not read as general decay: backend pytest,
frontend vitest and TypeScript all pass. The lint debt above is the only known
static failure.

---

## 12. Milestone Close — 1 Aug 2026

Sections 1–10 describe Phase 1 and are unchanged. This section is the current
state of the whole monetization effort.

### 12.1 What was built after Phase 1

**Phase 2 — frontend experience**, built horizontally rather than screen by
screen, so one visual language exists before any screen consumes it.

| Sub-phase | Delivered |
|---|---|
| **2.1** | Client entitlement catalog (presentation-only mirror of `catalog.py`), backend-generated `catalog.snapshot.json`, bidirectional parity tests, and the `usePlan` / `useEntitlement` / `usePlanGate` / `useQuota` hooks |
| **2.2** | Generic `GateState` (three reasons, zero product knowledge), `FeatureLock`, `QuotaLock`, `LockedButton`, `QuotaMeter`, `PlanBadge`, `PlanGate`, `UpgradeButton`, `UpgradeActionProvider` |
| **2.3** | Wired into the product: nav locking, Ask, Analytics, Compare, the Inbox quota meter, Settings usage widgets, plan badges |
| **2.4** | Upgrade dialog + provider, 402 → dialog routing, the résumé wall and over-quota upload handling, the derived value sentence, typed errors from the batch client |
| **2.5** | The gap 2.4 missed: Talent Search and Interview Intelligence locks, plus the coverage guard that makes such a gap impossible to repeat |

**Phase 2.5** deserves its own note. Phase 2.4 shipped believing the locks were
complete; they were not. Talent Search and Interview Intelligence were gated on
the server and ungated in the UI, so a FREE organization met a raw 402 in a
query-error state. **Nothing failed** — no test knew that a mapping between a
server gate and a client surface existed, so the gap was invisible until the
routers were read by hand.

`tests/entitlement-surface-coverage.test.tsx` is now that mapping, written down.
Every one of the 22 catalog features is either locked in a named client file
(asserted to actually reference the feature and to use a shared primitive) or
carries a written reason it needs none. **Adding a catalog feature without
deciding fails the suite** — the same discipline `test_monetization_audit.py`
applies to the 87 backend routes.

Two features were verified as needing **no** client lock (§11.2): interview PDF
export and analytics CSV export both operate entirely on data already delivered
to the browser and never call the server. Do not lock local functionality
because it sounds premium.

### 12.2 `docs/RELEASE_CANDIDATE_CHECKLIST.md`

The single release gate. 120 checkboxes across twelve sections: prerequisites,
backend, frontend, the FREE browser journey, monetization surfaces, upgrade
flows, responsive, accessibility, performance, regression, pre-ship, defect log
and per-area sign-off.

Three properties worth preserving if it is ever edited:

- **Verified and unverified are kept apart.** Its appendix lists what has been
  proven without a browser and then states plainly what that is *not* — evidence
  the product renders correctly.
- **Tooling limits are stated honestly.** No axe, no Lighthouse CI, no
  Playwright is installed, so the accessibility section says it is manual rather
  than implying a scan ran.
- **The person who runs a check signs it.** No box may be ticked on someone
  else's behalf.

### 12.3 Repository state

| | |
|---|---|
| **Branch** | `manus-ui-v1` |
| **Latest commit** | `6ba960a` (31 Jul 2026) — unchanged; this milestone is **still uncommitted** |
| **Working tree** | **87 changes**: 55 tracked modified, 32 untracked new. Plus 122 deletions under `Manus Design/` that the **user** made deliberately — not part of this work |
| **Database** | Live Supabase `vmqhigckfkedkwfkvnij`; migrations **0016–0021** applied |
| **Backend tests** | **140 passed** (65 at the start of Phase 1) |
| **Frontend tests** | **253 passed**, 22 files (135 at the start of Phase 2) |
| **`tsc --noEmit`** | clean |
| **`eslint .`** | **exactly 4 errors**, all pre-existing in `NeuralBackground.tsx` (§11.1). A fifth is a regression |

New this milestone: 6 migrations · 3 backend modules · 2 backend scripts · 6
backend test suites · 2 frontend directories (`entitlements/`,
`lib/entitlements/`) · 6 frontend test suites · 5 documents.

The tree is intentionally uncommitted so history can be structured after review
— a decision taken twice, deliberately. **Commit before Phase 3 starts**, so a
Phase 3 mistake is distinguishable from Phase 2 in the diff.

### 12.4 What is production-ready

**The server.** Enforcement is live and audited: 87 routes classified, 9/9
runtime gate checks passed across FREE/PRO/ENTERPRISE, the self-upgrade hole
closed at both the API and the database grant level, atomic usage counters
proven under 24-way concurrency, and all 68 pre-monetization organizations
grandfathered onto the `founding` ruleset. Migrations are applied and verified
against the live database.

`ENTITLEMENT_ENFORCEMENT=off` remains the rollback lever: one env var, no
deploy, every gate inert with denials logged (§10.8).

**The client layer, as a layer.** Types, hooks, components and the catalog
mirror are covered by 253 tests including bidirectional parity and four
architectural guards that fail if the rules are broken rather than merely
documenting them.

### 12.5 What still requires browser verification

**All of the rendered product.** `docs/RELEASE_CANDIDATE_CHECKLIST.md` §3–§8;
the step-by-step script and the blocker diagnosis are in
`docs/BROWSER_QA_CHECKLIST.md`.

The highest-value unverified items, in order:

1. **The résumé wall, end to end** — open since Phase 1. It must appear *before*
   the file picker, before any spinner, before any AI call.
2. **Five locked surfaces** — Ask, Analytics, Compare, Talent Search, Interview
   Intelligence — each rendering the shared lock.
3. **The founding regression** — 68 real organizations must see no locks, no
   meters, no change whatsoever.
4. **The quota meter's silence** below threshold. A meter wrongly *absent* looks
   identical to a meter correctly absent, which is exactly why it needs eyes.
5. **No screen falling back to a generic 402 toast** — the entire justification
   for Phase 2.

The blocker is environmental, not a defect: the Chrome extension cannot reach
`localhost` (`Frame with ID 0 is showing error page`). Diagnosed on 1 Aug 2026 by
elimination — the extension works on public sites, both servers answer curl in
~95 ms, and only the extension→localhost path fails. Grant `localhost`
site-permission in the extension and the checklist becomes executable.

**A QA run was attempted and abandoned rather than faked.** That was the correct
call and should be the norm: never report browser verification that did not
happen.

### 12.6 Why Phase 3 has intentionally NOT started

Four reasons, in order of weight:

1. **Pricing is undecided.** No plan has a price anywhere in the system —
   `catalog.py` carries capabilities and limits, never money. Billing cannot be
   integrated against prices that do not exist, and the pricing page was deferred
   for exactly this reason. The current marketing frame still says "Team $499 /
   Business $999", which contradicts the enforced free/plus/pro/enterprise
   matrix and must be reconciled when pricing is set.
2. **Validating after Phase 3 would confuse two failure surfaces.** A quota bug
   and a webhook bug found together are far harder to separate than found apart.
   Phase 2 must be proven correct while it is the only thing that could be wrong.
3. **Payments are irreversible in a way the rest of this is not.** A misfiring
   gate is one env var away from inert. A mischarged customer is not.
4. **Phase 3 is genuinely large** — `billing_events` with webhook idempotency
   (non-optional), checkout, portal, a `past_due` grace period, credit packs. It
   deserves its own plan, not the tail of this one.

### 12.7 The exact next milestone

**Pricing → Pricing page → Billing → RC execution → first production release.**

1. **Finalize pricing.** Prices for Plus and Pro, and whether Enterprise is
   "contact us". This is a business decision and it blocks everything after it.
2. **Build the pricing page** from `catalog_snapshot()`, so the page and the
   enforced matrix cannot drift. Retire the contradictory marketing copy in the
   same change.
3. **Integrate billing** (Stripe or Razorpay) — Phase 3 as scoped in §7.
   `UpgradeActionProvider` exists precisely so this changes one handler and no
   lock, meter or button.
4. **Execute `docs/RELEASE_CANDIDATE_CHECKLIST.md`** once, completely, in one
   sitting, with real sign-off.
5. **First production release.**

Before any of that: **commit this milestone**.

### 12.8 Standing rules established during Phase 2

Carried forward because each was a decision, not a preference:

- **Permission hides · entitlement locks.** A hidden feature sells nothing; no
  amount of money fixes a role.
- **The server decides access; the client decides experience.** The client
  entitlement catalog is presentation-only and must never recompute access —
  doing so ignores grants, flags, subscription status and the founding ruleset.
- **Never let a page compose its own lock UI.** One visual language for locks,
  quotas, upgrade actions, plan badges and meters. Enforced by tests.
- **Every upgrade prompt answers three questions:** what is locked, why you would
  want it, what changes if you upgrade. Enforced by tests.
- **A quota is not a feature lock.** Different surfaces, different sentences.
- **Never claim a plan problem because a request failed.** Loading, error,
  allowed and denied stay four distinct states everywhere.
- **Prefer actionable information to documentation** — the static limits table
  became meters for this reason.
- **Do not lock local functionality because it sounds premium.**
