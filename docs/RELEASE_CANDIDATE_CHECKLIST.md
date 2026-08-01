# HireLens Monetization — Release Candidate Checklist

**Created:** 1 Aug 2026 · **Status:** NOT STARTED · **Gate:** nothing ships until every
P0 box here is ticked by a human who ran it

This is the **single document** to follow before calling HireLens monetization
production-ready. It exists so validation happens once, completely, in one
sitting — rather than as scattered manual testing whose coverage nobody can
reconstruct afterwards.

**How to use it.** Work top to bottom. Tick a box only when you have *run* the
thing, not when you believe it works. If a box fails, log it in §11 and keep
going — a partial pass with a written defect list is worth far more than an
abandoned run. Do not tick anything on someone else's behalf.

**Related documents** — this one is the master; these are the depth:

| Document | What it holds |
|---|---|
| `docs/BROWSER_QA_CHECKLIST.md` | The blocker diagnosis and the detailed FREE-journey script (§3 here) |
| `docs/HANDOFF.md` §11 | Known technical debt, no-lock decisions |
| `docs/ROLLBACK.md` | Per-plane rollback runbook |
| `docs/MONETIZATION_ARCHITECTURE.md` | The design being validated |
| `docs/LAUNCH_CHECKLIST.md` | Broader V4 launch items, not monetization-specific |

---

## 0. Prerequisites — do these first or §3 onward is impossible

- [ ] **Chrome extension can reach `localhost`.** Currently it cannot; every tool
      call against a local page returns `Frame with ID 0 is showing error page`.
      Full diagnosis in `BROWSER_QA_CHECKLIST.md` §0. **This blocks §3–§8 entirely.**
- [ ] **Both servers running.** Frontend `:3000`, backend `:8000`,
      `curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health` → `200`.
      Backend must be launched detached (see `HANDOFF.md` §0) or it gets reaped.
- [ ] **A throwaway v1 organization exists.** Every new signup is `v1`. All 68
      existing orgs are `founding` and show **no locks, no meters, no limits** —
      testing on a real account proves nothing and will read as "Phase 2 didn't ship".
- [ ] **A second throwaway account** for the seat-limit and multi-user checks.
- [ ] **3–6 test résumés** (PDF/DOCX, <10 MB). §3 and §7 spend real Groq tokens
      against a **100k tokens/day free tier** — budget the run accordingly and do
      the upload steps early in the day.
- [ ] **`scripts/set_org_plan.py` access** (service-role) to move a throwaway org
      between free/plus/pro/enterprise and to flip `plan_ruleset`.
- [ ] Decide the **run date and owner**. Record both in §12.

---

## 1. Backend verification (P0)

Automated — cheap, run first, and stop if any fail.

- [ ] `cd backend && .venv/Scripts/python.exe -m pytest -q` → **140 passed**
- [ ] `python -m scripts.export_catalog_snapshot` reports **already up to date**
      (a diff here means the catalog changed without the mirror)
- [ ] `python -m tests.test_catalog_snapshot_parity` → PASSED
- [ ] `python -m tests.test_monetization_audit` → PASSED (all 87 routes classified)
- [ ] `python -m tests.test_feature_flag_enforcement` → PASSED

Live database, against the production project:

- [ ] Migrations **0016–0021** all applied; `supabase migration list` shows no drift
- [ ] `subscriptions`: every org has a row; every pre-monetization org is `founding`
- [ ] `campaigns` and `candidate_uploads` fully org-scoped, **0 nulls**
- [ ] `increment_usage` and `usage_snapshot` RPCs callable
- [ ] `authenticated` and `anon` have **no** insert/update/delete on `subscriptions`
- [ ] `PATCH /org/subscription` → **405**; OpenAPI exposes only `['get']`

Enforcement posture:

- [ ] `ENTITLEMENT_ENFORCEMENT` is **on** in the target environment
- [ ] The rollback lever is understood: setting it `off` makes every gate inert
      with denials logged as `entitlement.not_enforced`, **no deploy required**
- [ ] Org-context fan-out degradation confirmed: with the grants/usage reads
      failing, requests still succeed (zero usage, no grants, WARNING logged)

---

## 2. Frontend verification (P0)

Automated.

- [ ] `npx vitest run` → **253 passed**, 22 files
- [ ] `npx tsc --noEmit` → clean
- [ ] `npx eslint .` → **exactly 4 errors**, all `react-hooks/refs` in
      `components/marketing/NeuralBackground.tsx` (known debt, `HANDOFF.md` §11.1).
      **Any fifth error is a regression** and must be triaged before shipping.
- [ ] `npx next build` succeeds
- [ ] `tests/entitlement-surface-coverage.test.tsx` passes — every catalog feature
      has either a client lock or a written reason it needs none

Guard rails that encode the architecture (all inside the suites above — confirm
they ran, they are the ones that fail silently if deleted):

- [ ] Catalog parity, both directions (mutate a label, watch both halves fail, revert)
- [ ] One-visual-language guards: no screen renders `GateState reason="plan"`,
      hardcodes `"Upgrade to <tier>"`, or invents an "available on the … plan" sentence
- [ ] Three-questions guard: every shared upgrade surface renders what / why / what-changes

---

## 3. Browser QA — the FREE journey (P0)

**This is the section that has never been run.** Full script in
`BROWSER_QA_CHECKLIST.md` §1. Use the throwaway **v1** org.

- [ ] Sign up → land in the app; new org resolves ruleset `v1`
- [ ] Inbox loads with no console errors
- [ ] Plan badge in the account menu reads **Free**
- [ ] Résumé meter is **absent** at 0 of 2 (silence below threshold is correct)
- [ ] Upload résumé 1 → succeeds, candidate appears
- [ ] Meter now **appears** at 1 of 2 (last-unit rule) and carries the value
      sentence *"Upgrade to Plus for 25 résumés a month."*
- [ ] Upload résumé 2 → succeeds; meter reads 2 of 2, "No credits left"
- [ ] **Open the upload dialog again → the wall appears BEFORE any file picker,
      before any spinner, before any AI call.** ← the single most important box
      on this page; open since Phase 1
- [ ] The wall answers all three: what ran out · the figure · what upgrading gives
- [ ] Its CTA opens the upgrade dialog
- [ ] Dialog names the tier, the blurb, and what else that tier includes
- [ ] "Contact us to upgrade" opens a mail client (no checkout yet — expected)
- [ ] Quota figures persist across a page reload (server truth, not local state)

Batch behaviour:

- [ ] Reset the org to 2 remaining (`set_org_plan.py`, or a fresh org)
- [ ] Select **5** résumés → warning states *"You selected 5 and have 2 left.
      Analyzing the first 2"*
- [ ] Button reads **"Analyze 2 résumés"**, not 5
- [ ] Run it → exactly **2** candidates created
- [ ] Success toast states the 3 that were not analyzed — truncation is never silent
- [ ] Backend counter incremented by exactly 2 (verify in the DB, not the UI)

---

## 4. Monetization & locked surfaces (P0)

On the FREE v1 org, each must render the **shared** lock — same glyph, same
sentence shape, same CTA:

- [ ] **Ask** → AI Copilot lock, "Upgrade to Pro"
- [ ] **Analytics** → Advanced Analytics lock
- [ ] **Compare** (select 2+ candidates) → locked button, tooltip on hover,
      click opens the dialog, button is **not** disabled
- [ ] **Talent Search** → Semantic Search lock, shown *instead of* the example-query
      empty state, and **no search request fires** (confirm in the network panel)
- [ ] **Interview Intelligence** → lock in place of the generator; the candidate
      table above it still renders
- [ ] Collections in Talent still work while search is locked

Separation of the three axes:

- [ ] A **viewer** role sees "ask an admin" (403 language), never an upgrade prompt
- [ ] An owner on FREE sees upgrade language (402), never "you lack permission"
- [ ] Not-enough-selection on Compare **disables**; not-in-plan **locks** — the two
      states are visually distinct

Navigation:

- [ ] Permission-hidden items stay **hidden** (viewer: no Ask, no Analytics)
- [ ] Entitlement-locked items stay **visible** with the lock mark
- [ ] A locked rail item still navigates, and lands on its lock surface
- [ ] Collapsed rail tooltip reads "… — not included in your plan"
- [ ] Screen reader announces "Not included in your plan" on locked items

Founding regression — **the promise that must not break**:

- [ ] Flip a throwaway org to `founding`
- [ ] **No** locks, **no** meters anywhere; badge reads **Founding**
- [ ] Ask, Analytics, Talent Search, Compare, Interviews all fully usable
- [ ] Unlimited quotas render "Unlimited ✓" in Settings, never a 0/∞ meter
- [ ] Flip back to `v1` → locks return

Paid tiers:

- [ ] PLUS org: Compare and PDF export available; Ask and Analytics still locked
- [ ] PRO org: everything except Enterprise features; résumés unlimited
- [ ] ENTERPRISE org: webhooks reachable
- [ ] A FREE user hitting webhooks is offered **Enterprise**, not the Pro the
      router gate names first

---

## 5. Upgrade flows (P0)

- [ ] Every upgrade CTA in the product reaches the **same** dialog
- [ ] Every upgrade surface answers: what is locked · why want it · what changes
- [ ] No tier name appears that the catalog did not produce
- [ ] **No screen falls back to a generic 402 toast** — walk every locked action
      and confirm; this was the entire justification for Phase 2
- [ ] Seat limit: invite a second member on FREE → 402 → seat wall, not a raw error
- [ ] Role limit: create a 3rd role on FREE → 402 handled
- [ ] Stale-context path: exhaust the quota in a second browser session, then
      submit from the first → the dialog opens and the context refetches
- [ ] `past_due` org keeps working (dunning must not lock a team out mid-week);
      badge shows "Payment due"
- [ ] `canceled` org resolves to FREE limits

---

## 6. Responsive QA (P1)

Every screen touched by Phase 2: Inbox, Roles, Role workspace, Talent,
Interviews, Ask, Analytics, Settings ▸ Billing, and the upgrade dialog.

- [ ] **≥1280** — rail expanded, no horizontal scroll
- [ ] **1279** — rail auto-collapses (`useMediaQuery('(max-width: 1279px)')`);
      locked items keep their affordance in collapsed form
- [ ] **1024** tablet landscape
- [ ] **768** tablet portrait
- [ ] **390** mobile — quota meter, wall, and upgrade dialog all usable
- [ ] Upgrade dialog does not overflow at 390; footer buttons reachable
- [ ] Settings meters reflow (they are a 2-col grid at `sm`)
- [ ] Long feature labels and long org names do not break the badge or the rail
- [ ] No horizontal page scroll at any width

---

## 7. Accessibility (P1)

**No automated a11y tooling is installed** (no axe, no Lighthouse CI, no
Playwright). These are manual — say so in the sign-off rather than implying a
scan ran.

- [ ] Keyboard-only: reach and activate every locked control and the dialog
- [ ] Upgrade dialog traps focus, restores it on close, closes on `Esc`
- [ ] Locked nav items announce their state (sr-only text present, glyph is `aria-hidden`)
- [ ] Quota meter exposes `role="progressbar"` with correct `aria-valuenow`/`max`
- [ ] Lock state is never conveyed by colour or icon alone
- [ ] `npx vitest run tests/contrast.test.ts` passes; spot-check the new
      warning/danger meter colours in **both** light and dark themes
- [ ] Dark mode: every Phase 2 surface — no unreadable text, no invisible borders
- [ ] Screen-reader pass (NVDA or VoiceOver) over one full locked screen and the dialog

---

## 8. Performance (P1)

- [ ] `/org/context` p95 measured — it is **deliberately uncached** and runs on
      nearly every authenticated request. It has caused one ~1s regression before
      (serial reads). Record the number; do not eyeball it.
- [ ] The context fan-out still runs its 6 branches in parallel
- [ ] Adding the entitlement layer did not measurably slow the Inbox first paint
- [ ] No layout shift when the quota meter appears after context resolves
- [ ] Bundle: the catalog mirror is small and the **snapshot JSON is not shipped
      to the browser** (it is a test artifact — confirm it is absent from the build)
- [ ] No request waterfall introduced: locks read the existing context query, and
      the network panel shows **no extra request** per locked surface

---

## 9. Regression testing (P0)

Phase 2 touched shared surfaces. Confirm nothing that used to work stopped.

- [ ] Full recruiter journey on a **founding** org: create role → upload → triage
      → compare → interview → export → decision. Nothing gated, nothing changed.
- [ ] RBAC unchanged: run the role matrix in `docs/security/PERMISSION_MATRIX.md`
      for owner / admin / hiring manager / recruiter / interviewer / viewer
- [ ] Settings ▸ Billing renders correctly — the static limits table was
      **replaced** with meters in Phase 2.3; confirm nothing important was lost
- [ ] The account menu still logs out, switches theme, and links to Settings
- [ ] Left rail: every destination still reachable; no group heading over nothing
- [ ] Add-candidates dialog still works normally for an **unlimited** org
      (no meter, no truncation, no wall)
- [ ] Interview pack generation and its local PDF export work on a PRO org
- [ ] Analytics CSV export still downloads
- [ ] Auth: dev session reset still behaves (`HANDOFF.md` §10.7); production
      login unaffected

---

## 10. Pre-ship gates

- [ ] `docs/HANDOFF.md` §11 debt list reviewed and still accurate
- [ ] The 4 known eslint errors either fixed **or** explicitly accepted for this release
- [ ] Rollback rehearsed: set `ENTITLEMENT_ENFORCEMENT=off`, confirm gates go
      inert, set it back
- [ ] `docs/ROLLBACK.md` reviewed for the release
- [ ] Monitoring: alerting on 402 rate exists, so a misfiring quota is visible
      *before* a customer reports it
- [ ] Support briefed: there is **no self-service upgrade**; CTAs route to
      `support@hirelens.app`, and plan changes are made with `scripts/set_org_plan.py`
- [ ] Pricing page still **not** shipped, and no marketing surface contradicts the
      enforced matrix (the old frame said "Team $499 / Business $999")
- [ ] Commit history structured and reviewed — the work is still uncommitted by
      deliberate decision

---

## 11. Defect log

Record everything found, including cosmetic. One row per defect.

| # | Section | Severity | What happened | Expected | Status |
|---|---|---|---|---|---|
| | | | | | |

Severity: **P0** blocks release · **P1** ship with a written plan · **P2** backlog.

---

## 12. Sign-off

No box may be ticked by someone who did not run it.

| Area | Result | Run by | Date | Notes |
|---|---|---|---|---|
| §1 Backend | | | | |
| §2 Frontend | | | | |
| §3 FREE journey | | | | |
| §4 Monetization | | | | |
| §5 Upgrade flows | | | | |
| §6 Responsive | | | | |
| §7 Accessibility | | | | |
| §8 Performance | | | | |
| §9 Regression | | | | |
| §10 Pre-ship | | | | |

**Release decision:** ☐ Ship ☐ Ship with known issues (listed) ☐ Hold

**Decided by:** ________________ **Date:** ____________

---

## Appendix — what is already verified, and what that is worth

Verified without a browser, so it does not need re-running:

- Backend 140 tests · frontend 253 tests · `tsc` clean
- Catalog parity proven by deliberate mutation in both directions
- Live schema reads: 68/68 `founding`, 0 orgs without a subscription, both RPCs callable
- 24 concurrent `increment_usage` calls → 24, zero lost updates
- Self-upgrade hole closed at both the API and the database grant level
- Audit gates 9/9 live across FREE / PRO / ENTERPRISE on a throwaway account
- End-to-end 12/12 on a throwaway org: context, entitlements, limits, seat quota,
  founding flip and back

What that is **not**: evidence the product renders correctly. The entire risk
concentrated in this checklist is that every Phase 2 surface passes its tests and
is still wrong for a customer — a wall that appears after the spinner, a meter
that never shows, a lock a founding customer should never have seen. §3 and §4
are the ones that would catch it, and neither has ever been run.
