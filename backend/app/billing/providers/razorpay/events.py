"""
Razorpay webhook → `BillingEvent`.

Parsing only. Nothing here writes to a database, calls the gateway, or changes
a subscription — that is Step 4. This turns a verified envelope into the domain
record that `billing_events` stores, and decides whether the event is one we act
on or one we merely keep.

IDEMPOTENCY
-----------
`(provider, event_id)` is the primary key of `billing_events`, and the event id
comes from the `x-razorpay-event-id` HEADER — the subscription webhook envelope
has no event id inside it. The handler inserts first and treats a unique
violation as "already seen".

An envelope with no event id is refused rather than given a generated one. A
fabricated key would make every redelivery look new, which is precisely the
failure the key exists to prevent.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from app.billing.domain.errors import ProviderError
from app.billing.domain.models import BillingEvent
from app.billing.providers.razorpay import mapping

PROVIDER = "razorpay"


def to_billing_event(
    envelope,
    *,
    organization_id: Optional[str] = None,
    received_at: Optional[datetime] = None,
) -> BillingEvent:
    """Build the record for `billing_events`.

    A verified envelope only. An unverified one is a forgery attempt, not a
    customer with a bad network, and must never reach storage as though it were
    genuine.
    """
    if not envelope.verified:
        raise ProviderError(PROVIDER, "refusing to record an unverified webhook")
    if not envelope.event_id:
        raise ProviderError(
            PROVIDER,
            "webhook has no x-razorpay-event-id header; without it idempotency "
            "is impossible and a redelivery would be processed twice",
        )

    event_type = envelope.event_type or "unknown"
    return BillingEvent(
        provider=PROVIDER,
        event_id=envelope.event_id,
        event_type=event_type,
        payload=envelope.payload,
        organization_id=organization_id or organization_id_from(envelope.payload),
        # `ignored` is distinct from `processed`: an event we chose not to act
        # on and one we acted on must stay distinguishable in an investigation.
        status="received" if mapping.is_handled(event_type) else "ignored",
        received_at=received_at or datetime.now(timezone.utc),
    )


def organization_id_from(payload: dict) -> Optional[str]:
    """Recover our organization id from the gateway's `notes`.

    `start_subscription` writes `notes.organization_id`, so the round trip is
    closed. Returns None rather than raising: an event we cannot attribute is
    still worth storing — `billing_events.organization_id` is nullable for
    exactly this reason, and losing the record to satisfy a foreign key would be
    worse than keeping it unattributed for a human to read.
    """
    subscription = mapping.subscription_entity(payload) or {}
    notes = subscription.get("notes") or {}
    org_id = notes.get("organization_id")
    if org_id:
        return str(org_id)

    payment = mapping.payment_entity(payload) or {}
    notes = payment.get("notes") or {}
    org_id = notes.get("organization_id")
    return str(org_id) if org_id else None


def subscription_id_from(payload: dict) -> Optional[str]:
    """The gateway subscription id an event refers to.

    This, not the payload's own fields, is what the handler will re-fetch with —
    the event is a notification, the API is the truth.
    """
    subscription = mapping.subscription_entity(payload) or {}
    return subscription.get("id")


def describe(event_type: str) -> str:
    """A human sentence for a log line or an audit row."""
    return mapping.HANDLED_EVENTS.get(event_type, "not handled; recorded only")
