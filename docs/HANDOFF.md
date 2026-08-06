# HireLens — Engineering Handoff

**Written:** 2 Aug 2026 · **Updated:** 5 Aug 2026, end of day ·
**Replaces** the previous handoff entirely
(recoverable at `git show e76df63:docs/HANDOFF.md`)

This document is written to be read **alone**. Nothing in it depends on chat
history. If you are opening this repository for the first time — or starting a
new session tomorrow — this is the only file you need to understand where the
project stands.

> **Starting a session? Read in this order.**
> §1 (repository state, and how to run it) → §12 (what is done, what is verified,
> what is blocked) → §11 (**the active milestone: AI Architecture &
> Multi-Provider Foundation**) → §11.3 (the roadmap — the task list) →
> §13 (phase progress) → §9 and **§9A** (standing rules you must not break).
>
> **Working on the AI milestone?** §11 is the plan, §11.3 is the task list,
> §9A is the rules, §13 is the status of record. Update §11.3 and §13 the moment
> a task completes — nowhere else.
>
> If you are about to touch billing, read §5A **first** — it is blocked, and
> five specific shortcuts around that blocker are forbidden by decision.

> **One-line status.** The product, its monetization and its public surface are
> built, enforced and truthful. The billing domain, adapter, repository,
> checkout endpoint, webhook route, lifecycle **and grace sweep** are all
> written and tested offline. **Everything is now blocked on one external
> thing: the Razorpay Subscriptions API returns 401 for this account, and the
> credentials are valid** (§5A). Nothing further can be built against it, and
> nothing is to be worked around.
>
> **Last updated:** 5 Aug 2026, end of day. The **Authentication milestone is
> complete and browser-verified end to end** (§8D) — reveal toggles, forgot
> password, reset password, a real password policy, and `/auth/accept-invite`
> now sharing the reset flow's session-validation architecture rather than
> owning a second copy of it. Preceded by AI discoverability (§8C).
>
> **The active milestone is AI Architecture & Multi-Provider Foundation (§11).
> Phase 0 is complete (3/3) and Phase 1 is in progress (4 of 6).** The plan, the
> roadmap and the rules are recorded in §11, §11.3 and §9A. Implementation
> proceeds **task by task**, each reviewed before the next begins, with §11.3 and
> §13 updated as each completes.
>
> The investigation's conclusion: **the architecture is substantially correct —
> build on it, do not replace it.** The gateway, provider registry, health
> routing and fallback chain already exist and six providers are implemented.
> `AIOrchestrator`'s *structure* is vendor-neutral; only its *calibration* is
> Groq-shaped. The remaining work is proof and calibration, with one genuine
> design gap (capability profiles, Phase 3).
>
> One item was acted on ahead of the milestone: **`GAB-D1` (§8E)**, a blocking
> governance gate failure that put a model vendor's name on every exported PDF.
> Fixed, verified against generated PDFs, and now **guarded by tests in both
> codebases**. It is not Phase 0 work.

---

## 1. Current repository status

| | |
|---|---|
| **Branch** | `manus-ui-v1` |
| **Latest code commit** | `fbc07b2` — *feat(ai): validate provider configuration* (§11.3 Phase 1 task 4; decisions D1.21–D1.27), on top of `136340b` *refactor(ai): centralize retry classification* (task 3; D1.13–D1.20), `561003a` *fix(ai): prevent routing to disabled providers* (task 2; D1.7–D1.12) and `913426f` *refactor(ai): centralize provider error classification* (task 1; D1.1–D1.6). **HEAD is the docs commit on top of them** — this row deliberately names the last commit that changed behaviour, because a row naming its own commit can never be written accurately |
| **Working tree** | **clean** |
| **Last milestone** | Authentication — **COMPLETE and browser-verified** (§8D) |
| **Active milestone** | **AI Architecture & Multi-Provider Foundation** (§11) — **Phase 0 complete (3/3), Phase 1 in progress (4/6)**. Rules: §9A · Roadmap: §11.3 · Progress: §13 |
| **Backend tests** | **714 passed** (682 + 32 provider-validation, 6 Aug 2026) |
| **Frontend tests** | **455 passed**, 33 files (450 + 5 export-attribution guards, 5 Aug 2026) |
| **`tsc --noEmit`** | clean |
| **`eslint .`** | **exactly 4 errors — all known debt** (§10 item 1). A 5th is a regression |
| **`next build`** | succeeds; 40 routes (36 static, 4 dynamic) |

> **On the test counts.** Frontend went 363 → 410 → 442 → 450 → 455; backend
> 493 → 504 → 574 → 611 → 627 → 682 → 714. The discoverability milestone added `tests/discoverability.test.ts`
> (30) and matcher-coverage assertions in `tests/proxy.test.ts` (17); the auth
> milestone added `tests/password-policy.test.ts` (9) and
> `tests/auth-password-ux.test.tsx` (30). No backend code changed in either, so
> 493 stood until `GAB-D1` (§8E) added the export-attribution guards — 11 backend
> and 5 frontend, the last step on the frontend count. Backend then moved twice
> more, both in the AI milestone: **+70** for Phase 0 (evaluation harness, fake
> provider, golden dataset), **+37** for Phase 1 task 1
> (`tests/test_provider_bug_fixes.py`), **+16** for task 2
> (`tests/test_disabled_provider.py`) and **+55** for task 3
> (`tests/test_retry_classification.py`, plus five net in the task-1 file that
> D1.4 required C1 to update) and **+32** for task 4
> (`tests/test_provider_validation.py`).

### Working tree

**Clean.** Everything through the authentication UX milestone is committed, and
so is `GAB-D1` (§8E) — the model vendor's name removed from every exported PDF,
plus the two guards that now keep it out. So is all of Phase 0, and so are
**Phase 1 tasks 1, 2, 3 and 4** (`913426f`, `561003a`, `136340b`, `fbc07b2`) —
each committed on its own, with its own decisions recorded in §11.6.

One thing to expect rather than rediscover: `docs/qa/RUNTIME_VALIDATION_A4.md`
and `RUNTIME_VALIDATION_PROVIDERS.md` **rewrite themselves** whenever
`tests/test_ai_reliability.py` or `tests/test_provider_contract.py` is run. A
dirty tree containing only those two files is a suite that ran, not an edit.

Note on the counts: the fix itself moved **no** test, because nothing asserted on
the old footer. That is the finding, not a footnote — **the string was never
pinned**, which is how it survived months of review on a customer-facing
artifact. The +16 comes from the guards written afterwards. See §8E.

```
                                                    ── AI discoverability (§8C) ──
7c0d20a fix(marketing): correct the semantics a machine reader actually sees
11f35c9 feat(seo): describe HireLens to machines, generated from the product
c5d0970 feat(seo): serve /llms.txt, security.txt and humans.txt
d924625 perf(proxy): stop authenticating crawlers on public pages
f7045d8 test(seo): pin the discoverability guarantees
993b1ea docs: record the AI discoverability milestone, and correct §1
                                                    ── Authentication UX (§8D) ──
23c22a4 feat(auth): a password you can read back, and a rule you can see
3e71f23 fix(auth): validate the recovery session before offering the reset form
1b74dd1 feat(auth): finish the sign-in, sign-up, forgot and invite screens
b7d4b66 fix(auth): stop claiming a SOC 2 audit on the sign-up screen
ad5c358 test(auth): pin the authentication UX guarantees
3f3d26f docs: record the authentication UX milestone
40e2695 fix(auth): give accept-invite the reset flow's session validation
64302d6 test(auth): cover the invite state machine, and fix a matcher
65a43dd docs: close the authentication UX milestone   ← HEAD
```

Five deleted marketing PNGs are **deliberate** (§8A) — invented customer logos
and a stock portrait attached to a fabricated testimonial, still live at their
public URLs after the markup stopped referencing them.

Also present in `git status`: **122 deletions under `Manus Design/`**. Those are
the **user's** deliberate deletions, unrelated to this work. Leave them alone.

> **Do not round-trip this file through `Get-Content | Set-Content` on Windows.**
> PowerShell 5.1 reads UTF-8 as ANSI and writes it back double-encoded, mangling
> every `—`, `é` and box-drawing character in the document. On 4 Aug a
> `git checkout --` run to undo exactly that mistake discarded an entire
> uncommitted revision. Edit source files with the editor tool only; that same
> corruption was reproduced a second time on 5 Aug on `pricing-faq.tsx`.

### Running it

```bash
# Frontend
cd resume-hero-section && npx next dev            # :3000

# Backend  ← forgetting this costs an hour
cd backend && .venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Verify: `curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health` → `200`.

A backend started as a tracked background shell gets reaped between turns. Launch
it detached:

```powershell
Start-Process -FilePath "E:\Resume-Parser\backend\.venv\Scripts\python.exe" `
  -ArgumentList "-m","uvicorn","app.main:app","--host","127.0.0.1","--port","8000" `
  -WorkingDirectory "E:\Resume-Parser\backend" -WindowStyle Hidden
```

Every `next dev` restart signs you out on purpose — `lib/dev-session-reset.ts`
expires Supabase cookies on a new boot id so nobody tests against a stale token.
`HL_DEV_PERSIST_SESSION=1` opts out. Production is untouched.

---

## 2. Project timeline

Each entry is *why it existed*, not what it changed.

**Resume Intelligence Platform (V1–V4).** A hybrid hiring product: deterministic
Python for every score, an LLM for human-grade reasoning, and persistence so the
analysis survives the session. V4 rebuilt the product experience around one
idea — bring the few candidates who matter into focus and help a human make, and
defend, the decision.

**Monetization Phase 1 — server enforcement.** Made the plan mean something.
Introduced a commercial axis deliberately *separate* from permissions:
authentication (401), authorization (403), entitlement (402). Closed a live hole
where any organization owner could grant themselves Enterprise for free.

**Phase 2 — entitlements and UI (2.1–2.5).** Turned a correct 402 into a product
surface. Built horizontally — catalog, then primitives, then screens — so one
visual language existed before any screen consumed it. 2.5 closed the two locks
2.4 believed were already done.

**Phase 3 — pricing experience.** A public `/pricing` page whose comparison
table is generated from the entitlement catalog, so what is advertised and what
is enforced cannot drift. Market-specific pricing (INR and USD as independent
decisions, never an FX conversion).

**Documentation cleanup.** Audited all 99 project documents against a reference
graph; archived 23 completed reports; deleted nothing. Fixed every dead link.

**Billing architecture.** Designed the payment layer before writing any of it.
Razorpay-only for V1 (India), behind a provider abstraction.

**Billing Step 1 — schema.** Five migrations (0022–0026) applied to production:
provider-neutral columns, billing events, payments, invoices, reconciliation.

**Subscription recovery RCA.** The pre-migration snapshot found 70 organizations
and **one** subscription row. Root cause: test-account teardown deleted rows
directly. Only 2 real customers were affected; both restored as `founding`.

**Billing Step 2 — domain.** Provider-agnostic models, state machine, invariant
and a fake provider. Fully testable with no gateway.

**Billing Step 3 — Razorpay adapter.** The real integration: signatures,
mapping, plan bindings, event translation, capabilities. Offline-tested.

**Product polish (4 Aug 2026).** A full first-paying-recruiter audit of the whole
surface, then a fix pass over every P0 and eight P1s. The audit found 46 issues;
the theme of the P0s was that **the shopfront made claims the product could not
keep.** Four invented customer logos, two fabricated testimonials (one with a
stock portrait and a named person who does not exist), four measured-sounding
outcomes nobody measured, a SOC 2 Type II audit that never happened, a choice of
data residency across three regions when the whole deployment is one database in
Singapore, ATS integrations that are not built, and a
continuously-audited-for-bias claim on a product in a regulated category.

None of it was malicious. Every line was written by someone reasonable filling a
slot in a design comp — which is exactly why review would not keep it out, and
why the constraints are now asserted by `tests/marketing-claims.test.ts` rather
than remembered. Detail in §8A.

**Billing Step 4 — the integration (4 Aug 2026).** Checkout endpoint, callback
verification, cancellation, webhook route, lifecycle processing and persistence.
Insert-first idempotency on the `(provider, event_id)` composite key; the API is
re-fetched after every webhook rather than trusting the payload.

**Billing audit and BILL-1 (5 Aug 2026).** A review pass found two defects in
Step 4's own code. An upgrade between paid tiers returned an unhandled 500
(`active -> pending_activation` is illegal by design); it now refuses cleanly
with a route the customer can take. And the eight-value `BillingState` could not
survive a database round trip — the five-value `status` column collapsed
`payment_failed`/`grace` and `free`/`suspended`/`cancelled`, and the
reconstruction guessed. Migration 0027 stores the state itself alongside the
projection, as an enrichment that may never contradict `status`.

**Billing BILL-2 — the grace sweep (5 Aug 2026).** The thing that ends a dunning
cycle. `due_for_suspension()` and `expire_grace()` had existed and been correct
since Step 2 with nothing calling them, so no organization was ever suspended and
the grace period was unbounded. Built as a CLI-invoked service, dry-run by
default, idempotent, concurrency-safe — and deliberately left untriggered until
there is a dunning cycle to end (§5A).

**AI discoverability (5 Aug 2026).** The public surface could be read by a
person and not by a machine. Robots, sitemap, canonicals, Open Graph and
schema.org — all *generated* from the catalog, pricing and legal modules, so
nothing is stated twice — plus a `/llms.txt` whose most useful section is the
product's own limitations. Detail in §8C.

**Authentication (5 Aug 2026).** Passwords were write-only, and the two screens
reached by an emailed link rendered their forms having verified nothing. Both
fixed, the second by extracting a shared session-validation hook rather than
copying one screen's logic into the other. Browser-verified end to end against
real Supabase, including a real password change and a real invite acceptance.
Detail in §8D.

---

## 3. Billing architecture (current state)

**This section is the authoritative architectural reference.** Razorpay-specific
depth in `docs/BILLING_ARCHITECTURE.md`.

### The layering, and the one-way dependency

```
┌───────────────────────────────────────────────────────────┐
│  app/enterprise/     ENTITLEMENT — decides access         │
│  Reads `subscriptions`. NEVER imports app/billing.        │
└──────────────────────────▲────────────────────────────────┘
                           │ writes plan state
┌──────────────────────────┴────────────────────────────────┐
│  app/billing/domain/     PROVIDER-AGNOSTIC                │
│  Money · Subscription · BillingState · state machine ·    │
│  invariants · capabilities · BillingProvider port         │
└──────────────────────────▲────────────────────────────────┘
                           │ BillingProvider
        ┌──────────────────┴──────────────────┐
        │                                     │
┌───────┴──────────────┐        ┌─────────────┴─────────────┐
│ providers/razorpay/  │        │ providers/fake.py         │
│ the ONLY package     │        │ in-memory; no network     │
│ that imports the SDK │        │                           │
└──────────────────────┘        └───────────────────────────┘
```

### Entitlements (`app/enterprise/`) — unchanged by billing

Decides what an organization may *do*. `catalog.py` is the single source of
truth for plans, 22 features with `min_plan`, and limits — and contains **no
money**. Enforcement is `require_entitlement` / `require_quota` on routes;
denials are 402 with a structured body. `ENTITLEMENT_ENFORCEMENT=off` is the one
rollback lever: every gate inert, no deploy.

### Billing domain (`app/billing/domain/`)

- **`Money`** — minor units, always. Rejects floats, bools, negatives and
  cross-currency arithmetic.
- **`BillingState`** (8 values) vs **`BillingStatus`** (5 persisted). Two
  vocabularies on purpose: the machine needs distinctions the database column
  does not carry. `to_status()` projects between them.
- **`Subscription`, `Payment`, `Invoice`, `BillingEvent`** — immutable
  dataclasses. `Invoice` enforces `net + tax == total` where it is built.
- **`state_machine.py`** — every legal edge, named operations, grace sweep.
- **`invariants.py`** — pure; takes rows, returns findings, never repairs.
- **`capabilities.py`** — what a gateway can do, declared.

### The `BillingProvider` port

Seven operations: `ensure_customer`, `start_subscription`, `fetch_subscription`,
`cancel_subscription`, `verify_webhook`, `verify_client_callback`,
`list_invoices` — plus `id` and `capabilities`. Short on purpose: every method
is a tax on the next provider.

### Razorpay adapter (`app/billing/providers/razorpay/`)

`config.py` (env credentials, test/live detection) · `signatures.py` (two
independent paths) · `mapping.py` (status and event vocabulary) · `plans.py`
(immutable plan bindings + boot check) · `events.py` (webhook → `BillingEvent`)
· `provider.py` (`RazorpayProvider`).

### Fake provider (`app/billing/providers/fake.py`)

A real implementation of the port, backed by dictionaries. Models the awkward
paths — declined mandates, exhausted retries, forged signatures — not just the
happy one. **The entire domain is testable with no credentials and no network.**
If this file could not exist, the port would be decorative.

### Health checks

`/health` is unchanged and cheap — it does **not** run the billing check.
`/health?check=billing` runs the invariant: **200** when healthy, **503 with
`"status": "degraded"`** on a critical finding, so uptime monitoring sees it and
not only whoever reads bodies. A failed check returns 200 with `checked: false` —
unknown is not unhealthy. Startup logs the result and continues rather than
refusing to boot, because the failure being guarded against is a silent
demotion, not an unsafe state.

### The subscription invariant

**Every active organization must have exactly one subscription row.**

A missing row resolves to `v1` at read time, which is right for a new
organization and a **silent demotion** for a grandfathered one. That is not
hypothetical — it happened (§4). Missing data is now an integrity error, never a
default. Critical: missing, duplicate. Non-critical: provider-mode without a
subscription id, founding with a gateway subscription, grace without a failure.
Orphaned organizations are excluded by default; 67 exist, and reporting them
would bury two real problems under sixty-seven pretend ones.

### Capability matrix

| Capability | Razorpay | Note |
|---|---|---|
| `supports_pause` | ✅ | only from `active` |
| `supports_resume` | ✅ | only from `paused` |
| `supports_proration` | ❌ | no Stripe-style proration |
| `supports_customer_portal` | ❌ | **we build that surface** |
| `supports_plan_change` | ✅ | via subscription update |
| `supports_partial_refund` | ✅ | |
| `supports_gateway_reactivation` | ❌ | cancelled is **terminal** — resubscribing creates a NEW subscription |
| `requires_total_count` | ✅ | no unbounded subscription |
| `supports_immediate_plan_change` | ❌ | schedules at cycle end |

### State machine

```
free               -> pending_activation, trialing, active
pending_activation -> active, trialing, free, cancelled
trialing           -> active, payment_failed, cancelled, free
active             -> payment_failed, cancelled, active
payment_failed     -> active, grace, cancelled
grace              -> active, suspended, cancelled
suspended          -> cancelled, pending_activation
cancelled          -> pending_activation, active, free
```

| State | Persists as | Paid access |
|---|---|---|
| `free` / `pending_activation` | `canceled` / `incomplete` | ✗ |
| `trialing` / `active` | `trialing` / `active` | ✓ |
| **`payment_failed` / `grace`** | **`past_due`** | **✓ retained** |
| `suspended` / `cancelled` | `canceled` | ✗ |

**`grace -> suspended` is the only edge that withdraws access**, and a test
scans the whole table to prove it. Grace is **7 days**. Illegal transitions
raise `IllegalTransitionError` naming both states.

Razorpay maps in: `pending` → `payment_failed` (still retrying), `halted` →
`grace` (retries exhausted), **`paused` → `active`** (a pause is not a payment
failure and must never start a dunning clock), `completed` → `active` (renew,
never expire).

### Why the domain never imports Razorpay

Three reasons, in order of weight:

1. **Billing rules must be reviewable without knowing a gateway's API.** A rule
   buried in vendor vocabulary cannot be checked by someone reasoning about the
   business.
2. **Entitlement must survive a gateway incident.** Access is decided from
   Postgres; nothing in the request path calls Razorpay. A Razorpay outage must
   not become an outage for customers who have already paid.
3. **A second gateway should be an addition, not an audit.** Provider-specific
   constraints are declared as capabilities, so no `if provider == …` scatters
   through the codebase.

Enforced by tests, not intentions: no module outside
`app/billing/providers/razorpay/` may import the SDK or name a gateway concept;
`app/enterprise/**` may not import `app/billing/**`. Proven by deliberately
injecting a violation and watching three tests fail.

---

## 4. Database status

Supabase project `vmqhigckfkedkwfkvnij` (ap-southeast-1, Postgres 17.6).
**Migrations 0001–0027 all applied** (0027 on 5 Aug 2026). There is no CLI and
no SQL-exec RPC in this project, so migrations are run by hand in the Supabase
SQL editor — which is why the repository tolerates a column being absent.

| Migration | Introduced |
|---|---|
| `0016_subscription_plan_state` | 9 plan-state columns; backfilled every existing org to the `founding` ruleset; CHECK-pinned the status vocabulary; **revoked client writes to `subscriptions`** |
| `0017_usage_counters_atomic` | `increment_usage()` — single-statement upsert-add replacing a read-modify-write |
| `0018_org_scope_usage_sources` | `organization_id` on `candidate_uploads` and `campaigns` — quotas are org limits, not per-recruiter |
| `0019_entitlement_grants` | Commercial add-ons above plan: attributed, expiring, service-role only |
| `0020_usage_backfill` | Seeded résumé counters from upload history |
| `0021_usage_snapshot` | `usage_snapshot()` — all four quota counts in one round trip |
| `0022_billing_subscription_state` | Renamed `stripe_*` → `billing_*` before either was written; added `billing_provider`, `billing_mode` (none/provider/manual), grace-period fields, manual-activation attribution |
| `0023_billing_events` | Webhook idempotency: `(provider, event_id)` composite primary key |
| `0024_billing_payments` | One row per charge attempt — what was **charged** |
| `0025_billing_invoices` | What was **billed**; GST-inclusive with `net + tax = total` enforced by CHECK |
| `0026_billing_reconciliation` | Reconciliation run history, so drift is visible rather than silently repaired |
| `0027_subscription_billing_state` | `billing_state` — the domain's 8-value state alongside the 5-value `status` projection, because the projection could not be inverted (BILL-1). Additive, nullable, idempotent. Applied 5 Aug 2026; all 4 rows backfilled to `active` |

### The subscription recovery

A pre-migration snapshot found **70 organizations and one subscription row**.

Root cause (full analysis: `docs/rca/SUBSCRIPTION_ROWS_MISSING.md`): test-account
teardown deleted rows directly. `pg_stat_user_tables` shows 83 subscription
deletions against only 8 organization deletions, so cascade explains at most 8
and at least 75 were direct. No repository code can do it — the script that did
is not in version control, which is the real failure.

**Only 3 of 70 organizations are real.** 67 are orphaned shells with no
recruiter, no members and no data. Two real customers had lost their `founding`
status and were restored by `scripts/restore_founding_subscriptions.py`
(dry-run by default, `--reason` mandatory, refuses if the count is unexpected,
selects **by rule** rather than by pasted id).

**Current production state:**

```
organizations     70      subscriptions      3   (2 founding, 1 v1)
recruiters         3      billing_events     0
                          billing_payments   0
                          billing_invoices   0
```

The old `enterprise` value was **not** restored: the audit log shows it came
from the self-upgrade hole Phase 1 removed.

---

## 5. Razorpay integration status

### Built and tested (offline)

- **Provider abstraction** — `BillingProvider` port with declared capabilities.
- **Webhook signature verification** — HMAC-SHA256 over the **raw** body with
  `RAZORPAY_WEBHOOK_SECRET`, case-insensitive header lookup, constant-time
  compare, and a `TypeError` if handed a parsed body.
- **Checkout callback verification** — HMAC over `payment_id|subscription_id`
  with the **key secret**. This is the *reverse* of the Orders form
  (`order_id|payment_id`) that almost every online example shows. **Two
  independent paths that share no implementation.**
- **Webhook event mapping** — all ten subscription events; anything else is
  recorded as `ignored`, never dropped.
- **Plan binding validation** — `verify_bindings()` asserts the gateway charges
  what the pricing page advertises. Intended for boot: a mismatch between the
  page and the card is the worst defect this integration can have.
- **Event translation** — verified envelope → `BillingEvent`, keyed on the
  `x-razorpay-event-id` **header** (the envelope carries no event id of its own).
- **Capability declarations** — §3.
- **Test coverage** — 77 adapter tests; 165 across the whole billing layer. None
  needs a network, credentials, or the gateway.

### Built in Step 4 (4 Aug 2026) — code complete, NEVER RUN AGAINST THE GATEWAY

- **Checkout endpoint** — `POST /billing/subscriptions`, owner-only, refusing
  founding organizations, Enterprise, Free, non-INR, and an org already on the
  plan.
- **Callback verification** — `POST /billing/subscriptions/verify`. Grants
  nothing; `plan_active` is always `false` and says so in the response body.
- **Cancellation** — `POST /billing/subscriptions/cancel`. Gateway first, row
  second.
- **Webhook route** — `POST /billing/webhook/razorpay`, unauthenticated by
  necessity, raw-body signature verification, insert-first idempotency.
- **Lifecycle processing** — re-fetch from the API, map through the state
  machine, persist. `app/billing/service.py`.
- **Persistence** — `app/billing/repository.py`, including the reconstruction of
  the lossy `BillingState` → `status` projection on read.
- **Boot-time plan-binding check** — fatal in production when the gateway's
  price disagrees with the published one.

### NOT BUILT YET

- Billing UI beyond plan display, meters and an upgrade CTA (§8A) — no price,
  no renewal date, no payment method, no invoices, no self-serve cancel **in the
  interface** (the endpoint exists)
- Invoices surface, billing portal, dunning worker, refunds
- Reconciliation worker
- **The grace sweep's *trigger*.** The sweep itself was built and tested as
  BILL-2 later the same day (`app/billing/grace.py`, `scripts/grace_sweep.py`);
  what does not exist is anything that *invokes* it, so no organization is ever
  actually suspended today. Deferred on purpose — §5A, BILL-T1.

---

## 5A. THE CURRENT BLOCKER — Razorpay Subscriptions is not available

**Investigated 5 Aug 2026. Read this before touching anything billing-related.**

### What was found

Razorpay test credentials are present in `backend/.env.local` and are **valid**.
The Subscriptions API rejects them anyway:

```
$ python -m scripts.razorpay_plans --doctor

  key id     rzp_test_TKb…
  mode       TEST
  secret     set (24 chars)
  webhook    — NOT SET —

  ✓ authentication   HTTP 200      /v1/payments
  ✗ subscriptions    HTTP 401      /v1/subscriptions
  ✗ plans            HTTP 401      /v1/plans
```

**The credentials are not the problem.** The same key pair that gets 401 from
Subscriptions gets **200 from `/v1/payments`**. Razorpay returns a bare
`{"error":"Unauthorized"}` in both cases, so a 401 read on its own looks exactly
like a mistyped secret. It is not one, and regenerating the keys will not help.

The inference — strong, but an inference, because Razorpay gives no explicit
message: **the Subscriptions product is not enabled on the account.** Razorpay
API keys are account-wide rather than per-product scoped, so authentication
succeeding on one product and failing on another has no other plausible cause.
Most likely tied to KYC being incomplete (a physical PAN card is outstanding).

> **The lesson worth keeping:** probing an endpoint that is *known to work* is
> what separates "your key is wrong" from "this product is not switched on".
> Those have completely different fixes and the error message distinguishes
> neither. `scripts/razorpay_plans.py --doctor` encodes the probe so nobody has
> to rediscover it.

### A defect this investigation surfaced

The credentials had been in `.env.local` the whole time and **billing could not
see them**. `pydantic-settings` loads those files into the `Settings` object, not
into `os.environ` — and the billing modules read `os.environ` directly, on
purpose, because gateway secrets should not be typed application settings with
defaults.

The failure mode was the worst kind: `missing environment variable:
RAZORPAY_KEY_ID` while looking straight at a file that plainly contained it.
Fixed in `app/core/config.py` (`_export_env_files_to_environ`, `override=False`
so a real process variable still wins over a file).

### What is needed, in order

1. **Enable Subscriptions** — Dashboard → Account & Settings → Products.
   Re-run `--doctor` and require `✓ subscriptions HTTP 200`.
   If it cannot be enabled before KYC completes, **everything below waits.**
2. **Create the webhook secret** — Dashboard → Settings → Webhooks. Set
   `RAZORPAY_WEBHOOK_SECRET`. Subscribe to the ten events in
   `mapping.HANDLED_EVENTS`.
3. **Expose the webhook publicly** — Razorpay cannot reach `localhost`. A tunnel
   (`cloudflared` / `ngrok`) or a deployed backend. **Decision outstanding.**
4. **Create the plans** — `python -m scripts.razorpay_plans --create`. Idempotent:
   it searches on amount/period/currency before creating, which matters because
   **Razorpay plans are immutable and undeletable** — a hand-made plan with the
   wrong amount is permanent clutter. `--manual` prints dashboard fields and cURL
   for doing it by hand.
5. **Boot and confirm** `Razorpay plan bindings verified: plus, pro`. A price
   mismatch is fatal in production by design.
6. **Then** Step 5 items 4, 5 and 9 — subscription creation, checkout UI, and an
   end-to-end test-mode payment.

### What must NOT happen while this is blocked

Recorded because each is a tempting shortcut, and all are standing decisions:

- **Do not build checkout UI** against an API that has never returned a
  subscription. The handoff shape would be guesswork and the mismatch would
  surface later, at a worse moment.
- **Do not create placeholder plans.** Plans are immutable; a placeholder is
  permanent.
- **Do not work around the restriction** — no fake provider in production paths,
  no "temporary" bypass of the state machine, no stubbed subscription ids.
- **Do not switch to Stripe.** Explicitly not wanted; the port exists so a second
  provider stays an addition rather than an audit.
- **Do not wire a trigger for the grace sweep** — no cron endpoints, no GitHub
  Actions, no background workers, no in-process schedulers. Decided 5 Aug 2026
  and explained below.

### The grace sweep's trigger is deferred on purpose

`app/billing/grace.py` and `scripts/grace_sweep.py` are complete and tested
(BILL-2), and **nothing invokes them**, so no organization is ever suspended.

That is a decision, not an omission. The sweep exists to end a dunning cycle,
and there is no dunning cycle: no payment has ever been taken, no subscription
has ever existed, and every `billing_state` in production is `active`. Wiring a
scheduler now would add deployment surface — a cron, an authenticated endpoint,
or a worker — to run a job that can only ever find zero rows, and each of those
is a thing to secure, monitor and eventually debug.

The trigger is a one-line decision that can be made when the billing flow is
complete, without any redesign: the sweep is already idempotent, concurrency-safe
and dry-run by default. Recommendation, when the time comes: a daily cron running
`python -m scripts.grace_sweep --apply`. Options and trade-offs are in that
script's docstring. Tracked as **BILL-T1**.

Until then the grace period is unbounded — which is exactly the behaviour that
existed before the sweep was written, so nothing regresses by waiting.

---

## 6. Current production reality

- **Founding subscriptions restored** — 2 real organizations, audited.
- **Recovery script committed** — `scripts/restore_founding_subscriptions.py`,
  idempotent, reversible.
- **Subscription invariant exists** — surfaced at `/health?check=billing` and on
  startup. Committed.
- **Billing schema applied** — 0022–**0027** live; all billing tables empty.
- **No real payment has ever been processed.** Not one rupee has moved.
- **Razorpay Test Mode only.** No live credentials are configured anywhere, and
  the adapter refuses a key id that is neither `rzp_test_` nor `rzp_live_`.

---

## 7. Environment requirements

```
RAZORPAY_KEY_ID          rzp_test_…   test-mode key id
RAZORPAY_KEY_SECRET                   test-mode key secret
RAZORPAY_WEBHOOK_SECRET               webhook secret, set in the dashboard
RAZORPAY_PLAN_PLUS_INR   plan_…       Razorpay plan for Plus  (₹999)
RAZORPAY_PLAN_PRO_INR    plan_…       Razorpay plan for Pro   (₹2,499)
```

Read from the environment only — nothing hardcoded, no defaults that would
work. `RazorpaySettings.__repr__` redacts, so a secret cannot reach a traceback.

**The two plans must be created in Razorpay before Step 4.** Plans are
**immutable** — "once a Plan is created, you cannot edit or delete it" — so a
price change means a new plan object and a rebind, never an edit. Amounts must
match `resume-hero-section/lib/pricing.ts`: ₹999 and ₹2,499, **GST-inclusive**
(the advertised price is what the customer pays, and as of 4 Aug the pricing
page says so — see §8A).

Existing product variables are unchanged: `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_*`, `GROQ_API_KEY`,
`ENTITLEMENT_ENFORCEMENT`.

---

## 8. Verified vs NOT verified

### Verified

- Backend **714** tests, frontend **455** tests, `tsc` clean, `next build`
  succeeds across 40 routes — including the four policy routes and the five
  agent files (`robots.txt`, `sitemap.xml`, `llms.txt`, `humans.txt`,
  `.well-known/security.txt`), all of which prerender as static.
- Catalog parity proven **bidirectionally** by deliberate mutation.
- Migrations 0022–**0027** applied to production. For 0022–0026 every CHECK was
  tested by attempting a real write against the live database (negative amounts,
  refund > amount, `provider='stripe'`, the GST invariant, `corrected > drift` —
  all rejected). 0027 is additive and nullable; its backfill was confirmed by
  query (all 4 rows `active`).
- `bigint` range: 50,000,000,000 paise accepted where `integer` would overflow.
- Idempotency: a duplicate `(provider, event_id)` rejected by the live database.
- RLS: anonymous denied on events/payments/reconciliation; empty set on invoices.
- `SELECT *` returns 25 columns and still deserializes through the real
  repository path.
- The 2 founding restorations, confirmed by query afterwards.
- `/health?check=billing` → `{"healthy": true, "problems": 0}` against live data.
- Architectural boundaries proven by injecting violations and watching the
  guards fail.
- Razorpay mapping verified against **current documentation**, fetched 1 Aug 2026.
- **The public machine-readable surface** (§8C) — Playwright with JS disabled
  against `next start`: JSON-LD parses on all six public pages, canonicals and
  `og:image` resolve, `/auth/*` serves `noindex, follow`, all five agent files
  serve 200 and prerender static.
- **Every authentication flow** (§8D) — Playwright against `next start` and a
  real Supabase project: sign-in, sign-up validation, forgot password, reset
  password **with and without a session**, and invite acceptance from a real
  generated invite link. A password was genuinely changed and restored; an
  invite was genuinely accepted and the account deleted afterwards. 88 checks
  across three scripted passes.

### NOT verified — every one of these is genuinely unknown

- **First checkout.** The endpoint exists and is tested against a fake. Nobody
  has ever started a real one.
- **Webhook delivery.** The route exists. Razorpay has still never sent us
  anything, so the signature path has never seen a genuine Razorpay HMAC — only
  one this codebase generated.
- **A real payment.** Zero — not even in test mode.
- **End-to-end subscription lifecycle.** Every transition is unit-tested against
  a fake; none has ever been driven by an actual gateway.
- **Anything requiring the Subscriptions API.** `RAZORPAY_KEY_ID` and
  `RAZORPAY_KEY_SECRET` **are** present and valid as of 5 Aug (§5A) — it is
  `RAZORPAY_WEBHOOK_SECRET` and both plan ids that are unset, and the
  Subscriptions product that is switched off. A test-mode payment is blocked on
  that, not on code.
- **Browser QA — PARTIALLY DONE, and this entry was wrong for two days.** It
  read "nothing has ever been seen in a browser". That stopped being true on
  **3 Aug 2026**, when the blocker was resolved by dropping the Chrome extension
  for Playwright (`tests/visual/*.mjs` + `scripts/seed_qa_org.py`), and a real
  runtime pass was driven. `BROWSER_QA_CHECKLIST.md` §0b is authoritative and
  keeps three tiers apart — *runtime verified*, *verified by construction*, and
  *not verified at all*. Read that, not this.

  Verified in a real browser: sign-in end to end, shell navigation and rail
  collapse, ⌘K, pipeline table and board keyboard/focus-trap paths, the
  candidate drawer, Analytics, Ask, Talent search, Settings, live theme toggle,
  overscroll containment, `/pricing` card baseline alignment in both themes, and
  a ~170-shot sweep of every route × light/dark × 1440/1280 with zero horizontal
  overflow.
- **Most of what was built on 4–5 Aug is NOT in that pass**, because it
  postdates it: the four policy pages, the mobile disclosure menu, the drop
  zone, the plan-level upgrade dialog, the Settings ▸ Billing CTA, the Inbox
  em-dash states and the homepage marketing rewrite. Passing tests and a clean
  build prove the markup and the logic; they prove nothing about how any of it
  looks.

  **Two exceptions, both driven in a browser on 5 Aug:** the machine-readable
  public surface (§8C) and **every authentication screen** (§8D). Those are
  genuinely verified, including mobile at 390px for the auth routes.
- **Also still unverified** (§0b): marketing home, Ledger, Notifications,
  Learning, Foundations; the New-role, upgrade and Add-to-collection dialogs;
  the real upload path and the résumé wall end to end; motion *quality*;
  `prefers-reduced-motion` actually set; any interaction below 1440.
- **`hirelens.app` mail.** Whether MX records exist and whether anyone reads
  `support@` / `sales@`. If they do not, `/contact` is a dead end and the whole
  upgrade funnel still terminates in nothing (§8A).
- **Billing UI.** Beyond what §8A added, it does not exist.
- **The pricing page visually.** Server-rendered HTML was checked with curl,
  which proves the markup exists and nothing about layout, contrast, focus order
  or anything post-hydration — and the currency toggle, the FAQ accordion and
  the upgrade dialog are *all* post-hydration behaviour.
- **The résumé wall end to end.** Open since Phase 1.
- **Razorpay plan bindings.** No plans exist; `verify_bindings()` has never run
  against a real gateway.

Green test suites are not release readiness. They verify the layer, not the
rendered product.

---

## 8A. Product polish milestone (4 Aug 2026)

**Committed.** (This section previously said "uncommitted"; that stopped being
true when the tree was cleaned on 5 Aug — §1.)

### The public site now claims only what it can keep

| Was claimed | Reality | Now |
|---|---|---|
| 4 customer logos (Vertex, Nexus, Omni, Meridian) | no reference customers at all | removed; assets deleted |
| Testimonials from "Head of Talent, Vertex" and "Sarah Jenkins, VP of Engineering" (with portrait) | neither person exists | removed; portrait deleted |
| −38% time-to-decision · 4.1× pile reviewed · 0 regretted hires · 2 roles in 9 days | nothing measured | replaced with properties of the analysis, true on every run |
| SOC 2 Type II, audited annually, report on request | no audit, no report | removed; `/privacy` states plainly that no certification is held |
| Data residency: US, EU, or your own region | one Supabase project, `ap-southeast-1` | "Data stored in Singapore — one region today" |
| SSO/SAML with Okta, Entra, Google Workspace | unbuilt Enterprise capability | removed |
| "Audit trail — every decision, immutable" | no admin audit trail exists (§10, item 8) | removed |
| "We integrate with major ATS platforms" | `integrations` unbuilt | FAQ says there are none yet |
| "Models continuously audited for bias" | never performed | FAQ says so, and points at LL144 |

**The bias claim was the most serious.** A published bias audit is a regulated
artefact for hiring technology — NYC Local Law 144 requires an annual one for
automated employment decision tools, and the EU AI Act classifies CV screening
as high-risk. Claiming an audit that has not been performed is worse than
performing none, because it is the claim a regulator can act on.

`tests/marketing-claims.test.ts` (13 assertions) now keeps each of these out by
name, with the reason recorded beside it. **If one fails, the fix is almost never
to edit the test** — it is to delete the claim, or to add the evidence in the
same commit that relaxes the assertion.

### Legal pages — built, and NOT YET IN FORCE

Four new routes: `/terms`, `/privacy`, `/refunds`, `/contact`. The footer's five
links were all dead fragment anchors (`#terms`, `#privacy`, `#contact` existed on
no page; `#security` existed only on the homepage and so resolved to nothing from
`/pricing`). The signup consent line named two documents that did not exist and
was not even hyperlinked — you cannot bind anyone to terms you have not
published.

> ### ⚠️ `resume-hero-section/lib/legal.ts` MUST BE FILLED IN
>
> The pages carry a **"Draft — not yet in force"** banner naming exactly what is
> missing, and will keep carrying it until someone supplies facts no codebase can
> know: **registered entity name, registration number, registered office,
> governing jurisdiction, tax registration, and a named Grievance Officer**
> (required by DPDP Act 2023 §13).
>
> Fill the file, have counsel read the four pages, then flip
> `LEGAL_ENTITY_CONFIRMED` to `true`. A test refuses the flip while any
> placeholder remains — the same `confirmed` idiom `lib/pricing.ts` uses for an
> unpriced market, and for the same reason: a plausible-looking placeholder is
> the one kind of stand-in a customer can act on before anyone notices.
>
> **This blocks Razorpay merchant activation**, which requires all four
> published. It is now a paperwork blocker, not a code one.

`CONTACTS` deliberately keeps `support@hirelens.app` and `sales@hirelens.app` —
both were already shipping in the upgrade dialog and the Enterprise CTA, and
blanking a possibly-working route would have been a regression dressed as
caution. **Still unverified: whether `hirelens.app` has MX records and whether
anyone reads those mailboxes.** An unmonitored support address is worse than
none: it turns "we never replied" into "they wrote and we never knew."

### Pricing implementation

- **GST-inclusive**, matching rule #11 and the `net + tax = total` CHECK on
  `billing_invoices`. The page said "Prices exclude applicable taxes", which the
  first invoice ever issued would have contradicted.
- **`CHECKOUT_CURRENCIES = ['INR']`** in `lib/pricing.ts`. Razorpay settles INR;
  a US visitor was auto-detected into USD, quoted $19, and walked into a signup
  funnel ending at a gateway that cannot serve them. Paid plans in an
  unchargeable market now route to `/contact`. **Free is exempt** — nothing is
  collected, so evaluation still works. When international payments land this
  becomes a list and nothing else changes.
- The Enterprise notes claimed audit logs were "available to every plan to read"
  while the catalog-derived table beside them showed "—" for Free, Plus and Pro.
  The table wins; the note was the only hand-written thing on the surface and is
  exactly where the drift landed.
- Homepage and `/pricing` plan cards now reserve the same `min-h-[4.5rem]`. The
  homepage copy still had the 2.75rem bug `/pricing` had already fixed, so Plus's
  price and feature list sat ~21px above its neighbours. A test asserts the two
  reserves match.

### Inbox entitlement behaviour — the one that hurt every non-Pro customer

`GET /analytics/overview` carries `require_entitlement("advanced_analytics")`
(Pro) **and** `RequireUsageView`. The Inbox is the landing route for every
signed-in user on every plan, and it called that endpoint unconditionally.

Two defects, one visible and one quiet:

1. `summaryStats` coalesced every absent field to `0`, and `InboxSummary` had
   only *loading* and *ready*. So every Free and Plus organization — and every
   brand-new signup — opened the product to **"Open roles 0 · Awaiting review 0 ·
   Interviews pending 0 · Offers outstanding 0"** with a full pipeline. That is
   rule #15 broken on the first screen, and precisely the failure `QuotaMeter`
   refuses to commit three inches below it.
2. A denial is an **enforcement event**. The server recorded one every time, so
   the audit log filled with entitlement denials generated by a screen the
   customer merely opened.

Now: `summaryStats` returns `number | null`; unknown renders an em dash with an
`sr-only` explanation and never a zero; and the query is skipped once the plan
gate **resolves** to denied. Loading and error still fire it — the server is the
authority on access, and a client that withholds a request on a guess is how a
paying customer gets locked out of something they bought.

A real zero is still a real zero: a stage missing from a funnel the server *did*
return is genuinely 0, and only an absent response means "unknown".

### Mobile navigation

Below 768px the public bar rendered exactly one control — an "Access" button to
`/auth/signup`. Links and Sign in were both `hidden md:flex`. The effect: Pricing,
Customers and Security unreachable, and **an existing customer had no way to sign
in at all**, because the only affordance on screen sent them to signup.

The original reasoning was that the Stitch frames never specced an open mobile
menu. They were desktop comps; their silence was not a decision to have no mobile
navigation. There is now a disclosure panel carrying every desktop destination,
Sign in placed first, using the same palette swap as the bar above it.

**The product shell (`.hl`) is a separate, untouched problem** — see §10, item 9.

### Drag-and-drop upload

The upload target was a full-width dashed rectangle with a cloud glyph — the
universal drag-and-drop affordance — and nothing handled a drop. Dragging résumés
onto it did nothing, and worse: with no handler the browser takes the default
action and **navigates away to open the PDF**, destroying the dialog and any
files already staged.

Fixed alongside it: `addFiles` silently discarded anything that was not a
PDF/Word file under 10MB. A recruiter selecting twelve files from an email export
saw eight appear, with no error and no count. Rejections are now named
individually with their reason, and size is distinguished from type because the
remedies differ. Logic extracted to `partitionFiles` / `describeRejection` and
unit-tested.

### Other approved P1s

- **Upgrade dialog**: a price-card click sent `{ requiredPlan }` with no feature
  and no metric, the dialog ran its denial template anyway, and rendered *"This
  feature is on Plus"* over *"Plus includes ."* — a word and a full stop — at the
  highest-intent click in the funnel. `UpgradeRequest.origin` now distinguishes
  `'lock'` from `'plan'`, and plan-level requests get their own copy
  (`PLAN_BLURBS`, added to the catalog; still no money in it).
- **Every `mailto:` terminus** → `/contact`. A `mailto:` does nothing for anyone
  on webmail without a registered protocol handler and fails silently, so the
  customer concludes they were ignored.
- **Settings ▸ Billing** had no way to spend money — no CTA, no link to the
  comparison, `showUpgrade` off on every meter. It now offers the derived next
  tier, **except to a founding organization**: founding is a *ruleset*, not a
  plan, and its slug normalizes to `free`, so keying off the slug would have
  offered "Upgrade to Plus" to the grandfathered customers on the one screen
  where they check what they were promised. Named test.
- **First-run copy**: a brand-new signup was told "No work needs your attention"
  — the steady-state message — as the first sentence in the entire product.

### Deliberately NOT done

The audit's P2 and P3 items were explicitly deferred. The ones most likely to be
raised next: no mobile navigation in the product shell (§10, item 9), the
`© 2024` footer, and the login page's "we'll check if your team uses SSO" which
checks nothing.

Two entries have since been cleared and are recorded here so they are not
re-raised: sitemap, robots and OG images were done in §8C, and **signup
surfacing raw Supabase error strings** was fixed in §8D — every auth form now
maps through `lib/auth-errors.ts`.

---

> **There is no §8B.** Nothing is missing — the section was never written, and
> the milestone sections are lettered in the order they happened. Do not go
> looking for it.

---

## 8C. AI discoverability milestone (5 Aug 2026) — COMPLETE

**Committed**, six commits, listed in §1.

### The problem it solved

An AI system asked *"what should I use to screen résumés?"* had nothing to read.
The marketing pages are written to persuade a human — a hero line, mock
interfaces, animated frames — and stated nowhere what the product **is**, what
it **costs**, or what it **refuses to do**. There was no `robots.txt`, no
sitemap, no canonical, no structured data and no OG card. Worse, four
**fabricated candidate cards** on the homepage were marked up as `<article>`,
the element extractors treat as *this is the page's content* — a summariser came
away with invented people rather than the product.

### The one rule

**Nothing is typed twice.** Every fact the machine layer publishes is read from
the module that already decides it — `catalog.ts` for features and limits,
`pricing.ts` for prices, `legal.ts` for the entity, the policies and the
subprocessors. There is no hardcoded price or feature anywhere in `lib/seo/`,
and a test asserts a price literal cannot be introduced.

### What was built

| | |
|---|---|
| `lib/seo/site.ts` | one source for the origin and the public route list; `robots.ts` and `sitemap.ts` are generated from it, so a new public page cannot exist in one and not the other |
| `lib/seo/structured-data.ts` | JSON-LD assembled from the catalog, pricing and legal modules |
| `lib/seo/llms-txt.ts` | `/llms.txt`, generated — see below |
| `lib/seo/og-image.tsx` | the OG card, copy = `SERVICE_DESCRIPTION` |
| `components/seo/` | the blocks each page mounts; `JsonLd` escapes `<` so content cannot break out of `<script>` |
| `app/{robots,sitemap}.ts` | generated |
| `app/llms.txt`, `app/humans.txt`, `app/.well-known/security.txt` | route handlers, all prerendered static |

Plus: `metadataBase` and Open Graph defaults sitewide, a canonical on every
public page, `noindex` on `/auth`, and the semantic corrections (`<article>` →
`<div>`, `aria-hidden` on every icon span, `<header>` around the nav, an
`sr-only h2` closing an h1→h3 jump on `/pricing`).

### What is deliberately NOT emitted

- **`AggregateRating`, `Review`** — there are no customers. Emitting either is
  the schema equivalent of a fabricated testimonial.
- **`JobPosting`** — HireLens *reads* job descriptions; it does not publish them.
  A crawler that believed otherwise would index the product as a job board.
- **`Organization`, `Offer`** — gated behind `LEGAL_ENTITY_CONFIRMED`, which is
  still `false`. `organizationSchema()` returns `null` and `graph()` drops nulls,
  so the published graph degrades to exactly what is true today.
- **`SoftwareApplication` is ungated** — it describes the software, not the legal
  entity, and every claim in it is read from the catalog.

### `/llms.txt` — the limitations section is the point

It states, in the file's own words, that HireLens is **not an ATS**, **not an
autonomous screener** and **not a sourcing tool** — the three things a
summariser would otherwise guess. Then: no ATS integrations, no published bias
audit, no security certification, one data region, INR-only checkout, monthly
billing only, and self-serve checkout not live. While `LEGAL_ENTITY_CONFIRMED`
is false it also says the policies are drafts.

A product that states its own constraints is easier to recommend accurately than
one that has to be caught out. All of it is generated, so a capability cannot be
advertised here that the server would refuse.

### The proxy fix

The matcher was a negative lookahead excluding `_next` and static assets, so
every marketing page, legal page and agent file paid for a Supabase session
lookup — to guard nothing. It is a **positive list** of guarded routes now.
`/robots.txt` and `/llms.txt` now serve in **11–28 ms**; the HTML pages still
measure 75–190 ms, which is page weight, not the proxy.

The hazard this creates: a new protected route added without touching the list
ships **unguarded**. `tests/proxy.test.ts` asserts the matcher covers every entry
in `V4_PROTECTED`, `V4_AUTH_REDIRECT` and `LEGACY_AUTH_ROUTES` and matches none
of the public pages, so that failure is a red test.

### Two traps worth knowing

1. **A page that declares its own `openGraph` block stops inheriting the
   file-convention OG image** from an ancestor segment. No build warning, no type
   error — `og:image` simply vanishes. Every public route re-exports
   `lib/seo/og-image.tsx` from its own `opengraph-image.tsx`, and a test asserts
   the file exists for each route in `PUBLIC_ROUTES`. This regressed twice.
2. **Importing a value out of a `'use client'` module into a server component**
   yields a client reference proxy, not the value. The pricing FAQ answers moved
   to `lib/marketing/pricing-faqs.ts` so the schema builder and the rendered
   accordion read the same plain module; the failure surfaced only at prerender.

### Verified in a real browser

Playwright, JS disabled, against `next start`. All six public pages: JSON-LD
parses, canonical correct, `og:image` resolves, one `<header>`, zero
`<article>` on the homepage, no heading jump, the string `UNCONFIRMED` absent.
`/auth/login` and `/auth/signup` serve `noindex, follow`. All five agent files
serve 200 and prerender static. Accessible names checked via `ariaSnapshot` —
no icon ligature reaches one.

### Remaining, not done

Icon ligatures (`arrow_forward`, `auto_awesome`) are still in the DOM as text
nodes on `/` and `/pricing`. `aria-hidden` removes them from accessible names
and from assistive tech, which is the standard mitigation, but a naive
`innerText`-based extractor still sees them. Eliminating them means moving the
glyph into `::before { content: attr(data-icon) }` across ~16 call sites —
deliberately not done, as it touches rendering on pages this milestone was
scoped not to redesign.

---

## 8D. Authentication milestone (5 Aug 2026) — COMPLETE

**Committed**, eight commits, listed in §1. Browser-verified end to end against
real Supabase, including an actual password change and an actual invite
acceptance, both cleaned up afterwards (*Verified*, below).

### What shipped

| | |
|---|---|
| **Show / hide password** | every password field: sign-in, sign-up, reset, confirm, and both invite fields |
| **Forgot password** | live email validation, loading, success, mapped errors, resend on a 30s cooldown |
| **Reset password** | four-state machine — session validated *before* the form exists — and a success screen instead of a redirect |
| **Password policy** | `lib/password-policy.ts`; live accessible checklist; blocking rule unchanged from what the server already enforced |
| **UX** | loading indicators, keyboard operability, mobile 390, autofill (username carriers), focus management on every in-place screen swap |
| **`/auth/accept-invite`** | now a **consumer of the same shared session-validation architecture** as reset, not a second implementation |

All of it is **browser-verified end to end** — see *Verified*, below.

### The three real failures it fixed

**1. Every password field was write-only.** No reveal control anywhere. On a
phone, with a mixed-case password, the only way to find a typo was to fail the
sign-in — and on the reset and invite screens, where a mistyped password is
*saved* rather than rejected, there was no way to find it at all. That is an
account someone is locked out of one minute after creating it.

**2. `/auth/reset-password` and `/auth/accept-invite` rendered their forms having
verified nothing.** An expired link, a different device from the one that
requested it, or a typed URL all produced a working form. The person filled it
in, submitted, and only then learned there was no session to update — the
failure arriving after the effort, phrased as a guess, with no way forward from
the screen they were on. Both also redirected on success, so the only
confirmation of a security-relevant change was arriving somewhere else.

**3. The two-step sign-in dropped the email input.** Step two replaced it with a
chip, leaving a password form with no username field — which no password manager
will fill or offer to save.

### What was built

| | |
|---|---|
| `lib/password-policy.ts` | what blocks and what is advice — pure, no React, no Supabase |
| `components/hirelens/auth/password-field.tsx` | the reveal toggle |
| `components/hirelens/auth/password-requirements.tsx` | the live checklist |
| `components/hirelens/auth/use-focus-on-mount.ts` | focus for in-place screen swaps |
| `components/hirelens/auth/use-link-session.ts` | the emailed-link session check, shared by reset and invite |
| `components/hirelens/auth/link-session-screens.tsx` | their shared `checking` and `expired` screens |

`AuthField` gained a trailing-adornment slot and multi-target
`aria-describedby`. `lib/auth-errors.ts` gained the account-creation and
password-change cases.

### The rule that must not be broken

**The client refuses exactly what the server refuses, and no more.** The
blocking rule is eight characters, which is what `minLength` already enforced —
this milestone did *not* tighten the policy. Case and digit variety are shown
and are never fatal.

A client-side rule the server does not share rejects passwords that would have
worked, and on a reset screen that locks someone out of their own account over a
rule nobody agreed to. `tests/password-policy.test.ts` asserts that exactly one
rule carries `required: true`; marking another one required fails the suite on
purpose. **If the Supabase dashboard policy is ever tightened, change it there
first, then here** — the forms render whatever the module returns.

There is deliberately **no requirement checklist on sign-in**. That password
already exists, and telling someone their correct password fails a rule invented
afterwards is both wrong and unactionable.

### Accessibility decisions worth keeping

- The toggle is named for the **action** ("Show password"), with `aria-pressed`
  carrying the state and `aria-controls` naming the field. A button named for
  its state is ambiguous about what pressing it will do.
- Each checklist item carries visually-hidden "met" / "not met" text. The state
  never depends on telling a green tick from a grey ring.
- The list is `aria-live="polite"`, so a satisfied rule is announced as it is
  satisfied — polite so it does not interrupt the character echo of the field.
- Every form is `noValidate`. The browser's own bubble ("Please lengthen this
  text to 8 characters or more") is in the browser's voice, is not announced to
  a screen reader, and vanishes on the next keystroke.
- Screens that swap in place move focus to the new heading. None of those
  transitions is a navigation, so focus was falling to `<body>`.

### A race found while testing

`getSession()` and the auth-state event resolve in either order. When the SDK
resolves a fragment-carried link first, the in-flight `getSession` answers null
— and taking that answer tore a working form down and told the person their
*valid* link had expired. **`getSession` may confirm a session but may never
retract one.** Now fixed once, in `useLinkSession`, for both screens. Pinned by
a test on each.

### One false claim removed

Every auth page carried **"SOC 2 Type II · SSO · your data stays yours."** The
first of those is false — `/privacy` says "We hold no security certification at
this time", and `/llms.txt` lists it under the product's limitations. The
identical claim was deleted from the homepage trust strip as fabricated; this
copy survived only because it lives on the auth surface, where it was doing its
work on the one screen where a stranger decides whether to hand over an email
and a password. Now: "SSO · encrypted in transit · your data stays yours."

### Verified

Playwright against `next start`, 47 checks on the anonymous flows plus 17
against a real session using the `scripts.seed_qa_org` account
(`qa.browser@hirelens.test`, a reserved RFC 6761 domain that cannot receive
mail). The live pass **actually changed the password**, signed in with the new
one on a clean browser context, then restored the seeded value and re-verified
it — the QA account is left exactly as found.

Covered: reveal toggle (masking, relabelling, caret preserved across the type
swap, keyboard operation, cannot submit its form), live requirements, forgot
password (validation → loading → success → cooldown → mapped rate limit),
reset with **and** without a session, `/auth/callback` with a bad recovery
token, mobile 390 (no sideways scroll on any auth route; the toggle is a 44×44
target inside the field), and a keyboard-only walk of sign-in.

The invite flow was driven end to end on a **real Supabase invite**, minted with
`admin.generateLink({ type: 'invite' })` — which returns the token without
sending mail — to `qa.invite@hirelens.test`. 24 checks:

| | |
|---|---|
| **Real invite generated** | via the admin API; no email leaves the system, and `hirelens.test` is RFC 6761 reserved so none could be delivered anyway |
| **Expired / absent session** | the refusal screen renders; no name or password field is ever offered |
| **Invalid token** | a bogus `token_hash` is refused at `/auth/callback` and never reaches the form |
| **Replay protection** | the same link, used a second time, is refused |
| **Successful acceptance** | form gated until valid, then the confirmation screen — still on `/auth/accept-invite`, not dropped into the product |
| **Login after password creation** | the new credentials sign in on a **clean browser context** |
| **Reset re-verified after the refactor** | the full live reset pass (17 checks) was re-run to prove the extraction did not break the flow it came from |

The invitee account is deleted afterwards, and the reset QA account is restored
to its seeded password. Both passes leave the project exactly as they found it.

**Two bugs surfaced by this QA were bugs in the tests, not in the product.**
Both were corrected; both are described under *Two traps*, below. Neither
required a production code change.

### The shared emailed-link architecture — read this before touching either screen

Two screens in this product are reachable **only** by clicking a link in an
email, and both then call `supabase.auth.updateUser` against whatever session
that link established: `/auth/reset-password` and `/auth/accept-invite`.

They had the same bug. The reset screen was fixed first. When the invite screen's
turn came, the obvious move was to paste the fix across — **and that is exactly
how the two came to differ in the first place.** So the logic was extracted
instead, and both screens are now *consumers* of it rather than owners of their
own implementations.

| Module | What it owns |
|---|---|
| `components/hirelens/auth/use-link-session.ts` | one read of the session behind an emailed link, one `onAuthStateChange` subscription, and the resolution of the race between them |
| `components/hirelens/auth/link-session-screens.tsx` | the shared `checking` spinner and `expired` screen, so the wait and the refusal behave identically on both |

**Three reasons it exists, in order of weight:**

1. **Eliminate duplicated auth-link logic.** One session read, in one file,
   reviewed once.
2. **Prevent future drift.** The invite screen was broken *because* it was a
   copy that did not receive a later fix. A shared module cannot fall behind
   itself.
3. **Fix the `getSession()` vs `onAuthStateChange()` race permanently.** Fixing
   it in two places means fixing it in one and forgetting the other, which is
   the failure this whole section is about.

**The state machine both screens run:**

```
checking  → is there a session behind this link?
invalid   → say so BEFORE asking for a name or a password
ready     → the form
done      → a confirmation screen, never a silent redirect
```

**`tests/auth-password-ux.test.tsx` reads both component sources and asserts
that neither contains `onAuthStateChange` and that both import
`useLinkSession`.** A future copy-paste fails the suite rather than drifting
silently. **Keep that test** — it is the only thing preventing a repeat.

**Where invite diverges, deliberately:** an expired reset can be re-requested by
the person standing there (`/auth/forgot-password` is one click away); an expired
invite cannot — only an admin can reissue it. So that screen offers **no action
button** and names who to ask, rather than dangling a control that would not
work. That divergence is in the *copy and the call to action*, never in the
session logic.

### Two traps in testing these screens

1. **`/You’re in/i` is a substring of "You’re invited."** A loose heading matcher
   resolves against the *form's* heading and reports the confirmation screen as
   rendered when it never was — which hid a real focus assertion behind a false
   pass in both the unit test and the browser QA. Both match exactly now.
2. **`localhost` and `127.0.0.1` are different cookie hosts.** `/auth/callback`
   redirects to the origin `next start` was bound to, so a QA script that
   requests one and is redirected to the other gets a session cookie it cannot
   read, and every link flow looks broken. Not a product bug — but it costs an
   hour every time. Drive local auth QA on `localhost`.

### An observation, recorded — NOT a defect

`app/auth/callback/route.ts` derives its redirect origin from `request.url`.
Locally that resolves to the hostname `next start` bound to rather than the
`Host` header on the request, which is what produced trap 2 above.

**This is safe as things stand.** A deployment serves one canonical origin, and
nothing today is behind a proxy that would rewrite it. It is written down only
because it is the kind of thing that is invisible until it is not:

> **Verify after the first production deployment**, particularly if the app ends
> up behind a proxy, a custom domain, or anything that sets `x-forwarded-host`.
> The check is one line — click a real reset link on the deployed host and
> confirm you land on that same host with a session.

Do not pre-emptively change it. There is no way to test the fix from a local
machine, and altering redirect-origin logic blind is a worse risk than the one
it would address.

## 8E. GAB-D1 — vendor attribution removed from exported reports (5 Aug 2026)

**Committed** (§1). Surfaced by the AI architecture investigation (§11), which
found the string independently; a repo-wide grep then turned up
`docs/GOVERNANCE_ALIGNMENT_BACKLOG.md`, where it had **already been logged as
`GAB-D1` on 25 Jul 2026 and never worked.**

### What it was

Both exported PDFs carried, on every copy that left the building:

```
Generated by AI Resume Intelligence Platform  •  Powered by Groq LLM  •  Confidential
```

…plus `author="AI Resume Intelligence Platform"` in the document metadata, which
is what a PDF reader shows in Properties. Four sites in
`app/services/report_generator.py`.

`Powered by Groq LLM` is a **Checklist §8.9 Gate 2 failure**: it names a model
vendor as a quality signal. Under Checklist §15 a gate failure is *unscorable,
not low-scoring* — **any review touching report generation terminated unscored
while it stood.** It was the only gate failure in that backlog, and the backlog
said in as many words: *run this item first.*

### Why it also mattered for the AI milestone

Two engineering reasons, on top of the governance one:

1. **It was already becoming false.** Provider selection is configuration
   (`app/ai/gateway/`), with a fallback chain and a runtime switch. The line
   asserts a vendor a failover can change — and a PDF outlives the request that
   made it, so it cannot be corrected once sent.
2. **It was the only AI disclosure that leaves the product**, and it disclosed
   nothing useful. It named a supplier where a reader needed to know the
   narrative was model-written and the scores were not.

### What was done — and deliberately not done

`author="HireLens"` on both documents; both footers now
`"Generated by HireLens  •  Confidential"`. **Removed, not relocated** — not into
metadata, a settings screen, an about page, or any other customer-visible
surface, which `GAB-D1` forbids by name.

An inline comment sits above each footer recording *why* the vendor name is
absent, because the next person to touch that line will otherwise restore it as
a courtesy.

**AI provenance is explicitly NOT what this line is.** If provenance is ever
built it is an audit record, designed independently, and **must not depend on
provider branding** — a decision taken 5 Aug 2026 rather than deferred into an
implementation phase where it would have been made by accident.

**Left alone on purpose:** the PDF `title=` strings, one of which is
**`"AI Recruiter Match Report"`** — customer-visible in a reader's title bar and
carrying the same category drift. It is outside `GAB-D1`'s Required Action
(author + footer), and renaming a document a customer may already have filed is a
decision, not a cleanup. It needs its own item. `GAB-D2` covers the same drift in
the OpenAPI metadata and is also still open.

### Verified

Not merely implemented — **both PDFs were generated and inspected**, rendered
text *and* document metadata: no `Groq`, no `Powered by`, no
`AI Resume Intelligence Platform`, no other vendor string; `author=HireLens`;
footer present on both; `•` intact (U+2022). The backend suite was **493 passed**
at that moment — unchanged by the fix, which is the point made below.

### The rule is self-enforcing now

**No test asserted on that footer**, which is why 493 tests stayed green across
the change *and* why the string survived months of review. Every constraint this
project actually keeps — `tests/marketing-claims.test.ts`,
`tests/password-policy.test.ts`, the copy-paste guard in
`tests/auth-password-ux.test.tsx` — is kept by an assertion, not by intention.
So this one is too:

| Guard | Covers |
|---|---|
| `backend/tests/test_export_attribution.py` (11) | both PDFs — rendered page text **and** document metadata |
| `resume-hero-section/tests/export-attribution.test.ts` (5) | the interview pack's HTML, including the degraded branch |

**They guard rendered artifacts, not the repository.** `Groq` is referenced
legitimately in the provider adapter, `GROQ_API_KEY`, the model registry,
ADR-002, the docs, and the skills taxonomy — candidates list Groq on their
résumés (`app/nlp/skill_normalizer.py`). A repo-wide ban would be wrong, would
fire on legitimate code, and would be deleted the first time it did. Neither
guard is a snapshot: each asserts what must be **absent** plus the one
attribution that must be **present**, so wording and layout stay free to change
while deleting the attribution still fails.

`TestEveryExporterIsCovered` is the part that will earn its keep: it fails if
`report_generator` grows a public `generate_*` the guard does not exercise. A new
exporter would otherwise inherit the footer by copy-paste and be tested by
nothing — which is exactly how this happened.

**Both guards were watched failing.** The removed string was reintroduced in each
codebase, the right assertions fired with the right message, and both files were
restored byte-for-byte. A guard that has never been seen to fail is not a guard.

Counts moved: backend **493 → 504**, frontend **450 → 455**.

---

## 9. Standing architectural rules

Never break these. Each is a specific failure that was designed out.

**Access and money**
1. **Entitlements own access.** `app/enterprise/` is the only gate.
2. **Billing never decides permissions.** It writes plan *state*; the catalog
   decides what a plan includes.
3. **The catalog contains no pricing.** A test asserts it.
4. **Postgres is authoritative; the gateway is upstream.** Nothing in the
   request path calls Razorpay.

**Provider isolation**
5. **The domain never imports a provider SDK**, and no module outside
   `providers/razorpay/` names a gateway concept.
6. **Capabilities are declared, never inferred from a provider name.**
7. **Unknown gateway states fail loudly.** Never guessed: mapping an unknown
   status to `active` grants access we cannot bill for; to `cancelled` revokes
   access someone is paying for.
8. **Webhooks are notifications, not data.** Record the event, re-fetch from the
   API, write what the API says.
9. **A browser callback grants nothing.** Only the webhook changes a plan.

**Money**
10. **`bigint` minor units everywhere. No floats, no decimals, no doubles.**
    A rupee/paise mix-up is a 100× error in whichever direction hurts most.
11. **GST-inclusive.** The advertised price is the amount charged;
    `net + tax = total` is enforced in the database and in the domain.

**Data integrity**
12. **No silent subscription repair.** Missing rows are integrity errors,
    surfaced; repair is an audited operator act with a recorded reason.
13. **Founding organizations are never billed** — no checkout, no UI, and
    webhooks may never write `plan_ruleset`.
14. **Fail toward the customer keeping access.** `past_due` keeps working; the
    only edge that withdraws access is `grace -> suspended`.
15. **Never claim a plan problem because a request failed.** Loading, error,
    allowed and denied stay four distinct states.

**Interface**
16. **Permission hides · entitlement locks.** A hidden feature sells nothing;
    no amount of money fixes a role.
17. **Shared lock UI only.** No screen composes its own lock, upgrade copy or
    tier messaging. Enforced by tests.
18. **Every upgrade prompt answers three questions:** what is locked, why you
    would want it, what changes if you upgrade.
19. **A quota is not a feature lock.** Different surfaces, different sentences.
20. **Prefer actionable information to documentation** — meters over tables.
21. **The public site may claim only what the product can keep.** Added 4 Aug
    2026 after the audit found nine untrue claims on the marketing surface.
    Enforced by `tests/marketing-claims.test.ts`.

---

## 9A. AI Architecture Rules

**Permanent. These govern the AI Architecture & Multi-Provider Foundation
milestone (§11) and everything built on top of it afterwards.** They extend §9
rather than replacing it — §9 rules 5, 6 and 7 were written for the billing
provider layer and transfer to this one verbatim.

Read this section **before writing any code under §11**. Several of these rules
forbid the approach that will look obvious at the time.

1. **Never rewrite the orchestrator.** `orchestrator.run` is the correct
   long-term boundary and is proven to be the single funnel every backend LLM
   call goes through. It is extended, calibrated and fixed — never replaced.
   Its structure is already vendor-neutral; only its calibration is Groq-shaped.
2. **Never let business logic import provider SDKs.** `app/ai/providers/` is the
   only package that may import a vendor SDK, and imports stay lazy so an
   unconfigured provider costs nothing.
3. **AI providers remain interchangeable.** No `if provider == …` anywhere. A
   new provider is a subclass plus a registry entry — an addition, never an
   audit of everything else.
4. **Billing architecture is frozen.** `app/billing/**` is out of scope for this
   milestone and paused on an external blocker (§5A, §11A). Do not touch it, and
   do not borrow its code — borrow its *pattern*.
5. **Authentication architecture is frozen.** The shared emailed-link session
   architecture (§8D) is complete and browser-verified. Nothing in the AI
   milestone has any reason to reach into it.
6. **Prompt text must never change during provider migration.** Prompt text *is*
   behaviour. Changing it in the same milestone that changes providers makes a
   quality regression undiagnosable — you would not know which change moved the
   output. Prompt work is a separate, later milestone with its own evaluation.
7. **Deterministic scoring always stays outside the LLM.** Every number — ATS
   score, match score, ranking, similarity — is computed in `app/nlp/*`. The
   model writes prose and produces no scores. This invariant is the foundation
   of the disclaimer wording in §11.5 and is the strongest asset in the codebase.
8. **AI explanations are never authoritative.** The model recommends; a person
   decides; the decision is recorded and reversible. Grounding is computed by
   the **server** from its own attribution — a model may never claim its answer
   was grounded.
9. **Unknown provider behaviour must fail loudly.** Never guessed. An unknown
   error, status or finish reason is surfaced, not mapped to the nearest
   convenient meaning. Guessing "transient" burns a daily quota; guessing "fatal"
   takes down a working feature.
10. **Capability metadata must be declared, never inferred.** A provider and a
    model declare what they support; routing reads those declarations. Nothing
    infers a capability from a provider's name — and a declaration that nothing
    reads is decorative, which is exactly the state `can_json` is in today (C6).
11. **Every completed task updates this document immediately.** The roadmap in
    §11.3 and the progress table in §13 — not a new notes file, not a commit
    message, not chat history. A milestone that tracks itself anywhere else stops
    being trackable by the next session.
12. **`FakeProvider` is the reference implementation of the provider contract —
    permanent architecture, not testing infrastructure.**
    `app/ai/providers/fake_provider.py` is a first-class provider used for
    deterministic evaluation. It ships in `app/`, registers exactly like every
    other provider, and is maintained to the same standard as Groq, OpenAI,
    Gemini, Anthropic, OpenRouter and any local model — all of which must satisfy
    **exactly the same contract it does**.

    **Judge a new provider against `FakeProvider`, never against Groq.** Groq is
    one vendor's behaviour that this codebase happened to grow around; the fake
    is the contract stated deliberately. Measuring a newcomer against Groq is how
    one vendor's quirks become the definition of "a provider".

    **If a future provider needs something the interface does not offer, review
    the interface first — not the fake.** Concretely: when a provider cannot be
    implemented without changing `LLMProvider`, and `FakeProvider` could not
    support that change, the change is almost certainly a vendor-specific
    abstraction wearing a general name. Either the contract genuinely needs to
    grow — in which case **`FakeProvider` grows with it, in the same commit** —
    or the provider adapts. Weakening the fake to accommodate a vendor is how
    provider-specific abstraction creeps back in after the work of removing it.

13. **`app/ai/providers/errors.py` is the single source of truth for provider
    error semantics. No provider implementation may classify errors directly.**

    Added 6 Aug 2026 with Phase 1 task 1 (`913426f`). Every provider — Groq,
    OpenAI, Gemini, Anthropic, OpenRouter, Kimi, the local provider of Phase 2,
    and every provider added after them — supplies only its own **vocabulary**:
    status mapping, Retry-After extraction, quota detection. The decision about
    what a failure *means* is delegated to `classify_vendor_error`.

    **What a failure means is decided in one place; what a vendor calls it is
    the vendor's business.**

    This is not tidiness. The four `_classify` staticmethods this rule replaced
    were the same ladder written four times, and they had already drifted into
    four different word lists — which is how one of them came to report every
    error message containing "generate" as a rate limit (C2), for months, on the
    path that decides whether to spend more of a metered budget. **A rule that
    lives in four places is a rule that is true in three.**

    **If a future provider cannot fit this abstraction, review the abstraction
    before adding provider-specific branching.** A provider that appears to need
    its own classifier is nearly always signalling that this one is missing a
    vocabulary hook — add the hook, and every provider gets it. Per-vendor
    branching is forbidden by rule 3, and is precisely how provider-specific
    abstraction returns after the work of removing it. The check is the one
    rule 12 already applies to `LLMProvider` and `FakeProvider`: **review the
    contract first, not the implementation straining against it.**

    Enforced rather than stated:
    `TestEveryProviderClassifiesThroughTheSharedLadder` in
    `backend/tests/test_provider_bug_fixes.py` asserts every provider routes
    through the shared classifier, so a fifth private copy fails the suite
    instead of drifting quietly for a year. The same note heads `errors.py`
    itself, because the person about to add a vendor branch is reading that
    file, not this one.

14. **Retry policy is part of the provider contract. Providers declare
    vocabulary; the base provider determines retry semantics. A provider may
    never override retry classification.**

    Added 6 Aug 2026 with Phase 1 task 3 (`136340b`). It extends rule 13 from
    *what a failure is* to *what is done about it*, because the second question
    is the expensive one: retrying is what spends a budget.

    A provider declares exactly two things — `sdk_namespace`, which SDK raises
    its exceptions, and `quota_markers`, its vendor's own words for a ceiling
    that will not clear today. `LLMProvider._classify` and
    `app/ai/providers/errors.py` do the rest: transient or terminal, retryable or
    not, and how long to wait.

    **The retry policy must remain identical across every provider.** Not
    similar — identical. Groq, OpenAI, Gemini, Anthropic, OpenRouter, Kimi, the
    local provider of Phase 2 and every provider added afterwards run the same
    ladder, the same bounds and the same backoff. Anything that differs between
    them is vocabulary, and vocabulary is data.

    This is not symmetry for its own sake. Retry behaviour is the one part of
    the provider layer that can spend money and take a feature down, and it is
    the part nobody looks at until an incident. Four copies of it were four
    different policies: two never classified quota at all, so an exhausted daily
    budget was retried five times over (C1), and three discarded a `Retry-After`
    the vendor had explicitly sent, so they retried too early to succeed. **A
    retry policy that varies per provider is a policy nobody has read in full.**

    **If a future provider cannot express its retry behaviour through vocabulary
    alone, review the abstraction before adding provider-specific retry logic.**
    The likely answer is that the vocabulary is missing a hook — add the hook,
    and every provider gets it. The unlikely answer is that the contract needs to
    grow, in which case it grows for everyone in the same commit, exactly as
    rule 12 requires of `FakeProvider`. What is never the answer is a branch.

    Enforced rather than stated:
    `tests/test_retry_classification.py::TestProvidersDeclareVocabularyOnly`
    asserts that no provider — including `FakeProvider` — carries `_classify` in
    its own `vars()`. The guard fails on the override itself, not on a symptom of
    it, which is the difference between catching this in review and catching it
    in an incident.

15. **Provider validation owns configuration correctness. Providers expose facts;
    validation decides whether the configuration is acceptable.**

    Added 6 Aug 2026 with Phase 1 task 4 (`fbc07b2`). It completes the pattern
    rules 13 and 14 begin: a provider declares *what it is* — its key setting,
    its capabilities, its models, its retry vocabulary — and never judges the
    deployment around it. `app/ai/gateway/validation.py` makes that judgement,
    once, for every provider.

    **Three properties this must never lose:**

    - **Validation never repairs configuration.** It returns findings. A
      validator that quietly corrected a value would hide the mistake it exists
      to reveal, and would leave the operator holding a wrong mental model of
      their own deployment. This is §9 rule 12's *"no silent repair"* applied to
      configuration instead of subscriptions.
    - **Validation never performs network calls.** Nothing here contacts a
      provider, and nothing here may start to. It must be safe to call on every
      `/health` request, and at boot on a machine with no egress.
    - **Configuration correctness and provider availability are independent
      concepts.** Whether a configuration could ever work, and whether a vendor
      is answering right now, are different questions with different fixes,
      different owners and different urgencies. Availability lives in
      `health.py` and `provider_health`; it may never be consulted here.

    **A provider outage must never become a startup configuration failure.** A
    service that refuses to restart because a vendor is having a bad afternoon
    has converted someone else's incident into its own, at the worst possible
    moment — during theirs. It is also the failure that looks most like progress
    while you are making it: adding a health probe to startup validation feels
    like extra rigour and is actually a new outage mode. That is why nothing in
    this module probes anything.

    **If a future provider requires provider-specific validation behaviour,
    extend the validation contract rather than branching around it.** Add a fact
    for the provider to declare and a check that reads it, so every provider is
    validated by one code path. A branch keyed on a provider's name is forbidden
    by rule 3 and is exactly how the per-vendor drift behind C1 and C2 returns.

    A companion rule for what is *fatal*: reserve it for **closed sets**. A name
    outside a registry this repo owns can never work and should fail a deploy. A
    value that could legitimately be right in some deployment — a missing key, a
    deliberately disabled chain, a model released last week — is reported, never
    refused. Getting this backwards takes the whole product down over a feature
    that is merely switched off.

    Enforced rather than stated: `tests/test_provider_validation.py` pins the
    fatal/warning split, the four-way health state, the purity contract, and —
    the one that nearly did not get written — `TestStartupActuallyCallsTheValidator`,
    which drives the real startup path. Commenting the validator out of
    `validate_startup()` broke **no test** until that class existed, because
    every other test called the validator directly. **Validation needs a guard on
    its wiring, not only on its logic.**

---

## 10. Known technical debt

| # | Item | Status |
|---|---|---|
| 1 | **4 eslint errors** — `react-hooks/refs` in `components/marketing/NeuralBackground.tsx:292–293`, refs mutated during render. From commit `6ba960a`; unrelated to monetization. **`npx eslint .` exiting non-zero is expected — a 5th error is a regression.** | Deliberately unfixed |
| 2 | **Browser QA partially done.** Unblocked 3 Aug 2026 by dropping the Chrome extension for Playwright. A real pass covered the product shell, keyboard paths and a ~170-shot route sweep; §0b of `BROWSER_QA_CHECKLIST.md` separates what was driven from what was only typechecked. | Harness works; coverage incomplete |
| 3 | **Most of what was built 4–5 Aug is unverified in a browser** — policy pages, mobile menu, drop zone, upgrade dialog, Settings ▸ Billing CTA, Inbox states, marketing rewrite. Postdates the pass. **Cleared since:** the machine-readable public surface (§8C) and every authentication screen (§8D), both driven in a browser on 5 Aug. | Open — narrowed |
| 4 | **PITR / backups outstanding.** `pitr_enabled: false`, no restorable backup. **Blocks the first real payment** — invoices are statutory records. | OPS-1, open |
| 5 | **Razorpay production account / KYC pending.** No live credentials, and no plans created even in test mode. | Blocks Step 4 |
| 6 | **International payments deferred.** Razorpay is INR-only in V1. `/pricing` quotes USD but now routes it to sales rather than checkout (§8A). | Handled by decision |
| 7 | **67 orphaned organizations.** Inert, but they distort every count. Cleanup must wait for PITR and a versioned script. | OPS-6, deferred |
| 8 | **No audit trail for destructive admin operations.** The teardown behind the RCA left no record. | OPS-2, open |
| 9 | **The product shell has no mobile navigation.** `.hl` `AppShell` mounts `LeftNav` permanently; it collapses to 56px below 1280px but never hides, so a 375px viewport loses 15% of its width to chrome and every `DataTable` overflows. The public site was fixed on 4 Aug; the product was not. | Audit P2-9, open |
| 10 | **`lib/legal.ts` unfilled.** Four policy pages self-label as drafts. **Blocks Razorpay activation.** | §8A, open |
| 11 | **`hirelens.app` mail unverified.** Every contact route depends on it. | §8A, open |
| 12 | **Razorpay Subscriptions API unavailable.** Valid credentials, 401 from Subscriptions only. | §5A, BILL-B1 |
| 13 | **The grace sweep has no trigger.** Built, tested and verified; nothing invokes it, so no organization is ever suspended. **Deferred on purpose** until the billing flow is complete — §5A. | BILL-T1 |
| 14 | **Open billing items**, none now P1. | [BILLING_TODO.md](./BILLING_TODO.md) |

Items 4, 7 and 8 are tracked with three more in
`docs/OPERATIONAL_HARDENING_BACKLOG.md`.

---

## 11. Active milestone — AI Architecture & Multi-Provider Foundation

> ## IMPLEMENTATION IS UNDER WAY — §11.3 and §13 are the status of record.
>
> **Phase 0 is complete (3/3) and Phase 1 is in progress (4/6).** This banner
> read "IMPLEMENTATION HAS NOT STARTED" until 6 Aug 2026; it was left behind by
> the session that finished Phase 0 and is corrected here rather than trusted.
> `GAB-D1` (§8E) remains **outside** the milestone — a governance gate failure
> fixed on its own because it blocked review of report generation. It is not
> Phase 0 work and does not appear in the roadmap.
>
> Everything below is the plan. Implementation happens **task by task**, in
> roadmap order, each one reviewed and approved before the next begins. **Every
> completed task updates this document immediately** (§9A, rule 11) — the
> roadmap in §11.3 and the progress table in §13, not a new notes file.

This milestone is independent of the Razorpay blocker, so nothing here is
waiting on the gateway. Billing's own resumption plan is §11A, below, and
remains paused.

**Read §9A before writing any code under this milestone.** Those rules are
permanent and several of them forbid the obvious approach.

### 11.1 What the investigation found

Completed 5 Aug 2026, tracing every AI workflow independently from UI to
response. The conclusion is deliberately anticlimactic:

> **The architecture is substantially correct. Build on it; do not replace it.**
> `AIOrchestrator` is the right long-term boundary — no vendor branching, no SDK
> import, callers pass a capability and a schema and receive a validated object
> or a typed error. **The orchestrator's structure is vendor-neutral; its
> calibration is Groq-shaped.** A second provider will not break the
> abstraction — it will expose that the abstraction has only ever been exercised
> against one implementation.

**More exists than the milestone name suggests.** `app/ai/gateway/`
already has a provider registry, a model registry, logical roles, per-provider
config, a health state machine with cooldowns and auto-recovery, a fallback
chain, usage/cost accounting, and an audited runtime provider switch with a
Settings UI on it. **Six providers are implemented** (Groq, Gemini, Anthropic,
OpenAI, OpenRouter, Kimi). Goals 1, 2, 3 and 6 below are substantially built.
The remaining work is **proof and calibration, not design** — with one genuine
exception (capability profiles, Phase 3).

**The AI surface, complete:** eight live LLM capabilities, all through
`orchestrator.run`, plus one embeddings path that never touches the LLM.
Prediction (`app/prediction/`) and organizational knowledge (`app/knowledge/`)
are **fully deterministic** — no LLM, no embeddings. A ninth capability,
`RESUME_SUMMARIZATION`, is declared in the enum with no prompt and no caller;
it would raise if requested.

### 11.2 The findings that drive the roadmap

Each was verified in code, not inferred. The IDs are referenced by the roadmap.

**Coupling and correctness**

| ID | Finding |
|---|---|
| **C1** | **Quota classification exists only for Groq.** `groq_provider.py` sets `is_quota`, and the orchestrator refuses to retry quota errors. Anthropic and Gemini never set it, so a daily-quota exhaustion there is treated as transient and retried — burning a budget that will not clear today |
| **C2** | **Error classification is substring matching on `str(exc)`.** `anthropic_provider.py` tests `"rate" in msg`, which also matches "generate". Typed SDK exceptions exist and are unused |
| **C3** | **`AI_DISABLED_PROVIDERS` disables nothing.** `fallback_chain()` never filters it and the orchestrator keeps unhealthy providers as a last resort, so a "disabled" provider still serves traffic while the admin UI shows it off. `AI_GATEWAY.md` claims "never routed" |
| **C4** | **`AI_DEFAULT_MODEL` is a Groq model used as the cross-provider last resort.** A new provider with an incomplete `role_models` map gets handed a Llama model name |
| **C5** | **Per-provider `default_model` outranks an explicit call-site `model=`.** Documented precedence is inverted at `orchestrator.py`; usage records the model actually used, so the override is invisible |
| **C6** | **No provider requests native JSON mode.** `can_json` / `supports_json` are declared everywhere and read by **nothing**. Structured output is prompt-instructed, then retried up to 6× with an identical prompt and no repair instruction |
| **C7** | **Token budgets live in business logic and are never validated against the model.** `_MAX_TOKENS = 4096` is hardcoded in the comparison and interview services; nothing checks it against the model's declared `max_output_tokens` |
| **C8** | **`is_llm_configured` is `bool(GROQ_API_KEY)`.** Run OpenAI-only and `/health` reports `llm: not_configured` while serving AI correctly |
| **C9** | ~~**Nothing validates `AI_PROVIDER` or the fallback chain at startup.**~~ **CLOSED 6 Aug 2026** — `app/ai/gateway/validation.py`. Capability routing gets fatal validation; the primary provider now gets it too |
| **C10** | **Credentials are read from process-global settings inside each provider**, and `GroqProvider._client` is a class attribute cached for process lifetime — key rotation needs a restart. This is the line that blocks BYO AI |
| **C11** | **Embeddings have provenance and nothing enforces it at read time.** `SupabaseVectorStore.search()` compares the query vector against every stored vector regardless of which model produced it; auto-index fires only when a campaign has **zero** embeddings. Because `hashing` and `text-embedding-3-small` are both 1536-dim, switching produces same-length, semantically unrelated vectors — no error, just meaningless cosine. Mitigated to ~28% of the score by hybrid ranking (`0.72 × lexical + 0.28 × embedding`), which is worse in one way: nobody notices |
| **C12** | **`byo_ai` — "Bring Your Own AI" — is catalogued, priced and entitlement-checked with no implementation.** `tests/test_feature_flag_enforcement.py` records it as *"Phase 4 — no credential endpoints yet"*. Under rule 21 this is the same class of defect as the nine claims removed on 4 Aug, still shipping |

**Naming leaks** (cosmetic individually; deferred to one mechanical commit at the
end): `GroqExplanation`, `GroqMatchAnalysis`, `GroqBatchAnalysis` are response
model names on public endpoints and appear in the OpenAPI document.
`Groq` in `app/nlp/skill_normalizer.py` and `extractor.py` is **correct and must
stay** — candidates list it on their résumés.

**Answers to the three questions this milestone was opened with**

1. **Is `AIOrchestrator` the right boundary?** Yes. Caveat: `run()` accepts
   `provider=` / `model=` strings. No business caller uses them — only tests —
   so the boundary is *conventionally* rather than *structurally* enforced.
   Closing that is a signature change, not a redesign.
2. **How far does configuration already support local runtime control?**
   The mechanism exists; the ergonomics do not. `.env.local` is read **once at
   import**, so every change needs a restart. There is **no local provider**
   (`OpenAICompatProvider` has a configurable `base_url` and would cover Ollama /
   LM Studio / vLLM in ~15 lines). **Free vs paid Groq is not expressible** —
   both are `GROQ_API_KEY` and the tier lives in the key. The one runtime switch
   that exists is **production-global, process-local and unguarded by
   environment**.
3. **Where do usage accounting and cost reporting belong?** The orchestration
   layer, where they already are. Only the orchestrator knows that a call was
   attempt 4 of 6 for one logical request, which capability asked, and whether a
   failover occurred — `_CapCounter` already separates `runs` from
   `provider_calls`. Two corrections: the tracker is **in-memory and dies with
   the process**, and **cost silently reads zero for unpriced models**
   (OpenRouter and Kimi have no prices seeded). Unpriced must mean *unknown*,
   never zero — the same distinction §8A already enforces for quota meters.

### 11.3 Roadmap

**This is the task list. Update it the moment a task completes.**
`☐` not started · `◐` in progress · `☑` done and verified.

```
Phase 0  ── COMPLETE ──
☑ Evaluation Harness          6 Aug 2026 — app/ai/evaluation/ · 28 tests
☑ Fake Provider               6 Aug 2026 — app/ai/providers/fake_provider.py
☑ Golden Dataset              6 Aug 2026 — app/ai/evaluation/golden/ · 6 cases
                              Fake + dataset share 42 tests

Phase 1
☑ Shared Provider Classifier  6 Aug 2026 — 913426f · app/ai/providers/errors.py
  (roadmap name: "Provider     C2 (typed classification) + C8 (is_llm_configured)
   Bug Fixes")                 37 tests · §9A rule 13
☑ Disabled Provider Fix       6 Aug 2026 — 561003a · gateway + orchestrator
                              C3 · 16 tests · R8 retired
                              violation injected and watched fail
☑ Retry Classification        6 Aug 2026 — 136340b · providers declare vocabulary
                              C1 · 50 tests · R5 retired · §9A rule 14
                              violation injected and watched fail
☑ Provider Validation         6 Aug 2026 — app/ai/gateway/validation.py
                              C9 · 32 tests · fatal only for closed sets
                              violation injected and watched fail
☐ Default Model Fix
☐ Native JSON Support

Phase 2
☐ Credential Resolver
☐ Local Provider
☐ Local Runtime Override

Phase 3
☐ Capability Profiles
☐ Intelligent Provider Selection
☐ Token Budget Validation

Phase 4
☐ Usage Persistence
☐ AI Provenance
☐ Cost Tracking

Phase 5
☐ AI Disclaimer System

Phase 6
☐ Multi Provider Live Testing
☐ Paid Groq
☐ OpenAI
☐ Gemini
☐ Anthropic
```

**What each task is for**, so a future session does not have to reconstruct it:

| Task | Closes | Note |
|---|---|---|
| Evaluation Harness · Golden Dataset | R1 | ~30 résumés × 3 JDs with stored expected-shape assertions. **Without this, "we switched provider and quality dropped" is undetectable until a customer says so.** It is the prerequisite that makes Phase 3 safe |
| Fake Provider | — | `providers/fake.py`, registered. The one genuinely missing piece. `app/billing/providers/fake.py` is the reference: a port with a working fake is testable; a port without one is decorative. Collapses three ad-hoc test fakes |
| Provider Bug Fixes | C2, C8 | Typed errors; `is_llm_configured` means "any reasoning provider configured" |
| Disabled Provider Fix | C3 | Prove it by injecting a violation, the way the billing boundaries were proven |
| Retry Classification | C1 | Quota vs transient, per provider, with `retry_after` where the vendor sends one |
| Provider Validation | C9 | Same strictness capability routing already has |
| Default Model Fix | C4, C5 | Drop the Groq-shaped global default; restore documented precedence |
| Native JSON Support | C6 | Request JSON mode where `can_json`; add a repair instruction to the JSON retry |
| Credential Resolver | C10, C12 | Providers receive a key instead of reading settings. **Build the seam, not the BYO feature** |
| Local Provider · Local Runtime Override | goal 5 | `LocalProvider` + a gitignored dev-only file, live-reloaded, inert unless `ENVIRONMENT` is development. Production stays environment-driven |
| Capability Profiles · Intelligent Provider Selection | goal 2 | **The only genuine design work.** Capabilities declare requirements (json, context, latency, cost, quality floor, data sensitivity); the selector matches them against declared provider/model capabilities — which is what finally makes `can_json` load-bearing |
| Token Budget Validation | C7 | Budgets move out of business logic and are checked against the model |
| Usage Persistence · Cost Tracking | §11.2 Q3 | Per-request rows; unpriced = unknown, never zero |
| AI Provenance | — | Migration 0028, additive and nullable, following the 0027 pattern. **Phase 5 depends on it** — an honest disclaimer needs to know what generated the output |
| AI Disclaimer System | goal 7 | Derived from the execution record, never typed per screen |
| Multi Provider Live Testing | goals 4, 6 | Config only — no code. Enable the fallback chain and drive a **real** failover; watch `total_retries` and `total_fallbacks`, do not merely record them. Needs each provider's key in Render, the container **and** the CI staging gate (`.github/workflows/release-gate.yml` currently provisions `STAGING_GROQ_API_KEY` only, so a single-provider eval would pass silently) |
| Paid Groq | goal 4 | The practical unblock — the free tier's ~100k tokens/day is a real ceiling. **Note there is no way to express "this key is paid" today**: free and paid are both `GROQ_API_KEY` and the tier lives in the key, so nothing can reason about which ceiling applies. Decide whether that needs modelling before R2 (retry amplification) meets a metered account |
| OpenAI | goal 6 | Already implemented (`openai_compat.py`); this task is keys, eval parity and cost pricing, not code |
| Gemini | goal 6 | Implemented. **Highest JSON-compliance risk** (C6) and its quota is misclassified today (C1) — both must be closed in Phase 1 first |
| Anthropic | goal 6 | Implemented. Same quota misclassification as Gemini (C1), plus the over-broad `"rate" in msg` match (C2) |

**C11 (vector store read-time model enforcement) is not in a phase.** It is
independent of the provider work and can be done in Phase 1 or 2 — search
quality only improves.

**Explicitly NOT in this milestone**, so they are not rediscovered as surprises:
streaming (nothing in the repo streams today, and streaming a *validated
structured* response is a separate contract), per-organization BYO AI, and a
database-backed configuration layer. Environment + the startup-validated
capability table + a dev-only local file covers every stated requirement, and a
DB config layer would add a failure mode where the service cannot decide how to
answer because Postgres is slow.

### 11.4 Blast radius and risk

| Phase | Behaviour-visible? | Blast radius |
|---|---|---|
| 0 | no | **None** — nothing in the request path |
| 1 | narrowly — disabled actually disables; quota stops being retried on Gemini; three providers start honouring Retry-After; a misconfigured chain now fails the deploy instead of every request | **Low**, one named test per fix; **the Groq path is unchanged** — its marker list is preserved verbatim |
| 2 | no in production — the env resolver stays the default | **Low**; prod `config_snapshot()` must be byte-identical |
| 3 | behind a flag; off = today's resolution | **Medium** — the only phase that changes model selection. Gated on eval parity |
| 4 | no | **Low-medium**; additive migration |
| 5 | **yes — this is the visible one** | **Medium**; requires browser verification, not green tests |
| 6 | yes | **Medium**; first real failover, needs retry-amplification alerting |

| # | Risk | Likelihood | Impact |
|---|---|---|---|
| R1 | **Silent quality regression on switch.** Prompts tuned against Llama-3.3-70b for months; no eval harness exists yet | High | High |
| R2 | **Retry amplification on a paid key** — up to 18 provider calls per logical request (3 network × 3 JSON × 2 schema), unalerted | Medium | High |
| R3 | **Semantic search silently degrades** on an embedding-provider change (C11) | Medium | High |
| R4 | **JSON compliance collapse** on a non-Llama model (C6), presenting as latency and cost rather than errors | High | Medium |
| R5 | ~~**Quota misclassification** burns a daily budget on Gemini/Anthropic (C1)~~ **RETIRED 6 Aug 2026** — a quota-exhausted provider costs exactly one call and fails over; pinned by call count, not by a flag | — | — |
| R6 | **`byo_ai` sold and unbuilt** (C12) reaches a real Enterprise customer | Low now | High |
| R7 | **Injection defences calibrated against one model family.** `ground_claims()` is model-independent; `scrub()`'s phrase list is not | Medium | High |
| R8 | ~~**`AI_DISABLED_PROVIDERS` believed to work** during an incident (C3)~~ **RETIRED 6 Aug 2026** — it works now, and a call counter proves a disabled provider is never called | — | — |
| R9 | **Runtime override disagrees across workers** — it is a module-level global | Certain past one worker | Medium |
| R10 | **Phase 5 changes what customers read.** Green tests prove nothing about a rendered disclaimer | Certain | Medium |

### 11.5 Goals this milestone must satisfy

| # | Goal | State |
|---|---|---|
| 1 | **Provider abstraction** — a port in the shape of `BillingProvider` (§3) | **built**; needs a fake to be proven |
| 2 | **Model abstraction** — callers ask for a capability tier, not a model string | **partial** — roles exist but are hand-picked; Phase 3 |
| 3 | **Runtime configuration** — provider/model per task, changeable without a deploy | **built** (`AI_CAPABILITY_MODELS`, inert by default, strictly validated at boot) |
| 4 | **Paid Groq support** | Phase 6 — the free tier's ~100k tokens/day is a real ceiling |
| 5 | **Local model selection** | **not built** — Phase 2 |
| 6 | **Future providers** — each an addition, never an audit | **built** — six exist |
| 7 | **AI disclaimer system** | **not built** — Phase 5 |

**Why goal 7 is not a footnote.** HireLens is a hiring product. CV screening is
high-risk under the EU AI Act, and NYC Local Law 144 governs automated
employment decision tools. A disclaimer system is the same category of
obligation as the bias-audit claim the marketing audit had to remove (§8A), and
it interacts with which provider processed which candidate's data.

**Where disclaimers belong** (audited 5 Aug; placement only, nothing added). The
product discloses *uncertainty* well and *provenance* nowhere. `AIAnswer` is
mounted by eight surfaces, so **one insertion point covers most of them**; two
bypass it and need their own — **Decision Intelligence**
(`analyst-brief.tsx`, `decision-memo.tsx`) and **Interview Intelligence**
(`interviews-screen.tsx`).

| Tier | Where | Says |
|---|---|---|
| 1 | Inline, persistent, on any surface where model output informs a candidate-level decision: Deep Review · Triage · Decision Intelligence · Comparison · Interview pack | *"AI-generated. Scores are calculated by HireLens. This narrative was written by a language model and can be wrong or incomplete. Review the evidence before deciding."* The first sentence is **true in this codebase** and almost no competitor can say it |
| 2 | Attached to the artifact — **every export**. The legally significant one: a PDF outlives the session and gets forwarded | Contains AI-generated analysis · scores computed by HireLens · not a hiring decision · date. **No vendor name** — GAB-D1 forbids relocating it there |
| 3 | Conversational, **once per thread**, not per message. Keep the existing grounding note unchanged; it answers a different question | *"HireLens AI can be wrong. It answers from your organization's data where it can, and tells you when it can't."* |
| 4 | `/privacy` and `/llms.txt` — which third-party model providers process customer and candidate data | A DPDP Act / GDPR Art. 13 obligation that gets **harder** with four providers. Write it while there is one. Generate the list from the registry so it cannot drift |
| 5 | Candidate-facing notice | **Out of scope** — candidates never touch the product and the LL144 obligation is the employer's. Tracked, not built, alongside the unperformed bias audit already recorded in `/llms.txt` |


### 11.6 Decisions taken during implementation

**A running log. Append as tasks complete — later tasks depend on these and must
not relitigate them by accident.**

#### Phase 0 · Evaluation Harness (6 Aug 2026) — `app/ai/evaluation/`

| # | Decision | Why it binds later tasks |
|---|---|---|
| **D0.1** | **The harness WRAPS the orchestrator; it never hooks inside it.** It calls `orchestrator.run(...)` exactly as a capability service does and reads the `AIExecution` already returned | §9A rule 1. The cheapest way to break that rule is "just one" instrumentation hook. Any future instrumentation goes outside too |
| **D0.2** | **The injection seam is `runner`**, a callable defaulting to `orchestrator.run`. Tests pass a stub | **Task 2 (Fake Provider) slots in one layer LOWER** — at the provider registry — and the harness will not notice. Do not wire the fake into the harness; wire it into the registry |
| **D0.3** | **Records carry facts, never verdicts.** No score, no `passed`, no ranking on `EvalRecord` or `EvalReport` | **Task 3 (Golden Dataset) brings the first scorer.** Scoring is a Protocol (`scoring.py`) applied *after* a run, over stored records — so re-scoring never re-runs model calls, which is what stops people avoiding a change of mind because it costs tokens. A test asserts no concrete scorer ships |
| **D0.4** | **Persistence is append-only JSONL, gitignored** (`backend/eval-runs/`), not a database table | No migration is forced before Phase 0 can finish — **Phase 4 owns `0028`**. Records contain model output, which is derived from candidate résumés, so committing them would put candidate-derived text into version control where it outlives a deletion request |
| **D0.5** | **`json_valid` is tri-state.** `None` = no response was produced; `False` = the model answered and it was not JSON; a **schema mismatch records `True`** — the JSON parsed, the shape was wrong | This is the classification the harness exists for. Collapsing it makes a provider that times out indistinguishable from one that cannot follow a format instruction, and those have opposite fixes. Pinned by a test, and the guard was watched failing |
| **D0.6** | **Token counts are recorded; cost is not.** No price is looked up, stored or implied | Cost is Phase 4. Token counts are facts the execution already carries, and "provider B was slower" is unreadable without them |
| **D0.7** | **`output_bytes` measures the serialized *validated object*, not raw provider text** | `run()` does not expose raw text and D0.1 forbids reaching in for it. It is a faithful measure of what business logic received, and a proxy — not a substitute — for response size |
| **D0.8** | **`EvalRecord.schema_version`** is stamped on every record | A field whose *meaning* changes must not be silently compared across runs. Bump it when semantics move, never when a field is merely added |
| **D0.9** | **Only `AIError` is recorded as an observation.** Anything else propagates | §9A rule 9. A `TypeError` from a malformed case is a defect in the case, not a provider result, and recording it would poison the dataset |
| **D0.10** | **`run_id` + `case_id` are the comparison keys** | Task 3 must issue **stable** `case_id`s: comparing two providers means joining their runs on `case_id`, so a regenerated id silently breaks every historical comparison |

#### Phase 0 · Fake Provider + Golden Dataset (6 Aug 2026)

| # | Decision | Why it binds later tasks |
|---|---|---|
| **D0.11** | **The fake is a normal provider** — `app/ai/providers/fake_provider.py`, one entry in `providers/registry.py`, one spec in `gateway/provider_registry.py`, one model in `model_registry.py`. `AI_PROVIDER=fake` then drives gateway → health → per-provider config → retry ladder → provider → usage tracker | §9A rule 3: a provider is "a subclass plus a registry entry". **The registry is the injection seam, not the harness** (D0.2) — a fake reached by a shortcut would make every later phase's evidence worthless |
| **D0.11a** | **It is permanent architecture, not test scaffolding, and it is now the REFERENCE IMPLEMENTATION of the provider contract.** Promoted to a standing rule — **§9A rule 12** | Every future provider satisfies the same contract the fake does, and is judged against **the fake, not Groq**. If a provider cannot be built without changing `LLMProvider` in a way the fake could not support, the **interface** is reviewed first — that is the check that stops vendor-specific abstractions creeping back in |
| **D0.12** | **The fake refuses to construct when `ENVIRONMENT=production`** | A fake that silently answers real customers is worse than an outage: the product would look like it was working while every candidate assessment was fabricated. §5A already forbids this for billing |
| **D0.13** | **Its model is registered with NO pricing**, so `estimate_cost` returns `None` | A run reporting "$0.00 spent" reads as a real measurement. Unknown must stay unknown — the same rule §8A enforces for quota meters |
| **D0.14** | **An unregistered prompt raises `AIConfigError`; the fake never invents an answer** | **This closed a real false green.** Several capability schemas (`GroqBatchAnalysis`) default *every* field, so a marker object VALIDATES — a batch case reported success while measuring nothing. `AIConfigError` is non-retryable, so a missing registration fails once instead of burning the ladder three times |
| **D0.15** | **`fingerprint()` normalises the per-call injection nonce out of the prompt** | `untrusted.fence()` embeds fresh randomness on every render so a résumé cannot close its own fence. Without normalisation **no fenced capability could ever be prompt-keyed** — `batch_candidate` silently fell through to the marker above. Genuine prompt-text changes still change the fingerprint, which is what keeps §9A rule 6 detectable |
| **D0.16** | **The dataset is `cases.json` — data, not code.** Adding a case is a JSON edit; the loader validates every `expected_output` against the **real production schema** and fails loudly on a duplicate id, unknown capability or unsatisfiable output | A dataset that silently loses a case reports a better pass rate than reality |
| **D0.17** | **Coupling runs one way only:** the golden loader knows the fake exists (to register answers); the fake imports nothing from `app/ai/evaluation/`. Both directions are asserted over the **AST**, not the raw text | Two guards were first written as substring checks and fired on their own documentation. A guard that flags prose gets deleted for being noise |

**A limitation recorded rather than worked around.** On failure
`orchestrator.run` raises an `AIError` carrying no `AIExecution`, so
provider/model/attempt counts are unavailable. The harness records the gateway's
*intended* primary and labels it `provider_source="intended"` — never passing an
intention off as an observation. **Making the orchestrator attach execution
metadata to its exceptions would fix this properly and is a candidate for
Phase 1**; it was not done here because this task may not modify the
orchestrator.

#### Phase 1 · Provider Bug Fixes (6 Aug 2026) — C2, C8

| # | Decision | Why it binds later tasks |
|---|---|---|
| **D1.1** | **One classifier for every provider — `app/ai/providers/errors.py`.** The four `_classify` staticmethods were the same ladder written four times over four different word lists, and the duplication is what produced C2: only anthropic's copy had `"rate" in msg` | A new provider does not write its own ladder. **Promoted to a standing rule — §9A rule 13**, so it binds every provider added after this one, not just the six that exist. `TestEveryProviderClassifiesThroughTheSharedLadder` asserts every provider routes through it, so a fifth copy fails the suite instead of drifting |
| **D1.2** | **Classification order is type → HTTP status → text.** A status code is authoritative: when one is present the message is not consulted at all, so a 400 whose body mentions a quota is a provider error | This is what "typed SDK exceptions exist and are unused" (C2) actually meant. Text matching still exists, as a last resort for an exception carrying neither — deleting it would misclassify every non-SDK failure |
| **D1.3** | **No SDK is imported to classify.** A vendor exception can only exist if its module is already imported, so the classes are read from `sys.modules` and matched with a real `isinstance` | §9A rule 2 (lazy imports; an unconfigured provider costs nothing) survives, and the tests run on a machine with none of the six vendors' packages installed — which is this one: only `groq` is present |
| **D1.4** | **Quota semantics are unchanged, deliberately.** `is_quota` and `retry_after` are passed IN by each provider, exactly as today: Groq and the OpenAI-compatible family detect quota, Anthropic and Gemini do not | **C1 (Retry Classification) is the next task and must stay measurable.** Silently fixing quota here would have made its "before" identical to its "after". `TestQuotaSemanticsAreUnchanged` pins today's behaviour *including the gap*, and names itself as the test C1 must update in the same commit |
| **D1.5** | **`is_llm_configured` now asks the gateway, not `GROQ_API_KEY`** — "is any provider in the active chain configured", where each provider answers for itself from its declared key setting (§9A rule 10) | Every later phase reads this. A fallback counts only when `AI_ENABLE_FALLBACK` is on, because a chain that cannot be walked cannot answer. **Phase 2's credential resolver replaces where a provider's key comes from, not this question** |
| **D1.6** | **The Groq placeholder-key check moved into `GroqProvider.is_configured()`** | It lived in `core/config.py` as well, which is how "is the LLM configured?" came to mean "is Groq configured?" in the first place. Vendor-specific facts belong to the vendor's provider |

#### Phase 1 · Disabled Provider Fix (6 Aug 2026) — C3

| # | Decision | Why it binds later tasks |
|---|---|---|
| **D1.7** | **`DISABLED` is an instruction, not a health state to fall back to.** The orchestrator now filters disabled providers **before** the healthy/unhealthy split, not after | The bug was one line of ordering: a disabled provider is not *available*, so it fell into `unhealthy`, which the orchestrator deliberately keeps "as a last resort". Every future change to that ordering must keep the filter first — "last resort" may never mean "the one we were told not to call" |
| **D1.8** | **The filter is applied in TWO places on purpose** — `fallback_chain()` and the orchestrator | Not redundancy. The chain covers configured routing; the orchestrator covers the **pinned** paths (an explicit call-site `provider=`/`model=`, and capability→model routing), which never touch the chain. Filtering only the chain would have left two open doors, and both are pinned by their own test |
| **D1.9** | **Disabling every candidate raises `AIConfigError`, not `AIProviderError`.** Non-retryable, and the message distinguishes "the whole chain is disabled" from "the pinned provider is disabled" | A configuration with no answer is not an outage. Retryable would burn the ladder — and on a metered key, budget — against a state that cannot improve without an edit. §9A rule 9: surfaced, never guessed |
| **D1.10** | **The runtime admin switch refuses a disabled provider.** `set_active_provider` raises; `/admin/provider` already maps `AIConfigError` → 400 | An in-memory override must not outrank a deployment decision. Without this the switch would report success and change nothing, because the chain would refuse to route there anyway — the same class of lie C3 was |
| **D1.11** | **`resolve()` was deliberately NOT filtered** | It answers "what model would provider P use for role R", not "route here". `config_snapshot()["roles"]` reads it, and blanking those entries would hide the configuration an operator is trying to inspect. Routing decisions go through `fallback_chain()` and the orchestrator, and those are filtered |
| **D1.12** | **Merely-unhealthy providers are still a last resort, unchanged** | The fix had one obvious over-reach available — treating unhealthy like disabled — which would let stale health hard-fail a request on its own. `test_an_unhealthy_provider_is_still_a_last_resort` exists to fail if a later task takes it |

**`AI_GATEWAY.md:85` needed no edit:** its claim that a `DISABLED` provider is
"never routed" was false when written and is true now. The rest of that document
is still drifted, and reconciling it is still later Phase 1 work.

**One risk this task surfaced, recorded rather than acted on.** `AI_GATEWAY.md`
already claimed rate limits were "not retried", and this task makes the
*classification* correct without touching what the orchestrator does with it. So
the doc drift noted in the document map is now one step wider: the gateway docs
describe a classifier that no longer exists. **Reconciling them is still Phase 1
work and still unstarted** — §11 remains authoritative over `AI_GATEWAY.md`,
`AI_ARCHITECTURE.md` and `AI_PIPELINE.md`.

#### Phase 1 · Retry Classification (6 Aug 2026) — C1

| # | Decision | Why it binds later tasks |
|---|---|---|
| **D1.13** | **Providers declare retry VOCABULARY; `errors.py` makes the retry DECISION.** Two class attributes — `sdk_namespace` (which SDK raises its exceptions) and `quota_markers` (this vendor's words for a ceiling that will not clear today) | The verdict used to be computed by each provider and handed in finished, which is exactly how two of the four came to skip the question. **A new provider adds words, never logic.** Rule 13 now covers the retry decision, not just the error type |
| **D1.14** | **`_classify` lives ONCE, on `LLMProvider`.** The four one-line delegations are gone | The behavioural guard from task 1 would have become trivially true, so it was **replaced by a structural one**: `"_classify" not in vars(Provider)` for all six providers *and the fake*. That is stronger — it fails on the override itself rather than on a symptom |
| **D1.15** | **Marker lists are per-vendor for a CORRECTNESS reason, not tidiness.** Groq's list keeps the bare word `"quota"`; Gemini's deliberately omits it | Google says *"Quota exceeded for quota metric … per minute"* for a limit that clears in seconds. A shared list would fast-fail a Gemini request that was about to succeed — the opposite error to C1, and harder to see. **Do not "unify" these lists later**; a test asserts they differ and says why |
| **D1.16** | **Groq's and the OpenAI family's lists are preserved VERBATIM** | Groq's is the only list ever exercised against a live account. Tuning it while closing a gap on a different provider would have been a behaviour change beyond C1, and would have made the one provider with production evidence the least trustworthy |
| **D1.17** | **Anthropic declares NO quota vocabulary — an answer, not an omission.** Its 429s are per-minute buckets that reset within the minute, and its one non-clearing failure (credit exhaustion) is a 400 that never reaches the rate-limit branch | §9A rule 10 — declared, never inferred. Inventing markers so the list *looked* like Groq's would have been the guess. What Anthropic actually gained from C1 is Retry-After |
| **D1.18** | **`Retry-After` is extracted centrally, for every provider** | "Where the vendor sends one" is answered by looking, not by a per-provider opt-in. Three providers previously discarded a wait time the vendor had explicitly stated and retried too early to succeed. Gemini correctly gets `None` and falls back to jittered backoff |
| **D1.19** | **Quota classification is a two-stage gate:** a message must read as a rate limit *first*, and only then are the markers consulted | So a stray "per day" in an unrelated error cannot manufacture a quota and turn a retryable failure into a fast-fail. Found while writing the tests, when a bare `"tokens per day (TPD)"` string correctly classified as a plain provider error |
| **D1.20** | **Quota keeps sharing `AI_RATE_LIMIT_COOLDOWN_SECONDS`** — deliberately not given its own | `config.py` already labels that setting *"rate-limited / quota"*, so sharing it is an existing recorded decision and overturning it is a behaviour change beyond C1. **It is still arguably wrong** — see the risk recorded below — and belongs to whoever revisits health cooldowns |

**A risk this task surfaced and did NOT act on.** A daily quota now costs one
provider call per *request*, but the provider is only marked unhealthy for
`AI_RATE_LIMIT_COOLDOWN_SECONDS` (60s). An exhausted daily budget therefore gets
re-probed every minute for the rest of the day — a slower version of the burn C1
exists to stop. Fixing it is one row in `health._FAILURE_MAP` plus one setting,
but it changes a decision `config.py` records explicitly (D1.20), so it needs its
own task rather than a quiet ride along with this one.

**One risk this task surfaced, recorded rather than acted on.** `AI_GATEWAY.md`
already claimed rate limits were "not retried", and this task makes the
*classification* correct without touching what the orchestrator does with it. So
the doc drift noted in the document map is now one step wider: the gateway docs
describe a classifier that no longer exists. **Reconciling them is still Phase 1
work and still unstarted** — §11 remains authoritative over `AI_GATEWAY.md`,
`AI_ARCHITECTURE.md` and `AI_PIPELINE.md`.

#### Phase 1 · Provider Validation (6 Aug 2026) — C9

| # | Decision | Why it binds later tasks |
|---|---|---|
| **D1.21** | **The validator is PURE — findings, never repairs, never raises.** `check_provider_configuration()` returns a `list[ConfigProblem]`; `validate_ai_configuration()` is the only thing that turns a finding into a refusal | Borrowed from `app/billing/invariants.py` (§9A rule 4 says borrow the *pattern*, not the code). It is what lets `/health` and the admin snapshot reach the **same verdict** as the startup gate without either re-implementing the other — and it is called from surfaces where an exception would take down the very page that reports the problem |
| **D1.22** | **Fatal is reserved for CLOSED SETS.** A provider name outside the registry can never work, whatever else is true, so it fails a deploy rather than every request afterwards | The rule for the next person adding a check: if a wrong-looking value could legitimately be right in some deployment, it is a warning. If it is drawn from a finite list this repo owns, it is fatal |
| **D1.23** | **Three things are deliberately NOT fatal** — a missing API key, a fully-disabled chain, and an unregistered role-model override | Each would make the fix worse than the finding. Running without AI is supported (parsing, auth and candidates work). A fully-disabled chain is the **incident lever task 2 built** — turning "AI is off" into "the service will not start" inverts it. And `model_registry.py` documents that unknown models still work, so a typo and a model released last week are indistinguishable from here. **Do not "tighten" these later without changing those three facts first** |
| **D1.24** | **Registered ≠ usable for reasoning, and the message says which.** `AI_PROVIDER=hashing` reports *"registered but does not support reasoning (declares: embeddings)"*, not *"unknown provider"* | The first draft intersected the two registries, which made a real provider report as unknown and would have sent an operator hunting a typo that was not there. Capability is read off the declared spec (§9A rule 10), never guessed from the name |
| **D1.25** | **Configuration and liveness are two axes, reported separately.** `config_snapshot()` now carries `configuration` (configured · misconfigured · not_configured · disabled) beside the existing `health` | Collapsing them is how a vendor's bad afternoon gets diagnosed as a config error, and how a config error gets waited out. **A provider outage may never reach the startup gate** — a service that refuses to restart because a vendor is down has turned their outage into ours. Pinned by a named test |
| **D1.26** | **`/health` gained `llm: misconfigured`** as a third value beside `configured` and `not_configured` | A missing key means AI is switched off; a misconfiguration means the configuration names something that cannot work. Reporting both as `not_configured` sent an operator looking for a key that was never the problem |
| **D1.27** | **All fatal problems are reported at once**, not one per boot | Fixing configuration by rediscovering the next failure after each redeploy is how a ten-minute fix becomes an hour |

**The guard that this task nearly shipped without.** Injecting a violation —
commenting the validator out of `validate_startup()` — broke **nothing**: all 29
tests called `validate_ai_configuration()` directly, so they stayed green while
the check was disconnected from boot entirely. That is C3's failure mode exactly:
a correct mechanism that nothing calls. `TestStartupActuallyCallsTheValidator`
drives `validate_startup()` itself and was watched failing under that injection.
**Any future validation added here needs a test on the wiring, not only on the
logic.**

---

## 11A. Billing — PAUSED, and what unpauses it

### The work is stopped, deliberately

**Everything that can be built without the gateway has been built.** No
remaining *billing* task is independent of the Razorpay Subscriptions API, which
returns 401 for this account (§5A). Do not start anything below until that is
resolved — building against an API that has never answered means guessing at its
shape and discovering the mismatch at a worse moment.

(The AI Architecture milestone above needs none of this and is not blocked by
it. Rule 4 in §9A cuts the other way too: **that milestone must not touch
`app/billing/**`.**)

### The one action that unblocks everything

**Get Subscriptions enabled on the Razorpay account** (§5A step 1). Verify with:

```
cd backend && .venv/Scripts/python.exe -m scripts.razorpay_plans --doctor
```

You want `✓ subscriptions HTTP 200`. Nothing else in this section can start
before that line appears.

### Then, in this order

Agreed 5 Aug 2026. Each leaves the product working and is separately reviewable.

| # | Step | Notes |
|---|---|---|
| 1 | **Razorpay Plans** | `python -m scripts.razorpay_plans --create`. Idempotent — searches on amount/period/currency first, because plans are **immutable and undeletable** |
| 2 | **Subscription Checkout** | Wire `UpgradeDialog`'s `onCheckout`; the endpoint and refusals already exist |
| 3 | **Webhook Processing** | Route, signature verification and lifecycle already exist; needs `RAZORPAY_WEBHOOK_SECRET` and a publicly reachable URL (§5A steps 2–3) |
| 4 | **End-to-End Test Payment** | Test Mode only. Checkout → mandate → charge → webhook → plan active, then redeliver and confirm it is a no-op |
| 5 | **Billing Trigger** | The grace sweep's cron. Deferred until now on purpose — see §5A |
| 6 | **Reconciliation Worker** | BILL-6. `billing_reconciliation` exists and nothing writes it |

### Explicitly NOT in that list

Invoices, billing portal, dunning comms, refunds, annual plans, international
payments, Stripe or any second provider. All deferred by decision and recorded
in [BILLING_TODO.md](./BILLING_TODO.md) so they are not rediscovered as
surprises.

### Open items that need no gateway but are not scheduled

Not blockers, and not started. Full detail in `BILLING_TODO.md`.

- **BILL-3 (P2)** — Enterprise has no activation path. `manual_activate()` has
  zero callers while `/pricing` sells Enterprise through "Talk to sales".
  Production already carries one `enterprise` row with `billing_mode='none'`,
  which is the shape that gap produces.
- **BILL-4 (P2)** — `subscriptions.limits` goes stale after a billing write.
  Recommended fix is dropping the column, not writing it from billing.
- **BILL-7 / BILL-8 (P3)** — defensive: an unknown payment status is silently
  dropped; `captured_at` uses the payment's creation time.

---

## 12. Final status

Three distinctions matter here, and conflating them is how a project convinces
itself it is closer to shipping than it is:

- **Implemented** — the code exists, is committed, and its tests pass.
- **Browser verified** — it has been driven in a real browser against real
  infrastructure. Green tests do not confer this.
- **Blocked** — waiting on something outside this repository.

### Completed milestones

| Milestone | Implemented | Browser verified | Note |
|---|---|---|---|
| Monetization & Entitlements (Phase 1–2) | ✅ | ⬜ | enforced in production |
| Pricing experience (Phase 3) | ✅ | ⬜ | markup checked by curl only |
| Product polish (4 Aug) | ✅ | ⬜ | §8A |
| Legal pages | ⚠️ | ⬜ | built, but **DRAFT** until `lib/legal.ts` is filled (§8A) |
| Marketing trust / compliance cleanup | ✅ | ⬜ | nine untrue claims removed; pinned by tests (§8A) |
| Billing architecture | ✅ | n/a | §3 |
| Billing Step 1 — schema | ✅ | n/a | 0022–0027 applied to production |
| Billing Step 2 — domain | ✅ | n/a | provider-agnostic; fake provider |
| Billing Step 3 — Razorpay adapter | ✅ | n/a | offline-tested; **never run against the gateway** |
| Billing Step 4 — repository / service | ✅ | n/a | code complete, offline-tested |
| Grace sweep (BILL-2) | ✅ | n/a | trigger deliberately deferred (BILL-T1) |
| AI discoverability (SEO + LLMs) | ✅ | **✅** | §8C |
| **Authentication** | ✅ | **✅** | §8D — end to end, against real Supabase |
| **GAB-D1** — vendor attribution off exported PDFs | ✅ | n/a | §8E — verified against generated PDFs; guarded in both codebases. Closed the backlog's only gate failure |

### Blocked by an external dependency

| Item | Blocked on |
|---|---|
| Billing Step 5 — test-mode payment | **Razorpay Subscriptions API returns 401** — the product is not enabled on the account, most likely pending KYC (§5A) |
| Razorpay plans, checkout UI, webhook delivery | the same |
| Razorpay merchant activation | `lib/legal.ts` unfilled — four policy pages must be published (§8A) |
| PITR / restorable backup | operator action; **blocks the first real payment** (OPS-1) |

### Not started

```
Billing trigger (BILL-T1)     ░░░░░░░░░░  deliberately deferred (§5A)
Enterprise activation         ░░░░░░░░░░  no code path at all (BILL-3)
Reconciliation worker         ░░░░░░░░░░  table exists, nothing writes it (BILL-6)
AI Architecture (§11)         ████░░░░░░  ACTIVE — Phase 0 COMPLETE (3/3); Phase 1 (4/6)
RC checklist                  ░░░░░░░░░░  0 of 267 boxes ticked
Production payments           ░░░░░░░░░░  none ever processed
```

### Browser QA coverage

```
Product shell, keyboard paths ██████████  3 Aug — Playwright, ~170-shot sweep
Public machine-readable layer ██████████  5 Aug — §8C
Authentication (all screens)  ██████████  5 Aug — §8D, real Supabase
Marketing / policy pages      ░░░░░░░░░░  built 4 Aug, never looked at
Product screens built 4–5 Aug ░░░░░░░░░░  drop zone, dialogs, Inbox states
```

**Tests:** backend 714 · frontend 455 (33 files) · `tsc` clean · `next build`
clean, 40 routes · eslint exactly 4 known errors.

**The honest summary:** the server side is real and verified. The public surface
is now truthful, which it was not on 3 August, and machine-readable, which it was
not this morning. Authentication is the first whole feature area in this project
that is both implemented *and* driven end to end in a browser. Billing is
code-complete up to the point where a gateway is required.

Three things are still true and all three gate the release:

1. **No money has ever moved.** Not one rupee, not even in Test Mode. The
   Razorpay Subscriptions API has never returned a subscription to this account.
2. **Much of the rendered product still has not been looked at.** The browser
   blocker was removed on 3 Aug (Playwright, not the extension) and real passes
   have now covered the product shell, the public machine-readable layer and
   every authentication screen. The marketing and policy pages, and the product
   screens built on 4–5 Aug, have been seen only by tests. §8 and
   `BROWSER_QA_CHECKLIST.md` §0b are the honest breakdown.
3. **Nothing suspends anyone.** The grace sweep is built and idle by choice.

`docs/RELEASE_CANDIDATE_CHECKLIST.md` is the single gate before anything ships.

---

## 13. AI milestone progress

**This table is the milestone's status of record.** Update it as each task
completes (§9A, rule 11) — do not add new progress notes elsewhere, and do not
create a second tracking file. It pairs with the task checkboxes in §11.3.

Status vocabulary, deliberately the same three words §12 uses:
**Not Started** · **In Progress** · **Complete** — where *Complete* means
implemented **and** verified, never merely written.

| Phase | Status | Notes |
|--------|--------|-------|
| **Phase 0** — Evaluation Harness · Fake Provider · Golden Dataset | **Complete** (6 Aug 2026) | 70 tests, ~1.3s, fully offline. `AI_PROVIDER=fake` drives the real stack end to end and the golden dataset runs 6/6 through it. **R1 is now measurable rather than closed** — a baseline can be captured; nothing has been compared yet, which is Phase 6's job |
| **Phase 1** — Shared Provider Classifier · Disabled Provider · Retry Classification · Provider Validation · Default Model · Native JSON | **In Progress** (4 of 6 complete) | Closes C1–C6, C8, C9. Behaviour-visible narrowly; **the Groq path is unchanged throughout**. **Shared Provider Classifier** `913426f` — C2 + C8, 37 tests, §9A rule 13. **Disabled Provider Fix** `561003a` — C3, 16 tests, **R8 retired**. **Retry Classification** `136340b` — C1, 50 tests, **R5 retired**, §9A rule 14. **Provider Validation** `fbc07b2` — **C9, 32 tests, §9A rule 15**. Each was committed on its own and each had its guards watched failing against the pre-fix code. Backend 574 → 611 → 627 → 682 → 714. Next: **Default Model Fix (C4, C5)**, not started |
| **Phase 2** — Credential Resolver · Local Provider · Local Runtime Override | Not Started | Closes C10 and delivers goal 5. Build the credential **seam**, not the BYO feature (C12) |
| **Phase 3** — Capability Profiles · Intelligent Provider Selection · Token Budget Validation | Not Started | The only genuine design work in the milestone. Closes C7 and goal 2. **Gated on Phase 0's eval parity** |
| **Phase 4** — Usage Persistence · AI Provenance · Cost Tracking | Not Started | Migration 0028, additive and nullable. **Phase 5 depends on this** |
| **Phase 5** — AI Disclaimer System | Not Started | The customer-visible phase. Requires browser verification, not green tests |
| **Phase 6** — Multi Provider Live Testing · Paid Groq · OpenAI · Gemini · Anthropic | Not Started | Config only, but needs each provider's key in Render, the container **and** the CI staging gate |
| **C11** — vector-store read-time model enforcement | Not Started | Not in a phase; independent of the provider work. Do it in Phase 1 or 2 — search quality only improves |

**Not part of this milestone**, recorded here so it is not mistaken for
outstanding work: **`GAB-D1`** (§8E) is **Complete** — it was a governance gate
failure fixed on its own before Phase 0 began.

---

## Document map

| Document | What it holds |
|---|---|
| [RELEASE_CANDIDATE_CHECKLIST.md](./RELEASE_CANDIDATE_CHECKLIST.md) | **The release gate.** 267 boxes, none ticked |
| [BROWSER_QA_CHECKLIST.md](./BROWSER_QA_CHECKLIST.md) | Browser blocker diagnosis + FREE-journey script |
| [BILLING_TODO.md](./BILLING_TODO.md) | **Every open payment item**, with blast radius and priority |
| [BILLING_ARCHITECTURE.md](./BILLING_ARCHITECTURE.md) | Full billing design, Razorpay-specific detail |
| [MONETIZATION_ARCHITECTURE.md](./MONETIZATION_ARCHITECTURE.md) | Plans, entitlements, quotas |
| [rca/SUBSCRIPTION_ROWS_MISSING.md](./rca/SUBSCRIPTION_ROWS_MISSING.md) | Why 69 organizations lost their subscriptions |
| [OPERATIONAL_HARDENING_BACKLOG.md](./OPERATIONAL_HARDENING_BACKLOG.md) | PITR, audit trail, retention (OPS-1…6) |
| [GOVERNANCE_ALIGNMENT_BACKLOG.md](./GOVERNANCE_ALIGNMENT_BACKLOG.md) | 12 positioning/attribution items (GAB-*). **`GAB-D1` done (§8E); no open gate failures.** `GAB-D2` and the PDF `title=` drift remain |
| [MIGRATION_ROLLBACK_NOTES.md](./MIGRATION_ROLLBACK_NOTES.md) | Per-migration rollback for 0022–0027 |
| [AI_ARCHITECTURE.md](./AI_ARCHITECTURE.md) · [AI_GATEWAY.md](./AI_GATEWAY.md) · [AI_PIPELINE.md](./AI_PIPELINE.md) | The AI layer as built. **Each has drifted from the code** — `AI_GATEWAY.md` documents a `raw` field on `ProviderResponse` that was deliberately removed, and says rate-limits are "not retried" when transient 429s are retried twice. Reconciling them is Phase 1 work; until then **§11 is authoritative, not these** |
| [TRUTHFUL_AI.md](./TRUTHFUL_AI.md) | The AI-honesty contract §11.5's disclaimer tiers are built to satisfy |
| [ARCHITECTURE.md](./ARCHITECTURE.md) · [DATABASE.md](./DATABASE.md) · [API.md](./API.md) · [SECURITY.md](./SECURITY.md) | The product itself |
| [decisions/](./decisions/) | 18 ADRs |
| [archive/](./archive/) | Finished work. Not authoritative |
