# Monetization Phase 1 — Completion Report

**Status:** complete, applied to the live project, verified at runtime
**Date:** 1 Aug 2026
**Enforcement:** ON (`ENTITLEMENT_ENFORCEMENT=on`, the default)
**Companions:** `MONETIZATION_ARCHITECTURE.md` · `MONETIZATION_PHASE1_PLAN.md`

---

## 0. What is true now

- Plan definitions live in one catalog; nothing anywhere reads a plan string to decide.
- Every entitlement question is answered by `PlanService` as a structured `Decision`.
- **FREE genuinely stops at its limits.** 402 with a machine-readable body, from day one.
- Résumé usage is atomic, org-scoped and dedupe-aware — verified with 24 simultaneous writers.
- **All 68 existing organizations are grandfathered** (`plan_ruleset = 'founding'`) and are
  unaffected by every new limit and lock.
- The self-upgrade hole is closed at both the API and the database.
- `/org/context` carries entitlements, limits and usage — Phase 2 needs no new endpoint.

### Pre-flight (step 1.0)

| | |
|---|---|
| Organizations | 68 (65 `free`, 2 `enterprise`, 1 `business`) |
| Recruiters | 2 |
| Orgs with no subscription row | 5 → now 0 |
| Campaigns · candidates · uploads | **0 · 0 · 0** |
| Orgs over the new FREE seat limit | 1 (two active members) |
| Additive feature-flag overrides | 3 (`autonomous_agent` ×2, `semantic_search` ×1) |

The dataset is pre-launch: two real accounts and no candidate data. Grandfathering blast radius
is therefore one multi-member organization plus three override rows — all covered by the founding
ruleset, and pinned by a test named for that exact organization.

---

## 1. Migrations (6 applied)

| File | What it does |
|---|---|
| `0016_subscription_plan_state.sql` | +9 columns on `subscriptions` (`plan_ruleset`, `plan_started_at`, `plan_expires_at`, `cancel_at_period_end`, `trial_ends_at`, `limit_overrides`, `plan_version`, `stripe_customer_id`, `stripe_subscription_id`); backfills every existing row to `founding`; creates rows for the 5 orgs that had none; CHECK constraints on ruleset + status; **`revoke insert, update, delete on subscriptions from authenticated, anon`** |
| `0017_usage_counters_atomic.sql` | `increment_usage(org, period, metric, delta)` — one-statement upsert-add, replacing the read-modify-write |
| `0018_org_scope_usage_sources.sql` | `organization_id` on `candidate_uploads` and `campaigns` + indexes + backfill |
| `0019_entitlement_grants.sql` | New table for commercial add-ons (attributed, expiring, service-role only) + RLS |
| `0020_usage_backfill.sql` | Seeds résumé counters from upload history (no-op here — zero uploads) |
| `0021_usage_snapshot.sql` | `usage_snapshot(org, period)` — all four quota counts in one round trip |

**Deviation — 0021 exists because of my error.** `usage_snapshot` was written into 0017, where it
counts `campaigns.organization_id`, a column 0018 adds. A SQL-language function body is validated
at creation, so the push failed on `column g.organization_id does not exist`. 0016 applied, 0017
rolled back, no partial state. Splitting the function into 0021 (after 0018) fixed it; the second
push applied all five remaining migrations cleanly.

**Deviation — no `plan_status` column.** The plan sketched one; `subscriptions.status` already
carries that fact and is already read by the Settings UI. Two columns for one fact is how they
drift. A CHECK constraint pins the vocabulary instead: `active | trialing | past_due | canceled |
incomplete`.

**Deviation — `usage_snapshot` was not in the approved 5.** Added because the alternative was three
more branches in the org-context fan-out, which runs on nearly every authenticated request. One RPC
keeps it to a single branch.

---

## 2. Files changed

### Backend — new (5)

| File | Contents |
|---|---|
| `app/enterprise/catalog.py` | Plans, order, aliases, 18 features with `min_plan`, limits, résumé windows, the frozen `founding` set |
| `app/enterprise/entitlements.py` | `Decision`, `PlanError` (402), `PlanService` with act-named methods |
| `app/enterprise/usage.py` | `UsageSnapshot`, `read_snapshot` (1 RPC), `record_resumes` (lifetime + month) |
| `scripts/set_org_plan.py` | Audited service-role plan setter — `show` / `list` / `set` |
| `tests/…` | 4 new suites (§4) |

### Backend — modified (16)

`app/enterprise/plans.py` (shim over catalog) · `feature_flags.py` (catalog-derived, subtract-only)
· `context.py` (ruleset/status/version/grants/usage; critical vs degradable branches) ·
`deps.py` (`require_entitlement`, `require_quota`) · `repositories.py` (atomic increment) ·
`schemas.py` (`PlanState`, extended context) · `routes/org.py` (PATCH removed; seat quota; context)
· `routes/batch.py` (pre-AI résumé quota) · `routes/campaigns.py` (persist quota + counter, campaign
quota) · `routes/export.py` (`export_pdf`) · `routes/analytics.py` (`advanced_analytics`) ·
`routes/agent.py` · `main.py` (402 handler) · `core/config.py` (`ENTITLEMENT_ENFORCEMENT`) ·
`repositories/candidate_repository.py` · `repositories/campaign_repository.py` ·
`services/persistence_service.py`

### Frontend — 12 files (plan said 3)

Planned: `types/org.ts`, `lib/api-error.ts`, `billing-section.tsx` (+ `settings.ts`, `org-api.ts`
for the removed mutation).

**Deviation — 9 API clients also touched.** `lib/api-error.ts` gained `apiErrorFrom` + a typed
`PlanDenial`, but every client threw `new Error(err.detail)`, which discards the status and the
whole 402 payload. With enforcement on from day one, a real user hitting a gate would have seen a
bare toast with no upgrade path and no way for the UI to tell 402 from 500. The clients now build
the typed error: `agent-api`, `ai-gateway-api`, `campaigns-api`, `comparison-api`, `copilot-api`,
`interview-api`, `org-api`, `search-api`, `lib/api/activity.ts`.

No Phase 2 UI was built. The plan `<select>` is gone (it called the deleted endpoint);
`useUpdateSubscription` and `updateSubscription` are removed.

---

## 3. API changes

**Removed:** `PATCH /org/subscription` → **405**, and no write route to `subscriptions` exists in
the OpenAPI document. `GET` still answers 401 unauthenticated, i.e. it exists and is read-only.

**Extended:** `GET /org/context` now also returns

```jsonc
"plan_state":   { "key": "free", "label": "Free", "status": "active", "ruleset": "v1", "version": 1 },
"entitlements": { "ai_copilot": { "enabled": false, "required_plan": "pro", "label": "AI Copilot" }, … 18 },
"limits_usage": { "resumes": { "used": 0, "limit": 2, "remaining": 2, "window": "lifetime", … }, "members": …, "campaigns": … }
```

**New status code — 402**, flat body:

```jsonc
{ "detail": "AI Copilot is available on the Pro plan.", "code": "feature_not_in_plan",
  "feature": "ai_copilot", "metric": null, "current_plan": "free", "required_plan": "pro",
  "upgrade_target": "pro", "limit": null, "used": null, "remaining": null, "plan_version": 1 }
```

`403` remains exclusively "your role may not"; `402` exclusively "your plan does not".

**Now gated:** `/copilot/*` `/search/*` `/reports/executive` `/campaigns/{id}/compare`
`/campaigns/{id}/candidates/{id}/interview` `/agent/scan` `/agent/workflows` (entitlement) ·
`/analytics/overview` (`advanced_analytics`) · `/export-report` `/export-match-report`
(`export_pdf`) · `/batch-analysis` `/campaigns/{id}/persist-batch` (résumé quota) · `POST /campaigns`
(campaign quota) · `POST /org/members` (seat quota).

**Product consequence to note:** `/analytics/overview` is gated whole, so FREE and PLUS lose the
Analytics screen entirely. That follows the matrix (FREE lists Analytics as locked; PLUS does not
include it), but it is a visible change and the alternative — inventing a "basic" subset — would be
a surface the plans do not describe.

---

## 4. Tests — 126 backend (was 65) + 135 frontend

**New:** `test_plan_catalog.py` (14) — monotonicity, alias safety, founding fidelity, ruleset default
direction · `test_entitlements.py` (29) — the full plan × feature × ruleset matrix, decision
contents, 402 body, quota boundaries, grants vs overrides, plan status ·
`test_quota_enforcement.py` (5) — live inspection that every quota is present, that batch checks
*before* `process_batch`, that persistence charges post-dedup, that the upload endpoint is not
double-charged · `test_grandfathering.py` (9) — including a test named for the one real
two-member organization found in pre-flight.

**Extended:** `test_feature_flag_enforcement.py` — detects `require_entitlement`; every one of the 18
catalog features is now either route-gated or has a recorded reason it needs no gate ·
`test_org_context_fanout.py` — 5 concurrent table branches, plus two new tests that monetization
branches degrade rather than 503 while critical branches still 503.

**A test caught a real gap:** `test_usage_writes_go_through_the_atomic_rpc` failed because I had
converted `record_resumes` but left `UsageRepository.increment` on the read-modify-write. Fixed.

---

## 5. Verification

### Static
`pytest` 126/126 · `vitest` 135/135 · `tsc --noEmit` clean.

`eslint` was recorded here as "clean" and **that was wrong** — corrected 1 Aug 2026.
There are 4 pre-existing `react-hooks/refs` errors in
`components/marketing/NeuralBackground.tsx`, introduced by the marketing redesign
in `6ba960a` and unrelated to monetization. Recorded as known debt in
`docs/HANDOFF.md` §11; deliberately not fixed.

### Runtime — against the running server, on the real database

**Schema (post-migration reads):** 68/68 subscriptions `founding`; 0 orgs without a subscription
row (was 5); `campaigns`/`candidate_uploads` org-scoped with 0 nulls; `entitlement_grants` present
and empty; both RPCs callable.

**Concurrency (decision 6):** 24 threads released from a barrier simultaneously →
counter = **24, zero lost updates**.

**Self-upgrade hole:** `PATCH /org/subscription` → **405**; OpenAPI shows `['get']` only; no
subscription write route anywhere.

**End-to-end, throwaway account, created and deleted (12/12):**

| Check | Result |
|---|---|
| New org resolves against `v1`, not grandfathered | `ruleset: "v1"` |
| Context carries plan_state + 18 entitlements + 3 limits | yes |
| Locked capability reports its upgrade target | `{enabled: false, required_plan: "pro"}` |
| Free capability available | yes |
| Résumé limit 2, lifetime window | yes |
| Locked feature → **402**, not 403 | 402 |
| 402 body flat and complete | verified field by field |
| Seat quota → 402 with usage | `used: 1, limit: 1, required_plan: "plus"` |
| Flip `plan_ruleset` → `founding` restores capability | 200 |
| Founding org has no seat cap | quota bypassed (then 404 — the invitee doesn't exist, an unrelated and correct failure) |
| Flip back to `v1` re-locks | 402 |

The throwaway user and its organization were deleted; cleanup confirmed in the run output.

**Not verified at runtime:** the résumé wall itself. Proving it end-to-end needs real PDFs through
the AI pipeline, which spends Groq tokens against a 100k/day free tier. It is covered by unit tests
at the boundary (0, 1, 2, 3 credits; batch of 3 with 2 left) and by a static check that the quota
call precedes `process_batch`. The seat quota — same `PlanService.quota()` code path, same 402 —
*was* proven end-to-end, so the machinery is exercised; only the résumé call site is not.

---

## 6. Rollout notes

- **Enforcement is ON.** `ENTITLEMENT_ENFORCEMENT=off` disables every gate without a deploy — the
  rollback lever. A denial under `off` logs `entitlement.not_enforced` rather than blocking.
- **All existing accounts are `founding`** and see no change whatsoever. Only organizations created
  from now on get the new matrix. Moving one account between rulesets is a single column write via
  `python -m scripts.set_org_plan set <org> --plan pro --reason "..."`.
- **Between deploying this code and running the migrations there is a gap** where `/org/context`
  degrades (grants + usage branches fail, logged at WARNING; quotas read as zero, nothing blocks).
  Both are already applied here, so the window is closed — but deploy migrations first elsewhere.
- **The frontend does not yet render any of this.** Enforcement is live and the UI has no lock
  surfaces, so a FREE user who hits a gate today sees a plain error toast carrying the server's
  sentence ("AI Copilot is available on the Pro plan"). Accurate, but not an upgrade path. That is
  Phase 2, and it is the main argument for doing it next.
- Existing `feature_gate` callers keep working via a deprecated alias; all 7 were migrated.

---

## 7. Remaining Phase 2 work (frontend experience — not started)

1. **Entitlement mirror** — `lib/entitlements/catalog.ts` + `useEntitlement` / `useQuota` /
   `usePlanGate`, with the same four-state discipline as `usePermissionGate` (loading / error /
   allowed / denied — never claim "upgrade" because a request failed).
2. **Lock surfaces** — `<FeatureLock>`, `<LockedButton>`, `<QuotaMeter>`, `<UpgradeDialog>`,
   `<PlanBadge>`; extend `GateState` to take `requiredPlan` and render the derived CTA.
3. **Locked, never hidden** — Compare, Export, Interview, Ask, Analytics, Talent all visible with
   🔒 + "Upgrade to Pro". Nav: `entitlement` shows-locked (distinct from `perm`, which hides).
4. **Upload wall UI** — quota pre-flight in `add-candidates-dialog.tsx`: block at file selection with
   "2 of 2 free résumés used", warn at 80%, and offer "analyze the first N" when a batch overflows.
5. **Billing section rewrite** — plan cards, usage meters, founding badge for grandfathered orgs.
6. **402 routing** — `PlanDenial` is already typed and thrown; wire it to the upgrade dialog and use
   `plan_version` to invalidate a stale context.
7. **Pricing page** — generated from the catalog. The marketing frame still says "Team $499 /
   Business $999", which now contradicts the enforced matrix.

### Open items carried forward

- `export_excel` has no endpoint yet — declared for matrix completeness, recorded as exempt.
- `audit_logs` is Enterprise in the catalog but deliberately not route-gated: every org can still
  read its own history. Gating it would hide an organization's record behind a plan.
- BYO AI, SSO, SCIM, API access, webhooks: Phase 4.
- Grace period on `past_due` before downgrade (7 days proposed) — matters in Phase 3.
