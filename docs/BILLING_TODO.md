# Billing — open items

**Created:** 5 Aug 2026 · **Owner:** unassigned · **Status of the milestone:**
Phase 4 Step 5 blocked (BILL-B1)

Every payment-related thing that is known, unfinished or wrong, in one place. An
audit finding with no home is an audit finding that comes back.

**How to read the priorities.** They are about the customer, not the code:

| | |
|---|---|
| **BLOCKER** | Nothing can proceed. External dependency. |
| **P1** | Would produce a wrong outcome for a real customer or a wrong record. Fix before the first live payment. |
| **P2** | Real gap, no customer harm today. Fix before general availability. |
| **P3** | Cosmetic or defensive. |

Nothing here is fixed by writing code against the Razorpay Subscriptions API,
because that API is unavailable (BILL-B1). Items marked **fixable now** need no
gateway.

---

## Blockers — external, cannot be coded around

### BILL-B1 · Razorpay Subscriptions API returns 401
**Status:** open · awaiting account activation

The credentials are **valid**. `GET /v1/payments` returns 200 with the same key
pair that gets 401 from `/v1/plans` and `/v1/subscriptions`. Razorpay returns a
bare `{"error":"Unauthorized"}` for both cases, so read alone it looks exactly
like a mistyped secret — it is not one.

Reproduce: `python -m scripts.razorpay_plans --doctor`

Strong inference: the **Subscriptions product is not enabled** on the account.
Razorpay API keys are account-wide rather than per-product scoped, so there is no
other plausible explanation for authentication succeeding on one product and
failing on another. Likely tied to KYC being incomplete.

*Blocks:* BILL-B2, BILL-B3, plan creation, every end-to-end verification, and all
of Phase 4 Step 5 items 2, 4, 5, 9.

### BILL-B2 · No webhook secret
**Status:** open · `RAZORPAY_WEBHOOK_SECRET` unset

Created in Dashboard → Settings → Webhooks. Until it exists,
`verify_webhook` cannot run against anything real. The signature code is written
and unit-tested against HMACs this codebase generates — **it has never seen a
genuine Razorpay signature.**

### BILL-B3 · No publicly reachable webhook URL
**Status:** open · decision needed

Razorpay cannot reach `localhost`. Needs either a tunnel
(`cloudflared` / `ngrok`) or a deployed backend. This is a deployment decision,
not a coding task, and it gates any real redelivery test.

---

## Awaiting an operator action

### BILL-M1 · ~~Apply migration 0027~~ — **APPLIED 5 Aug 2026**
Verified against production: `subscriptions.billing_state` exists, all four rows
backfilled to `active`, and the sweep's predicates return correctly over the
real schema.

### BILL-T1 · Choose what triggers the grace sweep
**Status:** open · **the last thing standing between BILL-2 and "done"**

See BILL-2 below. Recommendation: an external daily cron running
`python -m scripts.grace_sweep --apply`. Until it exists, nothing is ever
suspended.

---

## P1 — wrong outcome for a customer or a record

### BILL-1 · ~~`payment_failed` reads back from the database as `grace`~~ — **FIXED IN CODE, MIGRATION PENDING**
**Found:** 5 Aug 2026 · **Introduced:** Step 4 · **Fixed:** 5 Aug 2026

> **Resolved by migration 0027**, which adds `subscriptions.billing_state` — the
> full eight-value state, stored alongside the five-value `status` projection
> the rest of the product reads. One column, because the projection was lossy in
> **two** places (`past_due` → payment_failed|grace, and `canceled` →
> free|suspended|cancelled), and a narrow `retries_exhausted_at` would have
> fixed only the first and needed a third column for the next state added.
>
> The enrichment may never override `status`: `status` has other writers (the
> operator path sets a plan and status without knowing the state machine
> exists), so the reader requires the two to agree and falls back to deriving
> from `status` when they do not. A stale enrichment degrades to yesterday's
> behaviour; it can never resurrect a cancelled subscription.
>
> All eight states now round-trip. The `xfail` is gone.
>
> **⚠ ONE ACTION OUTSTANDING: apply `0027_subscription_billing_state.sql`.**
> There is no Supabase CLI and no SQL-exec RPC in this project, so it must be
> run by hand in the SQL editor. Until then the code degrades — it detects the
> missing column once, logs `APPLY MIGRATION 0027`, and reconstructs from
> `status` exactly as before. Verified against production. Reads and writes both
> keep working; the two dunning states are simply not distinguishable yet.

<details>
<summary>The original analysis, kept for the record</summary>

`state_machine.transition()` sets `grace_period_ends_at` for **both**
`payment_failed` and `grace`, deliberately — the window must open at failure time
so every surface gives the same answer to "how long do they have?". So
`repository._state_from_row()` has no durable discriminator and always resolves a
dunning row to `grace`.

Reproduce:

```python
from app.billing.domain import state_machine as m
from app.billing.domain.models import BillingState, Subscription
sub = m.record_payment_failure(
    Subscription(organization_id="o", plan="plus", state=BillingState.active))
# sub.state is payment_failed; save it and read it back -> grace
```

**Blast radius, honestly:**

- **Entitlement: none.** Both persist as `past_due`, both grant full paid access.
  No customer gains or loses anything. This is why it is P1 and not P0.
- **`expire_grace()` would skip a beat.** It would call `suspend()` directly
  instead of `enter_grace()` then `suspend()`, so a suspension would carry no
  `grace` in its history — breaking a documented invariant. Not reachable today
  because nothing calls the sweep (BILL-2), which is the only reason this has not
  already produced a bad record.
- **The "retries exhausted" transition is never recorded.** A later
  `subscription.halted` resolves to `grace -> grace`, which `_apply` treats as a
  no-op.
- **Operators and support see the wrong state** for a subscription the gateway is
  still retrying.

**Fix:** a durable discriminator the row does not have — migration 0027 adding
`subscriptions.retries_exhausted_at timestamptz`, set on entry to `grace` and
cleared on recovery. Not done in this pass because it is a production schema
change and the pass was scoped to review.

> **Why the existing tests missed it:** they hand-built rows with
> `grace_period_ends_at=None`, a shape the production path never produces. A
> round-trip test that constructs its own input is testing the reconstruction
> against itself. The round-trip suite is now parameterised over
> `list(BillingState)` — all eight, no exceptions and no "covered elsewhere",
> which is where both collisions had been hiding.

</details>

### BILL-2 · ~~Nothing ever suspends anyone~~ — **BUILT, NOT YET TRIGGERED**
**Status:** built 5 Aug 2026 · **one decision outstanding**

`app/billing/grace.py` (`GraceSweep`) and `scripts/grace_sweep.py`. Suspends an
organization when **both** `billing_state == grace` and `grace_period_ends_at`
has passed, and nothing else. Never founding, never manual Enterprise, never
`active` / `payment_failed` / `free` / `pending_activation` / `trialing` /
`cancelled` / `suspended`. Every suspension writes an audit record. Idempotent,
concurrency-safe, dry-run by default. 45 tests; verified read-only against the
production schema.

> ### ⚠ NOTHING TRIGGERS IT YET
>
> The sweep is a script, and no cron, timer or scheduled job invokes it. **Until
> one does, no organization is ever suspended** — which is exactly the behaviour
> that existed before it was built, so nothing regresses by waiting, but the
> grace period stays unbounded and BILL-2 is not truly closed.
>
> Three options, with the trade-offs, are in the `scripts/grace_sweep.py`
> docstring. The recommendation is an **external daily cron** calling
> `python -m scripts.grace_sweep --apply`: the window is seven days, so hourly
> resolution buys nothing, and a scheduled platform job would need an
> authenticated HTTP route that does not exist. An unauthenticated endpoint that
> suspends customers is not something to add speculatively.
>
> **Decide before the first live payment.**

Two deliberate design choices worth knowing:

- **`payment_failed` past its deadline is NOT suspended.** The state machine's
  `expire_grace()` would walk it through `grace` first and suspend it; the sweep
  will not. `payment_failed` means the gateway is still retrying, and cutting a
  customer off while a charge might still succeed is us overruling the gateway
  on our own clock. Reported as `SweepResult.stalled` for a human instead. The
  cost: a dunning cycle that never reaches `halted` at Razorpay leaves the
  customer on an unbounded grace period. That is the safer failure, and it is
  visible rather than silent.
- **It refuses to run without migration 0027.** On the old schema
  `payment_failed` and `grace` are the same persisted row, so a sweep would
  suspend customers whose payments are still being retried — the exact opposite
  of its purpose.

---

## P2 — real gap, no customer harm today

### BILL-3 · Enterprise has no activation path — **fixable now**
`state_machine.manual_activate()` exists and has **zero callers**. The pricing
page sells Enterprise via "Talk to sales", and there is no code path to actually
put an organization on it. `scripts/set_org_plan.py` sets a plan but does not go
through the billing state machine, so it writes no `billing_mode`, no
attribution, and cannot satisfy `subscriptions_manual_attribution_chk`.

Needed: an operator script or admin endpoint that calls `manual_activate` with a
recorded reason and actor.

### BILL-4 · `subscriptions.limits` goes stale after a billing write — **fixable now**
`OrgRepository.update_subscription()` (the operator path) writes the `limits`
column. `BillingRepository.save_subscription()` (the billing path) does not.

**No enforcement impact:** `resolve_org_context` does not read the column
(`plan,status,plan_ruleset,plan_version,limit_overrides`), and `ctx.limits()`
computes from the plan. But `GET /org/subscription` returns the row including
`limits`, so after a gateway-driven upgrade that response reports the *previous*
plan's limits.

Recommended fix is to **drop the column**, not to write it from billing:
duplicated derived data with two writers and no reader is how the two got out of
step in the first place.

### BILL-5 · The two-table write is not transactional
`save_subscription()` writes `subscriptions` then `organizations.plan`. The
Supabase client has no multi-statement transaction, so a crash between them
leaves them disagreeing.

Mitigated deliberately by write ORDER: entitlement resolves
`sub_row.plan or org_row.plan`, so the authoritative table is written first and a
partial failure leaves entitlement *correct* with only a denormalized copy stale.
A proper fix is an RPC doing both in one statement.

### BILL-6 · No reconciliation worker
`billing_reconciliation` (migration 0026) exists and nothing writes to it.
Gateway and database can drift with nothing to notice — a webhook Razorpay never
delivered is invisible.

---

## P3 — defensive

### BILL-7 · An unknown payment status silently drops the payment row
`billing_payments_status_chk` allows `created | authorized | captured | failed |
refunded`. `_record_payment_if_any` passes Razorpay's status through. Today they
match exactly. If Razorpay adds one, the insert violates the CHECK and — because
payment recording is best-effort — the row is silently dropped rather than
failing the webhook. Correct trade (evidence must not break access) but it should
log loudly enough to notice.

### BILL-8 · `captured_at` uses the payment's `created_at`
The Razorpay payment entity carries no separate capture timestamp in the webhook
payload. Off by the authorization-to-capture interval, which is small but not
zero.

---

## Deferred by explicit decision — not debt

These are **not** oversights. Recorded so nobody "discovers" them later.

| Item | Decided |
|---|---|
| Invoices surface | Out of Step 4/5 scope |
| Billing portal (payment method, history) | Out of scope; Razorpay has no hosted portal (`supports_customer_portal=False`) — we would build it |
| Dunning scheduler | Distinct from BILL-2; that is the sweep, this is the customer comms |
| Refunds | Out of scope. Policy is published in `/refunds`; execution is manual |
| Annual plans | `YEARLY_BILLING_ENABLED = false`. Needs a priced decision AND a backend period |
| International payments | Razorpay settles INR. `/pricing` routes non-INR to sales |
| Stripe / second provider | Explicitly not wanted. The port exists so this stays an addition, not an audit |
| Plan change self-serve (BILL-13) | Refused cleanly today; needs `subscription.update` and BILL-B1 |

### BILL-13 · Plan change between paid tiers — refused, not implemented
**Found and fixed to fail correctly:** 5 Aug 2026

An active Plus customer starting checkout for Pro raised `IllegalTransitionError`
out of the service — an **unhandled 500** on a button both the pricing page and
Settings ▸ Billing show them. `active -> pending_activation` is deliberately not
a legal edge: changing plan is `subscription.update` at the gateway, not a second
checkout, and it schedules at cycle end.

Now refused with a 409 and a route the customer can take. The real
implementation needs BILL-B1.

---

## Non-issues, verified during this audit

Recorded so the next audit does not re-open them.

- **Architecture boundaries hold.** 27 invariant tests pass, including: the
  entitlement layer never imports billing; the domain names no gateway; the SDK
  appears only inside `providers/razorpay/`; no HTTP in the domain. The route
  layer was caught naming gateway callback fields during Step 4 and corrected.
- **The domain never sees Razorpay vocabulary.** `mapping.py` is the only
  translation point and `to_billing_state` refuses an unknown status rather than
  guessing.
- **`Money` is minor-units-only** and rejects floats, bools, negatives and
  cross-currency arithmetic.
- **`plan_ruleset` is never written by billing** — asserted by test. Founding
  organizations cannot be demoted by a webhook or sold a plan.
- **Idempotency is a database constraint**, not application memory, and a
  recorded-but-unfinished event is reprocessed rather than skipped.
- **`billing_payments` upsert target is real**: `unique (provider,
  provider_payment_id)` exists in migration 0024.
- **Credentials are read from the environment only**, and `.env` / `.env.local`
  are now exported to `os.environ` so the file and the process agree
  (fixed 5 Aug — see `config._export_env_files_to_environ`).
