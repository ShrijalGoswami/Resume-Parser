"""
Razorpay vocabulary → our domain.

Every gateway-specific string in the integration is translated here and nowhere
else. Above this file the domain deals in `BillingState`; below it, in whatever
Razorpay happens to call things this year.

Verified against the current documentation on 1 Aug 2026, not from memory:
https://razorpay.com/docs/payments/subscriptions/states/
https://razorpay.com/docs/webhooks/payloads/subscriptions/
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from app.billing.domain.models import BillingState

# ── subscription status ─────────────────────────────────────────────────────
#
#   created         subscription made, mandate not yet authorized
#   authenticated   customer authorized the mandate; first charge not settled
#   active          charging normally
#   pending         a charge failed and the gateway IS STILL RETRYING
#   halted          a charge failed and the retries are EXHAUSTED
#   paused          deliberately paused; only an `active` subscription can be
#   cancelled       ended — TERMINAL at Razorpay, it cannot be restarted
#   completed       every billing cycle in `total_count` has been charged
#   expired         the authorization window passed without the mandate completing

STATUS_MAP: dict[str, BillingState] = {
    "created": BillingState.pending_activation,
    "authenticated": BillingState.pending_activation,
    "active": BillingState.active,

    # `pending` and `halted` are the reason our domain distinguishes
    # `payment_failed` from `grace`. Razorpay's own wording: pending means
    # "they continue to retry the payment while it is in this state"; halted
    # means "all retries are exhausted". Both keep full access — dunning is a
    # billing conversation, not a reason to lock a hiring team out.
    "pending": BillingState.payment_failed,
    "halted": BillingState.grace,

    # PAUSED IS NOT A PAYMENT FAILURE.
    #
    # The architecture originally mapped this to `past_due`, described as
    # "conservative". It was the opposite: `past_due` is the dunning state, it
    # opens a 7-day grace window, and the sweep would then SUSPEND a customer
    # who had merely paused — with no failed payment anywhere in their history.
    #
    # A pause is a deliberate act by someone who is not in arrears. Access is
    # retained and no clock starts. `is_externally_paused()` below lets the
    # integrity check surface it, because V1 exposes no pause API and a paused
    # subscription can therefore only have come from the dashboard.
    "paused": BillingState.active,

    "cancelled": BillingState.cancelled,
    "expired": BillingState.cancelled,

    # `completed` means the cycle counter ran out, not that the customer left.
    # It maps to `active` so nobody loses access to something they are still
    # paying for; renewal is the adapter's job (see `plans.SUBSCRIPTION_CYCLES`).
    "completed": BillingState.active,
}

#: Statuses that mean the gateway will not charge again without intervention.
#: Reported by reconciliation rather than acted on automatically.
NEEDS_ATTENTION = frozenset({"halted", "paused", "completed", "expired"})


def to_billing_state(razorpay_status: str) -> BillingState:
    """Translate a Razorpay status.

    An unknown status is NOT silently defaulted. Razorpay adding a state we do
    not handle is exactly the situation where guessing is worst: mapping it to
    `active` would grant access we cannot bill for, and mapping it to
    `cancelled` would revoke access a customer is paying for. `KeyError` here
    fails the event, which pages us instead of them.
    """
    try:
        return STATUS_MAP[razorpay_status]
    except KeyError as exc:
        raise KeyError(
            f"unknown Razorpay subscription status {razorpay_status!r}; "
            "refusing to guess — add it to STATUS_MAP deliberately"
        ) from exc


def is_externally_paused(razorpay_status: str) -> bool:
    """A subscription paused at the gateway.

    Worth surfacing: V1 has no pause API, so this can only have been done from
    the Razorpay dashboard, and the customer keeps access while it lasts.
    """
    return razorpay_status == "paused"


def is_terminal(razorpay_status: str) -> bool:
    """Whether Razorpay will refuse to revive this subscription.

    `cancelled` is terminal at Razorpay — "once cancelled, a Subscription
    cannot be restarted". Resubscribing must create a NEW subscription. This is
    declared as a capability (`supports_gateway_reactivation=False`) so the
    domain never has to know it; this helper is for the adapter's own guards.
    """
    return razorpay_status in {"cancelled", "expired", "completed"}


# ── webhook events ──────────────────────────────────────────────────────────

#: Events we act on. Everything else is recorded with status `ignored` rather
#: than dropped, so "we never received it" and "we received it and did nothing"
#: stay distinguishable during an investigation.
HANDLED_EVENTS: dict[str, str] = {
    "subscription.authenticated": "mandate authorized; not yet charging",
    "subscription.activated": "subscription is live — the moment access begins",
    "subscription.charged": "a recurring charge succeeded; new period confirmed",
    "subscription.pending": "a charge failed; the gateway is retrying",
    "subscription.halted": "retries exhausted; grace window is running",
    "subscription.cancelled": "ended by customer or by us",
    "subscription.completed": "every billing cycle charged; needs renewal",
    "subscription.paused": "paused at the gateway; access retained",
    "subscription.resumed": "resumed at the gateway",
    "subscription.updated": "something changed; re-fetch and re-derive",
}

#: Events that carry a payment we may want to record alongside the subscription.
PAYMENT_BEARING_EVENTS = frozenset({
    "subscription.charged",
    "subscription.activated",
    "subscription.authenticated",
})


def is_handled(event_type: str) -> bool:
    return event_type in HANDLED_EVENTS


def subscription_entity(payload: dict) -> Optional[dict]:
    """Pull the subscription out of the webhook envelope.

    Razorpay nests entities: `payload.subscription.entity`. Returns None rather
    than raising, because an event without a subscription is a legitimate
    ignore, not a failure.
    """
    return (payload or {}).get("payload", {}).get("subscription", {}).get("entity")


def payment_entity(payload: dict) -> Optional[dict]:
    return (payload or {}).get("payload", {}).get("payment", {}).get("entity")


def to_datetime(unix_ts: Optional[int]) -> Optional[datetime]:
    """Razorpay timestamps are Unix seconds; ours are timezone-aware UTC.

    A naive datetime here would compare wrongly against `grace_period_ends_at`
    and could suspend an account early or late.
    """
    if not unix_ts:
        return None
    return datetime.fromtimestamp(int(unix_ts), tz=timezone.utc)
