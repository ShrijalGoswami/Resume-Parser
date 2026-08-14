# HireLens — Billing & Subscription Architecture

**Phase 4 · 1 Aug 2026 · Status updated 5 Aug 2026**
**Status:** **Largely built.** This was "Proposed. No billing code exists" until
Step 4 shipped the domain, adapter, repository, service and routes. What is
*not* built is listed in §16 and, item by item, in
[`BILLING_TODO.md`](./BILLING_TODO.md).

**No payment has ever been processed**, and the Razorpay Subscriptions API is
currently unavailable to this account — see [`HANDOFF.md`](./HANDOFF.md) §5A.

**Supersedes:** the Stripe-first draft of the same date, withdrawn before any
implementation. Razorpay is now the only provider for V1.

Companion documents: [`MONETIZATION_ARCHITECTURE.md`](./MONETIZATION_ARCHITECTURE.md)
(what plans include and how they are enforced) · [`HANDOFF.md`](./HANDOFF.md) §12
(current state) · [`RELEASE_CANDIDATE_CHECKLIST.md`](./RELEASE_CANDIDATE_CHECKLIST.md)
(the gate this must pass) · `frontend/lib/pricing.ts` (the prices).

> **Verify before building.** Razorpay's mandate ceilings, supported recurring
> methods and subscription semantics are set by RBI/NPCI policy and change
> without notice. Every specific figure below is marked ⚠ and must be checked
> against current Razorpay documentation at implementation time. The
> *architecture* does not depend on any of them; the *parameters* do.

---

## 0. Scope

**In scope:** recurring INR subscriptions for Plus and Pro through Razorpay.
Mandate authorization, payment verification, webhooks, subscription lifecycle,
invoices, dunning, cancellation, reconciliation, GST.

**Out of scope, deliberately:**

| Not designed here | Why |
|---|---|
| Any non-Razorpay provider | V1 is India-only. Extension points are documented in §16; **none are implemented.** |
| International / USD billing | Deferred to a later phase. See §12 — it has a consequence that needs a decision now. |
| Credit packs / one-time top-ups | A one-off purchase credits the metered counter directly, which is a different accounting path from a subscription. Deserves its own design. |
| Seat-based billing | Changes what a "plan" means, and interacts with the member limit already enforced. |
| Enterprise contracts | Quoted, invoiced offline, applied with `scripts/set_org_plan.py`. Enterprise never touches checkout. |

---

## 1. Decisions of record

### 1.1 Razorpay is the only provider in V1

Decided 1 Aug 2026. The V1 market is India. Every implementation decision
optimizes for Razorpay; no foreign provider is implemented, stubbed, or
partially wired.

This is the right call for the market. India's recurring rules — e-mandate
registration, Additional Factor Authentication, a pre-debit notification before
each charge — are native to Razorpay, and **UPI Autopay**, which a large share
of Indian consumers expect to pay with, is supported for recurring collection in
a way foreign processors do not match.

### 1.2 Adapters, not business logic

The requirement that shapes this whole document: **the billing domain model
knows nothing about Razorpay.**

```
      ┌──────────────────────────────────────────────┐
      │  app/enterprise/   entitlement — UNCHANGED   │
      │  reads subscriptions. Never imports billing. │
      └───────────────────▲──────────────────────────┘
                          │ writes plan state
      ┌───────────────────┴──────────────────────────┐
      │  app/billing/domain/    provider-agnostic    │
      │  Subscription · BillingEvent · Money ·       │
      │  lifecycle · reconciliation · state mapping  │
      └───────────────────▲──────────────────────────┘
                          │ BillingProvider port
      ┌───────────────────┴──────────────────────────┐
      │  app/billing/providers/razorpay/   ADAPTER   │
      │  the ONLY module that knows what a           │
      │  razorpay_subscription_id is                 │
      └──────────────────────────────────────────────┘
```

Enforced the way this codebase enforces things — by a test, not by good
intentions (§15): no module outside `providers/razorpay/` may import the
Razorpay SDK or reference a `razorpay_*` identifier.

The point is not portability for its own sake. It is that **billing rules should
be reviewable without knowing a gateway's API**, and a gateway swap should be a
new adapter rather than an audit of every rule.

### 1.3 The provider is not the source of truth

**`subscriptions` in Postgres is authoritative for entitlement. Razorpay is
upstream of it, never a substitute for it.**

The entitlement layer already reads `subscriptions.plan`, `status` and
`plan_ruleset` on nearly every authenticated request. It keeps doing exactly
that. Nothing in the request path may call Razorpay — an API dependency on the
hot path would turn a gateway incident into an outage for customers who have
already paid.

### 1.4 Webhooks are notifications, not data

**Record the event, then re-fetch the subscription from the Razorpay API and
write what the API says.** Never write from the event payload.

This disposes of three problems at once: out-of-order delivery (Razorpay does
not guarantee ordering), redelivery (normal, not exceptional), and stale
snapshots (the payload is the object at emit time). One extra API call per event
buys correctness that ordering logic would otherwise have to earn.

---

## 2. Principles inherited from Phases 1–3

Each one constrains a decision below.

1. **Entitlements never depend on pricing.** `catalog.py` contains no money and
   must not gain any. Billing writes plan *state*; the catalog decides what a
   plan *includes*.
2. **Founding organizations are never billed.** All 68 pre-monetization orgs
   hold every capability with no limits, permanently. §11.
3. **`past_due` keeps working.** Dunning is a billing conversation, not a reason
   to lock a hiring team out mid-week.
4. **No client write path to `subscriptions`.** Migration 0016 revoked
   insert/update/delete from `authenticated` and `anon`.
5. **`ENTITLEMENT_ENFORCEMENT=off` stays the single rollback lever.** Billing
   must not add a second kill switch that has to be found during an incident.

---

## 3. The domain model

Provider-agnostic by construction. These types contain no gateway vocabulary.

```python
# app/billing/domain/models.py

class BillingProviderId(str, Enum):
    razorpay = "razorpay"          # the only member in V1

@dataclass(frozen=True)
class Money:
    """Minor units, always. ₹999 is Money(99900, 'INR').

    Never a float, and never a major-unit int. Razorpay speaks paise, and a
    rupee/paise mix-up is a 100× billing error in whichever direction hurts
    most. The conversion happens once, in the adapter, at the boundary.
    """
    minor_units: int
    currency: str

class SubscriptionState(str, Enum):
    """Our vocabulary — the five values `subscriptions.status` already pins."""
    incomplete = "incomplete"
    trialing   = "trialing"
    active     = "active"
    past_due   = "past_due"
    canceled   = "canceled"

@dataclass(frozen=True)
class ProviderSubscription:
    """What every provider must be able to tell us. Nothing more."""
    provider: BillingProviderId
    provider_subscription_id: str
    provider_customer_id: str
    plan: Plan                      # our catalog plan, already mapped
    state: SubscriptionState        # our vocabulary, already mapped
    current_period_start: datetime | None
    current_period_end: datetime | None
    cancel_at_period_end: bool
    raw: dict                       # kept for the audit trail, never read for logic
```

`raw` is deliberately opaque to the domain. It exists so an investigation can
see exactly what the gateway said, and reading it anywhere outside the adapter
is the exact coupling this design prevents.

### 3.1 The port

```python
# app/billing/domain/provider.py

class BillingProvider(Protocol):
    id: BillingProviderId

    def ensure_customer(self, org: Organization, email: str) -> str: ...
    def start_subscription(self, org_id: UUID, plan: Plan,
                           currency: str) -> CheckoutHandoff: ...
    def fetch_subscription(self, provider_subscription_id: str) -> ProviderSubscription: ...
    def cancel_subscription(self, provider_subscription_id: str,
                            at_period_end: bool = True) -> ProviderSubscription: ...
    def verify_webhook(self, raw_body: bytes, headers: Mapping[str, str]) -> WebhookEnvelope: ...
    def verify_client_callback(self, payload: Mapping[str, str]) -> bool: ...
    def list_invoices(self, provider_customer_id: str, limit: int) -> list[Invoice]: ...
```

Seven operations. `verify_client_callback` exists because Razorpay's checkout
returns a signed payload to the browser (§7.2) — a shape a redirect-based
gateway has no equivalent for. It is on the port rather than in the route so
that a future provider can implement it as a no-op returning `True`, instead of
the route growing a branch per provider.

`CheckoutHandoff` is deliberately vague about mechanism — Razorpay hands back a
subscription id for a JS modal, another provider might hand back a redirect URL:

```python
@dataclass(frozen=True)
class CheckoutHandoff:
    provider: BillingProviderId
    kind: Literal["modal", "redirect"]
    subscription_id: str | None      # modal providers
    redirect_url: str | None         # redirect providers
    public_key: str | None
```

---

## 4. What Razorpay actually does, and how it shapes the design

The five places Razorpay's model differs from a generic subscription API. Each
one is absorbed by the adapter rather than leaking upward.

### 4.1 Subscriptions are finite ⚠

A Razorpay subscription requires a `total_count` — the number of billing cycles.
There is no unbounded subscription.

**Design:** the adapter creates subscriptions with a long horizon (e.g. 120
monthly cycles ≈ 10 years) and treats exhaustion as a renewal event, not an
expiry. The domain never sees `total_count`; a subscription approaching its
final cycle is the adapter's problem, and the reconciler (§7.4) reports any
subscription nearing exhaustion long before a customer would notice.

A customer must never lose access because a counter we chose ran out.

### 4.2 Authorization is a transaction, not a form ⚠

Registering a mandate involves a real authorization — a small or zero-amount
charge that the customer authenticates. The subscription is `created` before
that and only becomes `authenticated`/`active` afterwards.

**Design:** `incomplete` covers the gap. An org sits in `incomplete` from
"clicked upgrade" until the mandate is confirmed, with no paid access. This is
exactly what `incomplete` was reserved for in the migration-0016 vocabulary.

### 4.3 There is no hosted customer portal

Razorpay has no equivalent of a self-serve hosted billing portal.

**Design consequence — a real one:** the Stripe draft assumed the portal was a
link away. It is not. V1 builds a minimal Settings ▸ Billing surface: current
plan, next charge date, invoice list (from the provider's invoice API), cancel,
and update-payment-method as a provider-hosted link where one exists. Anything
beyond that is deferred.

This is the largest scope item created by the change of provider, and it is
product work, not adapter work.

### 4.4 Mid-cycle plan changes are constrained ⚠

Razorpay does not offer Stripe-style proration. Plan changes are scheduled —
either immediately or at cycle end — with limited automatic proration.

**Design:** **upgrades take effect immediately, downgrades at period end.**

- *Upgrade (Plus → Pro):* the customer wants it now, and is asking to pay us
  more. Take effect immediately; whether the remaining Plus period is credited
  is a commercial decision (§18).
- *Downgrade (Pro → Plus):* schedule at period end. They paid for Pro until
  then, and taking it away early would be taking something already bought.

Both rules live in the domain. The adapter is told *when*, and translates.

### 4.5 Tax is ours to compute

Razorpay has no Stripe-Tax equivalent. **GST is our responsibility.** §10.

---

## 5. Data model

### 5.1 Provider-neutral columns

Migration 0016 landed `stripe_customer_id` and `stripe_subscription_id`
deliberately unused. They are now doubly wrong — wrong provider, and wrong
principle. Renamed before a single value is ever written:

```sql
-- 0022_billing_provider_neutral.sql
alter table public.subscriptions
  rename column stripe_customer_id     to billing_customer_id;
alter table public.subscriptions
  rename column stripe_subscription_id to billing_subscription_id;

alter table public.subscriptions
  add column if not exists billing_provider text
      check (billing_provider in ('razorpay'));
```

The CHECK lists only `razorpay` on purpose. A second provider is a migration
that widens it — a deliberate, reviewed act, not an accident of an enum that was
permissive before anyone decided.

Free and founding orgs keep `billing_provider = null`. Null means "not billed",
which is honest and is the common case.

### 5.2 `billing_events` — idempotency is the whole point

```sql
-- 0023_billing_events.sql
create table public.billing_events (
    provider        text        not null,
    event_id        text        not null,
    event_type      text        not null,
    organization_id uuid        references public.organizations(id) on delete set null,
    payload         jsonb       not null,
    received_at     timestamptz not null default now(),
    processed_at    timestamptz,
    status          text        not null default 'received'
                    check (status in ('received','processed','ignored','failed')),
    error           text,
    attempts        int         not null default 0,
    primary key (provider, event_id)
);
```

The composite primary key **is** the idempotency mechanism: insert first, and a
unique violation means "already seen — return 200 and stop". Nothing is
deduplicated in application memory, because memory does not survive a restart
mid-delivery.

`provider` is in the key so a future provider's event ids cannot collide with
Razorpay's.

`organization_id` is nullable deliberately: an event may arrive for a customer
we cannot resolve, and dropping it to satisfy a foreign key would be worse than
storing it unattributed for a human to read.

Retained indefinitely. It is the audit trail behind every charge, and storage is
cheaper than a billing dispute with no record.

### 5.3 What billing may write

| Column | Billing writes | Note |
|---|---|---|
| `plan`, `status` | ✅ | Mapped in the adapter, stored in our vocabulary |
| `current_period_start` / `_end` | ✅ | |
| `cancel_at_period_end`, `trial_ends_at` | ✅ | |
| `billing_provider` / `billing_customer_id` / `billing_subscription_id` | ✅ | |
| `plan_version` | ✅ | Bumped on every plan change; the client already compares it against a 402 to spot a stale context |
| **`plan_ruleset`** | ❌ **never** | Grandfathering is not a billing fact. §11 |
| **`limit_overrides`** | ❌ never | Negotiated deals are set by a human |
| **`limits`** | ❌ never | Legacy column; the catalog decides limits |

`organizations.plan` is a denormalized read-model mirror, written in the same
transaction, as it already is.

---

## 6. Plan mapping

```python
# app/billing/providers/razorpay/plans.py  — adapter-local, by design
RAZORPAY_PLANS: dict[str, PlanBinding] = {
    "plan_XXXXXXXXplus": PlanBinding(plan=Plan.plus, money=Money(99900, "INR")),
    "plan_XXXXXXXXpro":  PlanBinding(plan=Plan.pro,  money=Money(249900, "INR")),
}
```

Gateway plan ids live **inside the adapter**. The domain deals in `Plan.plus`,
never in `plan_XXXX`.

An unrecognised plan id is a **hard error** — logged, alerted, not processed.
Never a silent fallback to Free. An unknown plan means someone created one in
the Razorpay dashboard that the code does not know about, and quietly
downgrading a paying customer is the worst available response.

Ids differ per environment and come from config, not literals.

**Amounts are duplicated here on purpose,** and it is worth being explicit about
why: `lib/pricing.ts` is what the customer is *shown*, the Razorpay plan is what
they are *charged*, and they are two systems that can drift. A startup check
(§15) asserts every `RAZORPAY_PLANS` amount equals the corresponding published
price, and fails the boot if not. Silent disagreement between the page and the
charge is the single worst billing defect available to us.

---

## 7. Flows

### 7.1 Starting a subscription

```
UpgradeDialog "Upgrade to Pro"
  → POST /api/v1/billing/subscriptions   { plan }
      ├── require_permission(ORG_MANAGE)        ← only an owner may buy
      ├── reject if plan_ruleset = 'founding'   ← §11
      ├── reject if plan in (free, enterprise)
      ├── reject if billing country is not India ← §12
      ├── provider.ensure_customer(...)  → store billing_customer_id
      └── provider.start_subscription(...) → CheckoutHandoff
  → client opens Razorpay Checkout with the subscription id
  → customer authenticates the mandate (UPI Autopay / card e-mandate / netbanking)
  → Razorpay returns a signed payload to the browser        → §7.2
  → Razorpay fires subscription.activated                   → §7.3  ← the grant
```

### 7.2 Client callback verification — necessary, and not sufficient

Razorpay's checkout hands the browser `razorpay_payment_id`,
`razorpay_subscription_id` and `razorpay_signature`. The signature is an
HMAC-SHA256 the server must verify with the key secret. ⚠

**It is verified, and it grants nothing.**

The callback confirms the customer completed the flow, so the UI can say
"you're all set" instead of "we're waiting". The **plan is granted only by the
webhook** (§7.3).

Treating the client callback as authorization is the most common billing bug in
this shape, and it fails in both directions: a customer who closes the tab at
the wrong moment is charged and not granted, and a callback is the one part of
the flow that runs on hardware we do not control.

Verification failure is a **security event**, logged and alerted — it means
someone forged a payload, not that a customer had a bad network.

### 7.3 Webhooks

```
POST /api/v1/billing/webhook          ← unauthenticated by design; signed instead
  1. verify X-Razorpay-Signature over the RAW body       ⚠ §13
  2. INSERT into billing_events → unique violation? 200, stop
  3. return 200 immediately; process asynchronously
  4. provider.fetch_subscription(...)                     (§1.4)
  5. resolve organization_id from billing_customer_id
  6. adapter maps → ProviderSubscription (our Plan, our SubscriptionState)
  7. write subscriptions + organizations.plan in ONE transaction, bump plan_version
  8. mark the event processed; write audit_logs with the event id
```

Step 3 matters: a slow handler becomes a retry storm. Step 2 absorbs the storm;
acknowledging fast avoids it.

**Events consumed** ⚠ (names to be confirmed against current documentation):

| Event | Effect |
|---|---|
| `subscription.activated` | Grant the plan. The moment access begins |
| `subscription.charged` | Confirm the new period; clear any past-due state |
| `subscription.pending` | Payment failed — enter dunning (§9) |
| `subscription.halted` | Retries exhausted — still `past_due`, still working (§9) |
| `subscription.cancelled` | Resolve to Free at period end (§8.2). **Terminal at Razorpay** — resubscribing creates a NEW subscription; see `supports_gateway_reactivation` |
| `subscription.completed` | Cycle count exhausted — renew (§4.1), never expire |
| `subscription.updated` | Re-fetch and re-derive |
| `payment.failed` | Recorded; dunning is driven by subscription state, not this |

Everything else is stored with `status='ignored'` rather than dropped, so "we
never received it" and "we received it and did nothing" stay distinguishable
during an investigation.

### 7.4 Reconciliation — because webhooks will be missed

Scheduled daily, and runnable on demand:

1. For every org with a `billing_subscription_id`, fetch from the provider.
2. Compare plan, state and period against our row.
3. Correct any drift and **log it loudly** — drift is a defect, not routine, and
   a reconciler that repairs silently hides the bug that caused it.
4. Report subscriptions nearing cycle exhaustion (§4.1).
5. Report orgs whose subscription has vanished from the provider.

Webhook delivery is not a guarantee. A design that assumes it is will be correct
until the first outage and wrong afterwards, with no way to notice.

---

## 8. Subscription state

### 8.1 Mapping ⚠

Razorpay's vocabulary is richer than ours; the adapter collapses it into the
five values `subscriptions.status` already pins.

| Razorpay | HireLens | Entitlement effect |
|---|---|---|
| `created` | `incomplete` | No paid access — mandate not yet authorized |
| `authenticated` | `incomplete` | Mandate registered, first charge not settled |
| `active` | `active` | Full plan access |
| `pending` | `past_due` | **Full access retained** (§2.3) |
| `halted` | `past_due` | **Full access retained** — retries exhausted, still a conversation |
| `paused` | **`active`** | **CORRECTED 1 Aug 2026.** Access retained, NO dunning. `past_due` opens a grace window and the sweep would then suspend a customer who merely paused, with no failed payment in their history. Surfaced as an informational integrity event instead |
| `cancelled` | `canceled` | Resolves to Free |
| `expired` | `canceled` | |
| `completed` | *(renew)* | Cycle count exhausted — never an expiry (§4.1) |

Where a mapping is ambiguous it resolves **in the customer's favour**. Being
generous for a few days costs a fraction of wrongly locking out a paying team.

### 8.2 Cancellation keeps what was paid for

Cancelling sets `cancel_at_period_end = true` and changes nothing else. The plan
runs to the end of the paid period.

**On downgrade, data is never deleted.** An org dropping from Pro to Free keeps
every candidate, decision and note; it loses the ability to add more. Locks
appear, the record stays readable and exportable. Anything else would make a
plan change destructive, which no customer expects.

---

## 9. Dunning and the grace period

A failed charge starts a **7-day grace period** (proposed; §18), during which
the org keeps full access and sees an honest badge — `PlanBadge` already renders
"Payment due" for `past_due`.

Razorpay's own retry schedule and its mandatory pre-debit notifications run
underneath. At the end of grace the subscription resolves to Free by the
ordinary path, and the customer keeps all their data and simply loses headroom.

No feature is switched off silently mid-week. Badge, then email, then the
upgrade surface — in that order of escalation.

---

## 10. GST is ours to compute

No gateway-side tax engine exists here, so this is a decision, not a default.

**The current pricing page says "Prices exclude applicable taxes" — which, with
18% GST, makes ₹999 actually ₹1,179 at checkout.** A customer who reads ₹999 on
the page and is charged ₹1,179 will feel misled even though the page was
literally accurate.

Two coherent options, and one of them has to be chosen before launch:

| | Displayed | Charged | Trade-off |
|---|---|---|---|
| **A. Tax-inclusive** (recommended) | ₹999 | ₹999 (₹846.61 + ₹152.39 GST) | Page and charge agree. Revenue per customer drops ~15% |
| **B. Tax-exclusive** | ₹999 + GST | ₹1,179 | Revenue preserved; the page must show the real total *before* checkout, not after |

Recommended: **A**, for the reason the rest of this design keeps returning to —
the number the customer sees should be the number they pay. If B is chosen, the
pricing page must display the inclusive total prominently, not in a footnote.

Either way the Razorpay plan amount and the published price must agree, which
the §6 boot check enforces. A **GSTIN field** belongs on checkout for business
customers claiming input credit.

---

## 11. Founding organizations must never be charged

All 68 pre-monetization orgs run `plan_ruleset = 'founding'`: every capability,
no limits, permanently. Three guards, because one is not enough for a promise of
this kind:

1. **No checkout.** `/billing/subscriptions` refuses when the ruleset is
   `founding`, and says why.
2. **No UI.** The pricing page and upgrade dialog show a founding org no locks,
   so there is nothing to upsell.
3. **Webhooks may not write `plan_ruleset`** (§5.3). Even a mistaken
   subscription cannot silently convert a founding org onto the v1 matrix.

Moving an org off `founding` stays a deliberate, audited, human act through
`scripts/set_org_plan.py`.

---

## 12. International customers — and a live inconsistency to resolve

Razorpay-only means **HireLens can charge INR and nothing else in V1.**

The pricing page does not currently know that. `lib/pricing.ts` marks USD
`confirmed: true` with real prices ($19 / $49), the currency selector offers it,
and `PlanCta` renders a working "Upgrade to Pro" for a signed-in visitor —
**a CTA that cannot complete for a customer outside India.** That inconsistency
was created by this decision and has to be closed before billing ships.

Three options:

| | Behaviour | Assessment |
|---|---|---|
| **A. Keep USD displayed; route to sales** (recommended) | USD prices stay visible; a USD/non-India visitor gets "Talk to us" instead of self-serve | Honest, keeps the market signal and the demand data, needs no pricing change |
| **B. Hide USD until international billing ships** | `confirmed: false` — the selector disappears | Simplest and already supported by the config, but discards a decided price and tells international visitors nothing |
| **C. Charge INR to everyone** | One price list | Rejected. Quoting a customer in a currency they did not choose is the FX-pricing mistake this project has already refused once |

Recommended: **A**. It needs one change in `PlanCta` — treat "billing country not
India" the way Enterprise is already treated, as a conversation rather than a
checkout — and the pricing page keeps saying something true.

**The checkout route refuses non-India billing regardless of what the UI does**
(§7.1). The UI decides experience; the server decides what may happen.

### Future work — adding a second provider

Explicitly **not built in this phase.** The extension points that exist so it
can be an addition rather than a rewrite:

1. **`BillingProviderId`** — add a member; the domain is otherwise unchanged.
2. **`billing_provider` CHECK constraint** — one migration widens it. Deliberate
   by design (§5.1).
3. **`billing_events` primary key** already includes `provider`, so event ids
   cannot collide.
4. **Provider-neutral columns** — no gateway-specific identifier ever sits in a
   gateway-named column.
5. **`BillingProvider` port** (§3.1) — implement seven methods.
6. **`CheckoutHandoff.kind`** already models both modal and redirect providers.
7. **Routing** — one function, `provider_for(currency | billing_country)`, which
   in V1 returns Razorpay unconditionally.

What will **not** transfer, and should be expected: the state mapping (§8.1),
the mandate model (§4.2), the plan-change semantics (§4.4) and the webhook event
names are all provider-specific. Each new provider brings its own §8.1 table.
That is the real cost of a second provider, named now rather than discovered
during the migration.

---

## 13. Security

- **Webhook signature verification is mandatory**, computed over the **raw**
  request body. Any middleware that parses and re-encodes JSON before the
  handler breaks the signature — a classic, quiet failure. The route must read
  bytes.
- The endpoint is unauthenticated **by design**; the signature is the
  authentication. Rate-limited, and it must never reveal whether a customer id
  exists.
- **Client callback signatures are verified server-side** (§7.2). A failure is a
  security event.
- **All billing writes use the service role.** The client write path stays
  revoked, as migration 0016 left it.
- Key id, key secret and webhook secret are environment configuration and differ
  per environment. **A test-mode webhook must never grant a plan in
  production** — the handler checks the event's mode against its own environment
  and refuses on mismatch.
- Every plan change is written to `audit_logs` with its originating event id, so
  "why does this org have Pro?" always has an answer.

---

## 14. Failure modes

The question this answers: **what happens to a paying customer when billing
breaks?**

| Failure | Behaviour | Rationale |
|---|---|---|
| Razorpay API down | Product unaffected. New subscriptions unavailable | Entitlement reads Postgres, never the gateway (§1.3) |
| Webhook delayed | Grant is late; reconciler catches it | May wait, never loses access |
| Webhook handler throws | Event `failed` with its error; retried; alerted | One transaction — nothing half-applied |
| Unknown plan id | Hard error, no write, alert | Never silently downgrade a paying customer (§6) |
| Duplicate delivery | Absorbed by the primary key | §5.2 |
| DB write fails after a successful charge | Retried until it succeeds; reconciler is the backstop | The customer paid; the grant is owed |
| Client callback signature invalid | Refuse, alert. No plan change | Forgery, not a network blip |
| Gateway says cancelled, we say active | Reconciler corrects **down**, loudly, after a delay | Correct — but never instantly; an ordering artefact must not revoke access |
| Mandate revoked by the customer's bank | `past_due` → grace → Free | Same path as any failed payment |
| Cycle count exhausted | Renewed, never expired | §4.1 |
| Everything is on fire | `ENTITLEMENT_ENFORCEMENT=off` | One lever, no deploy (§2.5) |

The pattern throughout: **fail toward the customer keeping access.** An extra day
of Pro for someone who cancelled costs almost nothing. An hour of wrongly
revoked access to a team mid-hire costs the account.

---

## 15. Testing strategy

Same discipline as Phases 1–3: tests encode the rules, so breaking a rule fails
a build rather than a customer.

**Architectural guards** — the ones that keep §1.2 true:
- No module outside `app/billing/providers/razorpay/` imports the Razorpay SDK
- No module outside that package contains the string `razorpay_`
- `app/enterprise/**` imports nothing from `app/billing/**`
- No request-path module calls any gateway
- `catalog.py` still contains no currency or price token

**Unit** — against the domain, with a fake provider:
- Every row of the §8.1 state map, including ambiguity resolving toward access
- Idempotency: the same event twice produces one write
- Out-of-order: an older event after a newer one does not regress state
- Unknown plan id → hard error, no write
- Founding guard: checkout refused; no path writes `plan_ruleset`
- Upgrade immediate, downgrade at period end (§4.4)
- `Money` never crosses a boundary in major units

**Boot check** — Razorpay plan amounts equal the published prices (§6). A
mismatch fails startup, not a customer's card.

**Integration** — Razorpay test mode with fixture events:
- Full flow: create → authenticate → `subscription.activated` → plan granted
- Charge failure → `pending`/`halted` → **access retained**
- Cancellation → access until period end → Free after
- Signature rejection: unsigned, wrong secret, wrong mode

**Manual, before launch** — a real mandate, a real charge, a real cancellation,
in production mode, with UPI Autopay and with a card. The RC checklist gains a
§14 for billing; it does not exist yet and must before anything ships.

---

## 16. Build order

Each step is independently reviewable and leaves the product working.

| # | Step | Ships | Status |
|---|---|---|---|
| 1 | Migrations 0022–0023; provider-neutral columns; `billing_events` | Schema only, nothing reads it | ✅ applied |
| 2 | `app/billing/domain/` — models, port, state machine, **fake provider** | Fully unit-testable with no gateway | ✅ |
| 3 | `providers/razorpay/` — client, plan bindings, mapping, signatures | Adapter, no routes | ✅ |
| 4 | Webhook endpoint: verify, record, **ignore everything** | Observability first — see real events before acting on them | ✅ built, never fed a real event |
| 5 | Event processing + audit + plan writes | Plans can change from the gateway | ✅ offline-tested only |
| 6 | Subscription-start route + founding guard + India guard | Customers can buy | ✅ route exists; **gateway unavailable** |
| 7 | Wire `UpgradeDialog`'s `onCheckout`; resolve §12 | The CTA becomes real — one handler, as designed | ⛔ not started — deliberately not built against an API that has never answered |
| 8 | Reconciliation job + alerting | Drift becomes visible | ⛔ BILL-6 |

Steps 4–6 shipped in a different order than planned (checkout before a
record-and-ignore observation window), because the gateway has never delivered
an event to observe.

Two things not in this table have since been resolved: **migration 0027**, which
makes the eight-value state survive a database round trip, is applied; and the
**grace sweep** is built (`app/billing/grace.py`). The sweep still has **no
trigger**, so no organization is suspended — see BILL-T1 in
[`BILLING_TODO.md`](./BILLING_TODO.md).
| 9 | Settings ▸ Billing: invoices, cancel, payment method (§4.3) | Self-serve, since there is no hosted portal |
| 10 | Dunning surfaces + grace period | Failure states become humane |
| 11 | RC checklist §14; full manual pass | Ready to charge |

Step 2 before step 3, and step 4 before step 5, are both deliberate. The domain
should be complete and tested against a fake provider before any gateway code
exists — that is what proves the abstraction is real rather than decorative.

---

## 17. Open questions

1. **GST: inclusive or exclusive?** (§10.) Blocks the Razorpay plan amounts.
2. **International CTA** — option A, B or C? (§12.) Blocks step 7.
3. **Grace period: 7 days?** Proposed in the handoff, not decided.
4. **Upgrade proration** — is unused Plus time credited on an immediate upgrade
   to Pro, or forfeited? Commercial, not technical.
5. **Yearly billing** — `lib/pricing.ts` carries the schema with
   `YEARLY_BILLING_ENABLED = false` and no prices. Needs annual figures, a
   discount decision, and an annual period concept `subscriptions` lacks.
6. **Refunds** — self-serve or by request? No design either way.
7. **Trials** — `trial_ends_at` exists, unused. Free already functions as the
   trial; a mandate-required trial is a different product decision.
8. **Entity and compliance** — GST registration and Razorpay onboarding have
   lead time and are prerequisites, not engineering work.

---

## 18. What is deliberately NOT being built

- **No second provider**, in any form. Extension points are documented (§12);
  none are implemented, stubbed, or partially wired.
- **No plan logic in the payment layer.** Billing writes plan state; the catalog
  decides what a plan includes.
- **No second enforcement path.** Billing never gates a request. The entitlement
  layer is the only gate, and it reads Postgres.
- **No gateway call in the request path.** Ever.
- **No custom invoice rendering.** The provider's invoices are fetched and
  listed; they are not re-created.
