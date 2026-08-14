# HireLens Monetization — Release Candidate Checklist

**Created:** 1 Aug 2026 · **Updated:** 4 Aug 2026 (§2 counts, §6.7 CTA routes,
new §6A Legal pages and §6B Product polish)
**Status:** NOT STARTED · **Gate:** nothing ships until every P0 box here is
ticked by a human who ran it

**Nothing in this document has been verified in a browser.** That includes the
whole of §6, §6A and §6B — a pricing page whose currency preference, accordion
and upgrade dialog are all post-hydration behaviour; four brand-new policy
routes; a mobile disclosure menu; and a drag-and-drop target. None of those can
be evidenced by a passing test.

This is the **single document** to follow before calling HireLens monetization
production-ready. It exists so validation happens once, completely, in one
sitting — rather than as scattered manual testing whose coverage nobody can
reconstruct afterwards.

**How to use it.** Work top to bottom. Tick a box only when you have *run* the
thing, not when you believe it works. If a box fails, log it in §12 and keep
going — a partial pass with a written defect list is worth far more than an
abandoned run. Do not tick anything on someone else's behalf.

**Related documents** — this one is the master; these are the depth:

| Document | What it holds |
|---|---|
| `docs/BROWSER_QA_CHECKLIST.md` | The blocker diagnosis and the detailed FREE-journey script (§3 here) |
| `docs/HANDOFF.md` §11 | Known technical debt, no-lock decisions |
| `docs/ROLLBACK.md` | Per-plane rollback runbook |
| `docs/MONETIZATION_ARCHITECTURE.md` | The design being validated |
| `resume-hero-section/lib/pricing.ts` | The prices §6 checks the page against |
| `docs/LAUNCH_CHECKLIST.md` | Broader V4 launch items, not monetization-specific |

---

## 0. Prerequisites — do these first or §3 onward is impossible

- [ ] **Chrome extension can reach `localhost`.** Currently it cannot; every tool
      call against a local page returns `Frame with ID 0 is showing error page`.
      Full diagnosis in `BROWSER_QA_CHECKLIST.md` §0. **This blocks §3–§9 entirely.**
- [ ] **Both servers running.** Frontend `:3000`, backend `:8000`,
      `curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health` → `200`.
      Backend must be launched detached (see `HANDOFF.md` §0) or it gets reaped.
- [ ] **A throwaway v1 organization exists.** Every new signup is `v1`. All 68
      existing orgs are `founding` and show **no locks, no meters, no limits** —
      testing on a real account proves nothing and will read as "Phase 2 didn't ship".
- [ ] **A second throwaway account** for the seat-limit and multi-user checks.
- [ ] **3–6 test résumés** (PDF/DOCX, <10 MB). §3 and §10 spend real Groq tokens
      against a **100k tokens/day free tier** — budget the run accordingly and do
      the upload steps early in the day.
- [ ] **`scripts/set_org_plan.py` access** (service-role) to move a throwaway org
      between free/plus/pro/enterprise and to flip `plan_ruleset`.
- [ ] Decide the **run date and owner**. Record both in §13.

---

## 1. Backend verification (P0)

Automated — cheap, run first, and stop if any fail.

- [ ] `cd backend && .venv/Scripts/python.exe -m pytest -q` → **493 passed**
      (140 when this checklist was written, then 320, 335, 430; the working tree
      has gained the billing-layer, copilot, Step 4 and grace-sweep suites since
      — see `HANDOFF.md` §1)
- [ ] Boot the service and read the log: `Razorpay plan bindings verified:
      plus, pro`. **A mismatch is fatal in production by design** — the gateway
      charging something the pricing page does not show is the worst defect this
      integration can produce
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

- [ ] `npx vitest run` → **637 passed**, 44 files
- [ ] `npx tsc --noEmit` → clean
- [ ] `npx eslint .` → **clean: exit 0, no output.**
      This line used to read "exactly 4 errors, all `react-hooks/refs` in
      `components/marketing/NeuralBackground.tsx`", with any fifth treated as the
      regression signal. That tolerance is gone as of 14 Aug 2026: the component
      was dead code and was deleted, and the fifth error — in
      `components/hirelens/billing/checkout-provider.tsx`, which the old wording
      did not account for — was fixed. **Any error is now a regression**, which
      is a far cheaper signal to read than "four, but only those four".
- [ ] `npx next build` succeeds
- [ ] `tests/entitlement-surface-coverage.test.tsx` passes — every catalog feature
      has either a client lock or a written reason it needs none

Guard rails that encode the architecture (all inside the suites above — confirm
they ran, they are the ones that fail silently if deleted):

- [ ] Catalog parity, both directions (mutate a label, watch both halves fail, revert)
- [ ] One-visual-language guards: no screen renders `GateState reason="plan"`,
      hardcodes `"Upgrade to <tier>"`, or invents an "available on the … plan" sentence
- [ ] Three-questions guard: every shared upgrade surface renders what / why / what-changes
- [ ] **Truthful-marketing guard** (`tests/marketing-claims.test.ts`, 13 assertions):
      no invented customer, testimonial, outcome metric, security certification,
      data-residency promise, SSO provider list, ATS-integration claim or bias-audit
      claim survives on the public site. **If one of these fails, the fix is to
      delete the claim — not to relax the test** (`HANDOFF.md` §8A)
- [ ] **Legal-config guard** (`tests/legal.test.ts`): `LEGAL_ENTITY_CONFIRMED`
      cannot be true while any placeholder remains in `lib/legal.ts`

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

## 6. Pricing experience (P0)

> **STATUS: ENTIRELY UNVERIFIED.** Every box in this section requires a real
> browser and none has been ticked. The pricing page has only ever been checked
> by unit tests and by curling its server-rendered HTML — which proves the
> markup exists and proves nothing about how it looks, reflows, or behaves once
> hydrated. Treat a green test suite here as no evidence at all.

Prices live in `lib/pricing.ts`; features and limits come from the entitlement
catalog. The whole risk of this surface is the two disagreeing, or the page
quoting a number nobody agreed to.

### 6.1 Currency preference

- [ ] Selector renders with both options, labelled as **currencies**
      ("Indian Rupee (INR)", "US Dollar (USD)") — never as countries
- [ ] Switching INR → USD updates **every** price on the page at once: all four
      cards, and any figure in the Enterprise band
- [ ] Switching USD → INR returns the exact original figures
- [ ] The selected option is visually and programmatically marked
      (`aria-checked`), and the group is reachable by keyboard
- [ ] The initial guess is sensible for your timezone — **and can be overridden**.
      This is the case that matters: a US buyer working from India must be able
      to reach the price they will actually be charged.

### 6.2 Persistence

- [ ] Choose USD → **refresh** → still USD
- [ ] Choose USD → close the tab → reopen `/pricing` → still USD
- [ ] Choose USD → open the **homepage** → its pricing band also shows USD
      (one preference, two surfaces — they must never disagree)
- [ ] Two tabs open: change currency in one → the other follows
- [ ] Clear site data → the guess runs again from scratch
- [ ] Private/incognito window (where `localStorage` can throw): the page still
      renders and the selector still works for that session

### 6.3 Both surfaces agree

- [ ] `/pricing` cards show Free / Plus / Pro / Enterprise in that order
- [ ] Homepage pricing band shows the same four plans at the same prices
- [ ] **Neither surface shows the retired Team / Business tiers or $499 / $999**
- [ ] Homepage "Compare every plan" and the nav "Pricing" both land on `/pricing`
- [ ] Enterprise reads "Custom" on both, never a number

### 6.4 Prices match the config

- [ ] Read `lib/pricing.ts` and check every rendered figure against it, in both
      currencies. Expected today: Plus **₹999 / $19**, Pro **₹2,499 / $49**,
      Free renders "Free", Enterprise renders "Custom"
- [ ] The line under the cards reads **"Prices include GST"** — not "exclude
      applicable taxes". The advertised figure IS the amount charged
      (`net + tax = total`, enforced by CHECK on `billing_invoices`), so the old
      wording would have been contradicted by the first invoice ever issued
- [ ] "/month" appears on paid tiers only — never on Free or Enterprise
- [ ] **No yearly or annual option appears anywhere.** The schema carries a
      yearly field, but `YEARLY_BILLING_ENABLED` is false and the backend has no
      annual period — a visible annual toggle would be a promise the server
      cannot keep
- [ ] No price shows trailing decimals

### 6.5 Comparison table

- [ ] Every catalog feature has a row; every plan has a column
- [ ] Included/excluded marks match the enforced matrix — spot-check AI Copilot
      (Pro+), PDF Export (Plus+), Webhooks (Enterprise only)
- [ ] Limits read as the server enforces them: Free **"2 total"** (lifetime —
      never "2 / month"), Plus "25 / month", Pro and Enterprise "Unlimited"
- [ ] **Desktop (≥1280):** full table visible, no clipping
- [ ] **Tablet (768–1024):** table scrolls **inside its own container**; the
      page itself must not scroll horizontally
- [ ] **Mobile (390):** same — horizontal scroll belongs to the table, never the
      document. Column headers remain readable while scrolling
- [ ] Screen reader announces row and column headers when moving through cells

### 6.6 FAQ accordion

- [ ] First panel is open on load
- [ ] Clicking a question opens it and closes the previously open one
- [ ] Clicking an open question closes it
- [ ] Keyboard: Tab reaches each question, Enter/Space toggles
- [ ] `aria-expanded` flips correctly; the panel is associated with its button
- [ ] Browser find-in-page can locate text inside a **closed** panel

### 6.7 CTA behaviour — signed out vs signed in

**In INR** (the market checkout can actually serve):

- [ ] **Signed out:** Free → "Start free", Plus/Pro → "Start with …", all to
      `/auth/signup`
- [ ] **Signed out:** Enterprise → "Talk to sales" → **`/contact`**, a real page.
      *(Was a bare `mailto:`, which does nothing at all for anyone on webmail
      without a registered protocol handler and fails silently when it fails.)*
- [ ] **Signed in:** Plus/Pro → the **upgrade dialog opens on the pricing page**,
      and it is the *same* dialog a lock or quota wall opens in the product
- [ ] The dialog heading reads **"Move to Pro"**, not "This feature is on Pro",
      and no sentence in it ends in a bare full stop *(the plan-level copy path
      — `HANDOFF.md` §8A)*
- [ ] The dialog answers all three questions: what is locked · why want it ·
      what changes if you upgrade
- [ ] Dialog traps focus, closes on `Esc`, and returns focus to the CTA
- [ ] Dialog renders with product styling on a marketing page — it carries its
      own `.hl` scope, so confirm no unstyled or half-styled panel
- [ ] **Signed in:** Free → "Go to HireLens", not an offer to upgrade downward
- [ ] No CTA is a dead button. There is no checkout yet; the honest route is
      "Contact us to upgrade" → `/contact`, and the dialog states that a person
      applies the change, usually the same working day

**In USD** (quoted, but not chargeable — Razorpay settles INR):

- [ ] Switch to USD: **Plus and Pro CTAs become "Talk to sales" → `/contact`**,
      and no signup funnel is offered
- [ ] **Free is still "Start free"** — nothing is collected for it, so a US
      visitor can still evaluate the product
- [ ] A line under the cards explains why, naming the currency
- [ ] Switch back to INR: the self-serve CTAs return

### 6.8 Currency must not touch entitlements

The single most important check in this section.

- [ ] Switch currency while signed in: **no** lock, meter, badge or gate changes
- [ ] `/org/context` is **not** refetched by a currency change (watch the
      network panel — a display preference must not hit the API)
- [ ] A FREE org still sees exactly the same locks in USD as in INR
- [ ] A founding org still sees no locks in either currency
- [ ] Nothing writes to `subscriptions` or any entitlement state on switch

### 6.9 Theme and polish

- [ ] Light mode: cards, table, Enterprise ink band, FAQ, and the currency
      selector all legible; the featured card is distinguishable
- [ ] Dark mode: same, and the Enterprise band still reads as deliberate rather
      than as a rendering fault
- [ ] Contrast on muted table text, the "—" exclusion marks, and the featured
      badge
- [ ] No layout shift when the currency preference resolves after hydration
- [ ] No console errors or hydration warnings on `/pricing` or the homepage

---

## 6A. Legal pages and public-site truthfulness (P0)

> **These pages did not exist before 4 Aug 2026.** The footer's five links were
> all dead fragment anchors and the signup consent line named two documents that
> had never been published. Detail and rationale in `HANDOFF.md` §8A.

### 6A.1 The blocker — do this before anything else in this section

- [ ] **`resume-hero-section/lib/legal.ts` is filled in.** Registered entity
      name, registration number, registered office, governing jurisdiction, tax
      registration, and a named Grievance Officer (DPDP Act 2023 §13 requires a
      named person, not a shared alias)
- [ ] Counsel has read all four pages
- [ ] `LEGAL_ENTITY_CONFIRMED` flipped to `true`, and `npx vitest run
      tests/legal.test.ts` still passes
- [ ] The **"Draft — not yet in force"** banner is gone from all four pages

**Until every box above is ticked, the policies bind nobody and Razorpay
merchant activation will not accept them.** This is a paperwork blocker, not a
code one.

### 6A.2 The pages themselves

- [ ] `/terms`, `/privacy`, `/refunds`, `/contact` all render
- [ ] Every footer link resolves — from the homepage, from `/pricing`, **and from
      a policy page** (`#security` was the one that silently did nothing off the
      homepage; it is now `/#security`)
- [ ] Signup consent line hyperlinks Terms and Privacy, and both open in a new
      tab without discarding a half-filled form
- [ ] Contact addresses are **selectable text**, not only `mailto:` links
- [ ] Policy pages are readable on mobile (720px measure, one column)

### 6A.3 Mail actually arrives — the one nobody will think to check

- [ ] `hirelens.app` has **MX records**
- [ ] Send a real message to `support@hirelens.app` and confirm **a human
      receives it**
- [ ] Same for `sales@hirelens.app`

> If these fail, `/contact` is a dead end, and the entire upgrade funnel —
> every lock, every quota wall, every 402, the pricing page and the Enterprise
> CTA — terminates in nothing. An unmonitored support address is worse than
> none: it turns "we never replied" into "they wrote and we never knew."

### 6A.4 Nothing untrue has come back

- [ ] No customer logo, testimonial, named person or outcome metric appears
      anywhere on the public site that corresponds to a real, consenting customer
- [ ] No security certification is claimed (no SOC 2, no ISO 27001)
- [ ] No data-residency choice is offered — the honest answer is Singapore, one
      region
- [ ] No SSO provider list, no ATS-integration claim, no bias-audit claim
- [ ] The homepage and `/pricing` give the **same** privacy answer

---

## 6B. Product polish — the 4 Aug fixes (P0/P1)

### 6B.1 Inbox never shows a number it does not know (P0)

The failure being guarded: `/analytics/overview` is gated on `advanced_analytics`
(Pro), and the Inbox is where **every** plan lands. Every Free and Plus
organization was opening the product to four confident zeros.

- [ ] On a **FREE v1** org with at least one role and one candidate: the four
      summary tiles read **"—"**, never `0`
- [ ] The tiles are still **links**, and each still navigates
- [ ] Network panel: **no request to `/analytics/overview` fires** once the plan
      gate has resolved to denied
- [ ] Server logs show **no entitlement-denial event** generated merely by
      opening the Inbox
- [ ] On a **PRO** org the same tiles show real numbers
- [ ] On a PRO org with a genuinely empty pipeline they show `0` — a real zero
      must still read as zero
- [ ] Screen reader announces "count unavailable" on a `—` tile

### 6B.2 First run (P1)

- [ ] Brand-new signup, zero roles → heading reads **"Start with your first
      role"**, and the only CTA is "Create role"
- [ ] Same org after creating a role, with nothing pending → heading returns to
      "No work needs your attention" and "Upload candidates" reappears

### 6B.3 Mobile navigation on the public site (P1)

- [ ] At **390px** the marketing bar shows a menu control
- [ ] Opening it reveals Product, Pricing, Customers, Security
- [ ] **"Sign in" is present and reaches `/auth/login`** — this is the specific
      regression: an existing customer previously had no route into the product
      from a phone
- [ ] Choosing a destination closes the panel
- [ ] The panel follows the ink/canvas palette swap like the bar above it
- [ ] Keyboard: the control is reachable and toggles; `aria-expanded` flips

### 6B.4 Upload: drag-and-drop and rejection feedback (P1)

- [ ] **Drag résumés onto the drop zone → they are added.** *(Before: nothing
      happened, and the browser navigated away to open the PDF, destroying the
      dialog and any staged files.)*
- [ ] The zone highlights while a drag is over it, and un-highlights on leave
- [ ] Drop a mixed selection (PDF + PNG + a >10MB PDF): the valid files are
      added and **the rejected ones are named individually with their reason**
- [ ] A too-big file says its size and the limit; a wrong-type file says so —
      the two messages are different, because the remedies are
- [ ] Clicking the zone still opens the file picker
- [ ] Quota truncation still behaves (§3) — the two notices coexist without
      contradicting each other

### 6B.5 Settings ▸ Billing (P1)

- [ ] A FREE org sees an **"Upgrade to Plus"** button and a "Compare plans" link
- [ ] It opens the same dialog every lock opens
- [ ] A PRO org is offered **Pro → Enterprise**, not Plus
- [ ] An ENTERPRISE org is offered nothing
- [ ] **A `founding` org is offered nothing.** ← the one that matters: founding
      is a *ruleset* whose plan slug normalizes to `free`, so a slug-based CTA
      would offer the grandfathered customers strictly less than they have
- [ ] A member without `org.manage` sees no CTA
- [ ] The note no longer says self-serve upgrade "arrives with the pricing
      release" — that release shipped

---

## 6C. Razorpay Test Mode — the first payment (P0)

> **NOTHING IN THIS SECTION HAS EVER RUN.** No Razorpay account exists, no
> credentials are set, and no plans have been created. Phase 4 Step 4 is code
> complete and blocked here. Every box is a real-gateway action.

### 6C.1 Prerequisites

- [ ] Razorpay account created and **KYC complete**
- [ ] §6A.1 done — Razorpay activation requires the four published legal pages
- [ ] Two **Test Mode** plans created at ₹999 and ₹2,499, **GST-inclusive**.
      Plans are immutable: a wrong amount means a new plan, never an edit
- [ ] `RAZORPAY_KEY_ID` (`rzp_test_…`), `RAZORPAY_KEY_SECRET`,
      `RAZORPAY_WEBHOOK_SECRET`, `RAZORPAY_PLAN_PLUS_INR`, `RAZORPAY_PLAN_PRO_INR` set
- [ ] Boot log reads `Razorpay plan bindings verified: plus, pro`
- [ ] Webhook registered at `POST /api/v1/billing/webhook/razorpay` for all ten
      events in `mapping.HANDLED_EVENTS`

### 6C.2 The happy path, on a throwaway v1 organization

- [ ] Owner starts checkout → `pending_activation`, **no paid access yet**
- [ ] The modal opens with the right plan and the right amount
- [ ] Authorize the mandate with a Razorpay test card
- [ ] `subscription.activated` arrives → organization is `active` and the plan
      is live
- [ ] **The plan became active because of the WEBHOOK, not the callback** —
      confirm by completing a checkout with the browser closed immediately after
      payment
- [ ] `billing_events` has the event with status `processed`
- [ ] `billing_payments` has the charge
- [ ] `subscriptions.plan_version` incremented; the client picked up the change

### 6C.3 Idempotency — redeliver from the dashboard

- [ ] Redeliver the same event → response says `duplicate`
- [ ] **Nothing changed**: no second payment row, no extra `plan_version` bump
- [ ] Redeliver an event whose first attempt failed → it IS reprocessed
      (a row that exists but is not `processed` must not be skipped)

### 6C.4 The unhappy paths

- [ ] A forged signature → **400**, and nothing is written
- [ ] A failed charge → `past_due`, and **the team keeps working**
- [ ] Cancel at period end → access retained until the period ends
- [ ] A founding organization is refused checkout, and a webhook aimed at one is
      refused without writing

### 6C.5 What is still missing after all of the above

- [ ] **A trigger for the grace sweep** — §6D. It is built and tested; nothing
      runs it, so no organization is ever suspended
- [ ] Reconciliation worker (BILL-6), Enterprise activation path (BILL-3)

---

## 6D. Grace sweep — suspension for non-payment (P0)

> Built 5 Aug 2026 (BILL-2). Requires migration 0027, which is applied.
> **The sweep is the only thing in the product that withdraws paid access**, so
> the checks below are weighted heavily toward what it must NOT do.

### 6D.1 Before it can run at all

- [ ] **A trigger exists.** Nothing invokes the sweep today. Recommended: a
      daily cron running `python -m scripts.grace_sweep --apply`. Options and
      trade-offs are in that script's docstring
- [ ] Whoever owns it knows it is **dry-run by default** and needs `--apply`
- [ ] Its output goes somewhere a human reads — exit code 2 means stalled
      dunning that needs investigation

### 6D.2 It suspends the right organizations

On a throwaway v1 org, set `billing_state='grace'` and a past
`grace_period_ends_at`:

- [ ] `python -m scripts.grace_sweep` (no flag) lists it and **writes nothing**
- [ ] `--apply` suspends it; `billing_state='suspended'`, `status='canceled'`
- [ ] The org loses paid access on the very next request (no cached context)
- [ ] `plan_version` incremented, so an open client refetches
- [ ] An audit row exists: `billing.subscription_suspended`, with
      `reason='grace_period_elapsed'` and no user attributed

### 6D.3 It suspends nobody else — the important half

- [ ] A **founding** org in grace past its deadline is **not** suspended
- [ ] A **manual (Enterprise)** org in grace past its deadline is **not** suspended
- [ ] `payment_failed` past its deadline is **not** suspended, and is reported
      as stalled — the gateway has not said retries are exhausted, and our own
      clock must not overrule it
- [ ] `active`, `free`, `pending_activation`, `trialing`, `cancelled` and
      `suspended` are all untouched
- [ ] A grace period that has **not** elapsed is untouched

### 6D.4 Safe to run repeatedly

- [ ] Run `--apply` twice: the second run suspends nothing and writes **no
      second audit row**
- [ ] Run it ten times: still exactly one suspension, one audit row
- [ ] Simulate a customer paying mid-sweep (move the row to `active` between
      runs): the suspension is dropped, not forced
- [ ] Two sweeps overlapping do not produce two suspensions or two
      `plan_version` bumps

---

## 7. Responsive QA (P1)

Every screen touched by Phase 2: Inbox, Roles, Role workspace, Talent,
Interviews, Ask, Analytics, Settings ▸ Billing, and the upgrade dialog. The
pricing page has its own breakpoint checks in §6.5 — do those there rather than
twice.

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

## 8. Accessibility (P1)

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

## 9. Performance (P1)

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

## 10. Regression testing (P0)

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

## 11. Pre-ship gates

- [ ] `docs/HANDOFF.md` §11 debt list reviewed and still accurate
- [ ] The 4 known eslint errors either fixed **or** explicitly accepted for this release
- [ ] Rollback rehearsed: set `ENTITLEMENT_ENFORCEMENT=off`, confirm gates go
      inert, set it back
- [ ] `docs/ROLLBACK.md` reviewed for the release
- [ ] Monitoring: alerting on 402 rate exists, so a misfiring quota is visible
      *before* a customer reports it
- [ ] Support briefed: there is **no self-service upgrade**; CTAs route to
      `/contact`, and plan changes are made with `scripts/set_org_plan.py`.
      The dialog now promises "usually the same working day" — **make sure
      someone can honour that** before it ships
- [ ] No marketing surface contradicts the enforced matrix (the old frame said
      "Team $499 / Business $999"; the Enterprise notes said audit logs were on
      every plan)
- [ ] `lib/legal.ts` filled and `LEGAL_ENTITY_CONFIRMED` true (§6A.1)
- [ ] `hirelens.app` mail confirmed reaching a human (§6A.3)
- [ ] Commit history structured and reviewed — the work is still uncommitted by
      deliberate decision

---

## 12. Defect log

Record everything found, including cosmetic. One row per defect.

| # | Section | Severity | What happened | Expected | Status |
|---|---|---|---|---|---|
| | | | | | |

Severity: **P0** blocks release · **P1** ship with a written plan · **P2** backlog.

---

## 13. Sign-off

No box may be ticked by someone who did not run it.

| Area | Result | Run by | Date | Notes |
|---|---|---|---|---|
| §1 Backend | | | | |
| §2 Frontend | | | | |
| §3 FREE journey | | | | |
| §4 Monetization | | | | |
| §5 Upgrade flows | | | | |
| §6 Pricing experience | | | | |
| §6A Legal pages | | | | |
| §6B Product polish | | | | |
| §6C Razorpay Test Mode | | | | |
| §6D Grace sweep | | | | |
| §7 Responsive | | | | |
| §8 Accessibility | | | | |
| §9 Performance | | | | |
| §10 Regression | | | | |
| §11 Pre-ship | | | | |

**Release decision:** ☐ Ship ☐ Ship with known issues (listed) ☐ Hold

**Decided by:** ________________ **Date:** ____________

---

## Appendix — what is already verified, and what that is worth

Verified without a browser, so it does not need re-running:

- Backend 335 tests · frontend 363 tests · `tsc` clean · `next build` clean
  across 28 routes (the four policy pages prerender static)
- The truthful-marketing guard: 13 assertions keeping nine specific false claims
  off the public site by name
- Upload partitioning: accepted/rejected split, the 10MB boundary, and the
  type-vs-size distinction, unit-tested away from the DOM
- Settings ▸ Billing: the founding organization is never offered an upgrade,
  proven against a `founding` ruleset with a `free` plan slug
- Catalog parity proven by deliberate mutation in both directions
- Live schema reads: 68/68 `founding`, 0 orgs without a subscription, both RPCs callable
- 24 concurrent `increment_usage` calls → 24, zero lost updates
- Self-upgrade hole closed at both the API and the database grant level
- Audit gates 9/9 live across FREE / PRO / ENTERPRISE on a throwaway account
- End-to-end 12/12 on a throwaway org: context, entitlements, limits, seat quota,
  founding flip and back
- Pricing: prices asserted against `lib/pricing.ts`, the comparison table proven
  to derive every row from the catalog, and `/pricing` and `/` both confirmed to
  return 200 with the expected figures in their server-rendered HTML

What that is **not**: evidence the product renders correctly. The entire risk
concentrated in this checklist is that every Phase 2 surface passes its tests and
is still wrong for a customer — a wall that appears after the spinner, a meter
that never shows, a lock a founding customer should never have seen, a
comparison table that pushes a phone sideways. §3, §4 and §6 are the ones that
would catch it, and none has ever been run.

Server-rendered HTML deserves a specific warning, because it is the strongest
evidence gathered so far and it is weaker than it looks: it proves the markup
exists. It says nothing about layout, contrast, focus order, or anything that
happens after hydration — and the currency preference, the FAQ accordion and
the upgrade dialog are *all* post-hydration behaviour.
