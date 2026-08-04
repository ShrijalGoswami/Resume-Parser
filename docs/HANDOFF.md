# HireLens — Engineering Handoff

**Written:** 2 Aug 2026 · **Updated:** 5 Aug 2026 (authentication UX milestone) ·
**Replaces** the previous handoff entirely
(recoverable at `git show e76df63:docs/HANDOFF.md`)

This document is written to be read **alone**. Nothing in it depends on chat
history. If you are opening this repository for the first time, this is the only
file you need to understand where the project stands.

> **One-line status.** The product, its monetization and its public surface are
> built, enforced and truthful. The billing domain, adapter, repository,
> checkout endpoint, webhook route, lifecycle **and grace sweep** are all
> written and tested offline. **Everything is now blocked on one external
> thing: the Razorpay Subscriptions API returns 401 for this account, and the
> credentials are valid** (§5A). Nothing further can be built against it, and
> nothing is to be worked around.
>
> **Last updated:** 5 Aug 2026. The authentication UX milestone is **closed**
> (§8D) — passwords can be revealed, both emailed-link flows validate their
> session before offering a form, and the auth surface stopped claiming a SOC 2
> audit it does not have. Preceded by AI discoverability (§8C). Billing work
> resumes only when Razorpay Subscriptions becomes available — §11.

---

## 1. Current repository status

| | |
|---|---|
| **Branch** | `manus-ui-v1` |
| **Latest commit** | `64302d6` — *test(auth): cover the invite state machine…* |
| **Working tree** | **clean** |
| **Current milestone** | Authentication UX — **CLOSED** (§8D). Billing remains **PAUSED** on the gateway (§5A, §11) |
| **Backend tests** | **493 passed** (measured 5 Aug 2026) |
| **Frontend tests** | **450 passed**, 32 files (measured 5 Aug 2026) |
| **`tsc --noEmit`** | clean |
| **`eslint .`** | **4 errors — all known debt** (§10) |
| **`next build`** | succeeds; 39 routes |

> **On the test counts.** Frontend went 363 → 410 → 442. The discoverability
> milestone added `tests/discoverability.test.ts` (30) and matcher-coverage
> assertions in `tests/proxy.test.ts` (17); the auth milestone added
> `tests/password-policy.test.ts` (9) and `tests/auth-password-ux.test.tsx`
> (22, then 30 when the invite screen joined it). No backend code changed in
> either, so 493 is unmoved.

### Working tree

**Clean.** Everything through the authentication UX milestone is committed.

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
- Grace sweep. `state_machine.due_for_suspension()` and `expire_grace()` exist
  and are tested, but **nothing calls them** — so no organization is ever
  actually suspended today. The FAQ promise that "your team keeps working" is
  currently kept by accident rather than by design.

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
  startup. (Uncommitted; see §1.)
- **Billing schema applied** — 0022–0026 live; all billing tables empty.
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

- Backend **335** tests, frontend **363** tests, `tsc` clean, `next build`
  succeeds across 28 routes — including the four new policy routes, which
  prerender as static.
- Catalog parity proven **bidirectionally** by deliberate mutation.
- Migrations 0022–0026 applied to production; every CHECK tested by attempting a
  real write against the live database (negative amounts, refund > amount,
  `provider='stripe'`, the GST invariant, `corrected > drift` — all rejected).
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

### NOT verified — every one of these is genuinely unknown

- **First checkout.** The endpoint exists and is tested against a fake. Nobody
  has ever started a real one.
- **Webhook delivery.** The route exists. Razorpay has still never sent us
  anything, so the signature path has never seen a genuine Razorpay HMAC — only
  one this codebase generated.
- **A real payment.** Zero — not even in test mode.
- **End-to-end subscription lifecycle.** Every transition is unit-tested against
  a fake; none has ever been driven by an actual gateway.
- **Anything requiring credentials.** `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`,
  `RAZORPAY_WEBHOOK_SECRET` and both plan ids are unset in this environment, and
  no Razorpay account exists. Step 4's objective 6 (a test-mode payment) is
  **blocked on that**, not on code.
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
- **Everything built on 4–5 Aug is NOT in that pass**, because it postdates it:
  the four policy pages, the mobile disclosure menu, the drop zone, the
  plan-level upgrade dialog, the Settings ▸ Billing CTA, the Inbox em-dash
  states and the homepage marketing rewrite. 363 passing tests and a clean build
  prove the markup and the logic; they prove nothing about how any of it looks.
  The harness to check exists now — that is the difference from a week ago.
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

Everything in this section is **uncommitted** and lives in the working tree (§1).

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
`© 2024` footer, the login page's "we'll check if your team uses SSO" which
checks nothing, and signup surfacing raw Supabase error strings while login maps
them. (Sitemap, robots and OG images were on this list and have since been done
— §8C.)

---

## 8C. AI discoverability milestone (5 Aug 2026)

**Committed**, five commits, listed in §1.

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

## 8D. Authentication UX milestone (5 Aug 2026) — CLOSED

**Committed**, seven commits, listed in §1. Browser-verified against real
Supabase, including an actual password change and an actual invite acceptance,
both cleaned up afterwards (*Verified*, below).

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
sending mail — to `qa.invite@hirelens.test`. 24 checks: the expired screen with
no session, a bogus token refused at the callback, the real link recognised, the
form gated until valid, the confirmation screen, signing in with the new
credentials on a clean browser, and the link refused on replay. The account is
deleted afterwards.

### The invite screen, and why the pattern is now shared

`/auth/accept-invite` had the identical unvalidated-session bug. It was fixed by
**extracting** the reset screen's logic rather than copying it — copying is how
the two came to differ in the first place.

| | |
|---|---|
| `use-link-session.ts` | one read of the session behind an emailed link, one subscription, and one fix for the race between them |
| `link-session-screens.tsx` | the shared `checking` spinner and `expired` screen |

**`tests/auth-password-ux.test.tsx` asserts neither form contains
`onAuthStateChange` and both import `useLinkSession`.** A future copy fails the
suite rather than drifting silently. Keep that test.

**Where invite diverges, deliberately:** an expired reset can be re-requested by
the person standing there; an expired invite cannot — only an admin can reissue
it. So that screen offers **no action button** and names who to ask, rather than
dangling a control that would not work.

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

## 10. Known technical debt

| # | Item | Status |
|---|---|---|
| 1 | **4 eslint errors** — `react-hooks/refs` in `components/marketing/NeuralBackground.tsx:292–293`, refs mutated during render. From commit `6ba960a`; unrelated to monetization. **`npx eslint .` exiting non-zero is expected — a 5th error is a regression.** | Deliberately unfixed |
| 2 | **Browser QA partially done.** Unblocked 3 Aug 2026 by dropping the Chrome extension for Playwright. A real pass covered the product shell, keyboard paths and a ~170-shot route sweep; §0b of `BROWSER_QA_CHECKLIST.md` separates what was driven from what was only typechecked. | Harness works; coverage incomplete |
| 3 | **Everything built 4–5 Aug is unverified in a browser** — policy pages, mobile menu, drop zone, upgrade dialog, Settings ▸ Billing CTA, Inbox states, marketing rewrite. Postdates the pass. | Open — the harness now exists |
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

## 11. Next milestone — PAUSED, and what unpauses it

### The work is stopped, deliberately

**Everything that can be built without the gateway has been built.** There is no
remaining coding task that does not depend on the Razorpay Subscriptions API,
which returns 401 for this account (§5A). Do not start anything below until that
is resolved — building against an API that has never answered means guessing at
its shape and discovering the mismatch at a worse moment.

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

```
Monetization (Phase 1)        ██████████  complete, enforced in production
Entitlements & UI (Phase 2)   ██████████  complete  — never seen in a browser
Pricing experience (Phase 3)  ██████████  complete  — never seen in a browser
Product polish (4 Aug)        ██████████  complete  — never seen in a browser
Legal pages                   ███████░░░  built; DRAFT until lib/legal.ts is filled
Billing architecture          ██████████  complete, documented
Billing Step 1 (schema)       ██████████  complete, applied to production
Billing Step 2 (domain)       ██████████  complete  — UNCOMMITTED
Billing Step 3 (Razorpay)     ██████████  complete  — UNCOMMITTED
Billing Step 4 (integration)  ██████████  code complete, offline-tested
Billing Step 5 (test mode)    ██░░░░░░░░  BLOCKED — Subscriptions API 401 (§5A)
Grace sweep (BILL-2)          ██████████  built, tested, verified — trigger deferred
Billing trigger (BILL-T1)     ░░░░░░░░░░  deliberately deferred (§5A)
Enterprise activation         ░░░░░░░░░░  no code path at all (BILL-3)
Reconciliation worker         ░░░░░░░░░░  table exists, nothing writes it (BILL-6)
Browser QA                    █████░░░░░  unblocked 3 Aug; shell done, 4–5 Aug work not
RC checklist                  ░░░░░░░░░░  0 of 267 boxes ticked
Production payments           ░░░░░░░░░░  not started, none ever processed
```

**Tests:** backend 493 · frontend 363 · `tsc` clean · `next build` clean ·
eslint 4 known errors.

**The honest summary:** the server side is real and verified. The public surface
is now truthful, which it was not on 3 August. Billing is code-complete up to
the point where a gateway is required, including the sweep that ends a dunning
cycle.

Three things are still true and all three gate the release:

1. **No money has ever moved.** Not one rupee, not even in Test Mode. The
   Razorpay Subscriptions API has never returned a subscription to this account.
2. **Most of the rendered product has now been looked at — but not the newest
   part.** The browser blocker was removed on 3 Aug (Playwright, not the
   extension) and a real pass covered the product shell. Everything built on
   4–5 Aug postdates it and has been seen only by tests. §8 and
   `BROWSER_QA_CHECKLIST.md` §0b are the honest breakdown.
3. **Nothing suspends anyone.** The grace sweep is built and idle by choice.

`docs/RELEASE_CANDIDATE_CHECKLIST.md` is the single gate before anything ships.

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
| [MIGRATION_ROLLBACK_NOTES.md](./MIGRATION_ROLLBACK_NOTES.md) | Per-migration rollback for 0022–0027 |
| [ARCHITECTURE.md](./ARCHITECTURE.md) · [DATABASE.md](./DATABASE.md) · [API.md](./API.md) · [SECURITY.md](./SECURITY.md) | The product itself |
| [decisions/](./decisions/) | 17 ADRs |
| [archive/](./archive/) | Finished work. Not authoritative |
