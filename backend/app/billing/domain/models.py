"""
Billing domain models. Provider-agnostic by construction.

Nothing here knows what Razorpay is. The types describe subscriptions, money,
payments and invoices as this product understands them; an adapter translates a
gateway into these and back. That is the whole point of the layering — billing
rules should be reviewable without knowing a gateway's API.

Two vocabularies, deliberately
------------------------------
`BillingState` is what the STATE MACHINE reasons about — it distinguishes a
charge that is still being retried from one whose retries are exhausted, and a
subscription suspended for non-payment from one the customer cancelled.

`BillingStatus` is what gets PERSISTED — the five values
`subscriptions.status` has been pinned to by a CHECK since migration 0016, and
which the entitlement resolver, the Settings badge and the client all read.

They are not the same, and collapsing them would mean either widening a column
the whole product reads, or throwing away distinctions the machine needs.
`BillingState.to_status()` is the projection between them.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Optional

from app.billing.domain.errors import MoneyError

# ── Providers ───────────────────────────────────────────────────────────────


class BillingProviderId(str, Enum):
    """Payment gateways this product supports.

    One member. V1 is Razorpay-only and a second provider is a deliberate,
    reviewed addition — not an unused enum value waiting around to be picked up
    by accident. `subscriptions.billing_provider` carries the same restriction
    as a CHECK constraint.
    """

    razorpay = "razorpay"


class BillingMode(str, Enum):
    """How an organization's plan is paid for.

    `manual` exists because Enterprise is quoted, contracted and invoiced
    offline. Code that assumes "paid implies a gateway subscription" is wrong
    about Enterprise, and this makes that checkable rather than remembered.
    """

    none = "none"          # free, or grandfathered — no billing relationship
    provider = "provider"  # a gateway subscription drives the plan
    manual = "manual"      # an operator activated it; no gateway object


# ── Money ───────────────────────────────────────────────────────────────────


@dataclass(frozen=True)
class Money:
    """An amount, in MINOR UNITS, always.

    ₹999 is `Money(99900, "INR")`. Paise for INR, cents for USD.

    Never a float, never a major-unit int. This is a permanent project rule and
    it is not stylistic: a rupee/paise mix-up is a 100× billing error in
    whichever direction hurts most — either a customer is charged a hundred
    times the price, or the product is given away for one. Floats add their own
    failure, where 0.1 + 0.2 is not 0.3 and an invoice stops summing.

    Conversion to a human-readable amount happens at the presentation edge and
    nowhere else.
    """

    minor_units: int
    currency: str

    def __post_init__(self) -> None:
        if isinstance(self.minor_units, bool) or not isinstance(self.minor_units, int):
            raise MoneyError(
                f"minor_units must be an int, got {type(self.minor_units).__name__}. "
                "Money is never a float or a Decimal."
            )
        if self.minor_units < 0:
            raise MoneyError(f"minor_units must not be negative: {self.minor_units}")
        if not self.currency or len(self.currency) != 3 or not self.currency.isupper():
            raise MoneyError(f"currency must be a 3-letter uppercase code, got {self.currency!r}")

    def _same_currency(self, other: "Money") -> None:
        if self.currency != other.currency:
            # Adding INR to USD is not an arithmetic problem, it is a category
            # error — the two are separate market prices, never convertible here.
            raise MoneyError(f"cannot combine {self.currency} with {other.currency}")

    def __add__(self, other: "Money") -> "Money":
        self._same_currency(other)
        return Money(self.minor_units + other.minor_units, self.currency)

    def __sub__(self, other: "Money") -> "Money":
        self._same_currency(other)
        return Money(self.minor_units - other.minor_units, self.currency)

    @property
    def is_zero(self) -> bool:
        return self.minor_units == 0

    def __str__(self) -> str:
        return f"{self.currency} {self.minor_units} (minor units)"


# ── Subscription lifecycle ──────────────────────────────────────────────────


class BillingStatus(str, Enum):
    """What is PERSISTED to `subscriptions.status`.

    Closed set, pinned by `subscriptions_status_chk` since migration 0016 and
    read by the entitlement resolver, the Settings UI and the client. The
    domain maps into it; it never widens it.
    """

    incomplete = "incomplete"
    trialing = "trialing"
    active = "active"
    past_due = "past_due"
    canceled = "canceled"


class BillingState(str, Enum):
    """What the STATE MACHINE reasons about.

    Richer than `BillingStatus` in exactly two places, and both distinctions
    earn their keep:

    * `payment_failed` vs `grace` — a charge whose gateway retries are still
      running, versus one whose retries are exhausted and which is now counting
      down to suspension. Both retain full access; they need different
      messages, and only the second has a deadline.
    * `suspended` vs `cancelled` — access lost for non-payment, versus a
      customer who chose to leave. Identical entitlement, completely different
      conversation.
    """

    free = "free"                            # no paid subscription
    pending_activation = "pending_activation"  # mandate not yet authorized
    trialing = "trialing"
    active = "active"
    payment_failed = "payment_failed"        # charge failed, gateway retrying
    grace = "grace"                          # retries exhausted, countdown running
    suspended = "suspended"                  # grace elapsed, access withdrawn
    cancelled = "cancelled"                  # customer ended it

    def to_status(self) -> BillingStatus:
        """Project onto the persisted vocabulary.

        `payment_failed` and `grace` both persist as `past_due` because the
        entitlement effect is identical — **full access is retained**. Dunning
        is a billing conversation, not a reason to lock a hiring team out
        mid-week.

        `suspended` and `cancelled` both persist as `canceled` because both
        resolve to Free. They stay distinguishable in the row by
        `payment_failed_at` / `grace_period_ends_at`, which a cancellation
        never sets.
        """
        return _STATE_TO_STATUS[self]

    @property
    def grants_paid_access(self) -> bool:
        """Whether the organization may use what its plan includes.

        `payment_failed` and `grace` are TRUE, and that is the single most
        important line in this file.
        """
        return self in _PAID_ACCESS_STATES

    @property
    def is_terminal(self) -> bool:
        """No paid subscription is running. Reachable again by resubscribing."""
        return self in {BillingState.free, BillingState.suspended, BillingState.cancelled}


_STATE_TO_STATUS: dict[BillingState, BillingStatus] = {
    BillingState.free: BillingStatus.canceled,
    BillingState.pending_activation: BillingStatus.incomplete,
    BillingState.trialing: BillingStatus.trialing,
    BillingState.active: BillingStatus.active,
    BillingState.payment_failed: BillingStatus.past_due,
    BillingState.grace: BillingStatus.past_due,
    BillingState.suspended: BillingStatus.canceled,
    BillingState.cancelled: BillingStatus.canceled,
}

_PAID_ACCESS_STATES = frozenset({
    BillingState.trialing,
    BillingState.active,
    BillingState.payment_failed,
    BillingState.grace,
})


# ── Entities ────────────────────────────────────────────────────────────────


@dataclass(frozen=True)
class Subscription:
    """An organization's commercial state, as the domain sees it.

    Deliberately NOT the database row. The row carries legacy columns and the
    grandfathering marker; this carries what the billing rules need. Mapping
    between them is the repository's job, in Step 3.

    `plan_ruleset` is read but never written by billing. Grandfathering is a
    promise about what an account could always do — not a billing fact — and
    migration 0022 keeps that column out of billing's reach for the same reason.
    """

    organization_id: str
    plan: str
    state: BillingState
    plan_ruleset: str = "v1"
    billing_mode: BillingMode = BillingMode.none
    provider: Optional[BillingProviderId] = None
    provider_customer_id: Optional[str] = None
    provider_subscription_id: Optional[str] = None
    current_period_start: Optional[datetime] = None
    current_period_end: Optional[datetime] = None
    cancel_at_period_end: bool = False
    trial_ends_at: Optional[datetime] = None
    payment_failed_at: Optional[datetime] = None
    grace_period_ends_at: Optional[datetime] = None
    plan_version: int = 1
    #: A plan change queued at the gateway for the end of the current period.
    #:
    #: A PROMISE, NEVER AN ENTITLEMENT. `plan` stays authoritative for the whole
    #: time this is set — a customer who scheduled Pro has not bought Pro yet,
    #: and nothing in `app/enterprise/**` may read these. They exist so the
    #: interface can say "Pro starts on the 11th" without asking the gateway on
    #: a page load.
    scheduled_plan: Optional[str] = None
    scheduled_plan_effective_at: Optional[datetime] = None

    @property
    def has_scheduled_change(self) -> bool:
        return bool(self.scheduled_plan)

    @property
    def is_founding(self) -> bool:
        """Grandfathered before monetization: every capability, no limits."""
        return self.plan_ruleset == "founding"

    @property
    def grants_paid_access(self) -> bool:
        return self.state.grants_paid_access

    @property
    def is_gateway_billed(self) -> bool:
        return self.billing_mode is BillingMode.provider

    def with_state(self, state: BillingState, **changes: Any) -> "Subscription":
        """A copy in a new state. The domain never mutates in place, so a
        rejected transition cannot leave a half-updated object behind."""
        from dataclasses import replace

        return replace(self, state=state, **changes)


@dataclass(frozen=True)
class Payment:
    """One charge attempt — successful or not. What was CHARGED."""

    organization_id: str
    provider: str
    provider_payment_id: str
    amount: Money
    status: str  # created | authorized | captured | failed | refunded
    method: Optional[str] = None
    provider_subscription_id: Optional[str] = None
    provider_invoice_id: Optional[str] = None
    captured_at: Optional[datetime] = None
    failed_at: Optional[datetime] = None
    failure_reason: Optional[str] = None
    refunded_amount: Optional[Money] = None

    def __post_init__(self) -> None:
        if self.refunded_amount is not None:
            if self.refunded_amount.currency != self.amount.currency:
                raise MoneyError("refund currency must match the payment currency")
            if self.refunded_amount.minor_units > self.amount.minor_units:
                raise MoneyError("refund cannot exceed the payment")


@dataclass(frozen=True)
class Invoice:
    """What the customer was BILLED. Distinct from what was charged.

    GST-INCLUSIVE. The advertised price IS the total: ₹999 on the pricing page
    means ₹999 leaves the customer's account, with tax inside that figure rather
    than added at checkout.

    The split is stored, not derived, and `tax_rate_bp` records the rate applied
    AT ISSUE TIME. A GST change must never retroactively rewrite an old invoice —
    an invoice is a statutory record of a past transaction, and recalculating it
    later is how a filing stops matching its own paperwork.
    """

    organization_id: str
    provider: str  # 'razorpay' | 'manual' (Enterprise, invoiced offline)
    provider_invoice_id: str
    plan: str
    total: Money
    tax: Money
    net: Money
    tax_rate_bp: int = 0  # basis points; 1800 = 18% GST
    status: str = "issued"
    issued_at: Optional[datetime] = None
    paid_at: Optional[datetime] = None
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None
    invoice_url: Optional[str] = None
    customer_gstin: Optional[str] = None

    def __post_init__(self) -> None:
        # The same invariant `billing_invoices_total_split_chk` enforces in the
        # database. Checked here too so a bad invoice fails where it is built,
        # with a domain error, rather than as a constraint violation three
        # layers down.
        if self.tax.currency != self.total.currency or self.net.currency != self.total.currency:
            raise MoneyError("invoice components must share one currency")
        if self.net.minor_units + self.tax.minor_units != self.total.minor_units:
            raise MoneyError(
                f"invoice does not balance: net {self.net.minor_units} + tax "
                f"{self.tax.minor_units} != total {self.total.minor_units}"
            )
        if not 0 <= self.tax_rate_bp <= 10_000:
            raise MoneyError(f"tax_rate_bp out of range: {self.tax_rate_bp}")


@dataclass(frozen=True)
class BillingEvent:
    """A webhook, recorded.

    `(provider, event_id)` is the idempotency key — the same composite primary
    key `billing_events` uses. Deduplication belongs in the database because
    application memory does not survive a restart mid-redelivery, and
    redelivery is normal rather than exceptional.

    `payload` is kept for investigation and is NEVER read to decide state. The
    handler re-fetches the object from the gateway API, because the payload is a
    snapshot at emit time and events arrive out of order.
    """

    provider: str
    event_id: str
    event_type: str
    payload: dict = field(default_factory=dict)
    organization_id: Optional[str] = None
    status: str = "received"  # received | processed | ignored | failed
    received_at: Optional[datetime] = None
    processed_at: Optional[datetime] = None
    attempts: int = 0
    error: Optional[str] = None

    @property
    def key(self) -> tuple[str, str]:
        return (self.provider, self.event_id)
