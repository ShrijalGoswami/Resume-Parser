"""
What `GET /org/subscription` is allowed to tell the client.

THE POINT OF THESE TESTS
------------------------
The checkout UI has to distinguish three situations that the five-value
`status` vocabulary cannot: "you are on Free", "we created a subscription and
are waiting for the mandate", and "the webhook landed and you are active". Told
apart wrongly, a customer who has just paid is shown either a false success or a
false failure — the two worst outcomes available to a payment flow.

`billing_state` (migration 0027) is what separates them, so it is projected. The
tests below pin BOTH halves of that decision: the enrichment is exposed, and the
provider's identifiers are NOT. A gateway subscription id in a client response
would put a Razorpay identifier on the public API and break the one-way
dependency BILLING_ARCHITECTURE §1.2 exists to protect.
"""
from __future__ import annotations

from datetime import datetime, timezone

from app.enterprise.schemas import Subscription


def test_billing_state_is_projected_when_present():
    """The eight-value enrichment reaches the client."""
    row = {
        "organization_id": "org_1",
        "plan": "pro",
        "status": "active",
        "billing_state": "active",
        "limits": {},
    }
    assert Subscription(**row).billing_state == "active"


def test_pending_activation_survives_the_projection():
    """The state a paying customer sits in while waiting for the webhook.

    `status` is `incomplete` here and would be indistinguishable from any other
    non-active row. `billing_state` is the only thing that says "a checkout is
    in flight", and the confirmation screen polls precisely for its absence.
    """
    row = {
        "organization_id": "org_1",
        "plan": "pro",
        "status": "incomplete",
        "billing_state": "pending_activation",
        "limits": {},
    }
    subscription = Subscription(**row)
    assert subscription.billing_state == "pending_activation"
    assert subscription.status == "incomplete"


def test_billing_state_is_optional():
    """Operator-set and pre-0027 rows never carry one.

    The client must read absence as "unknown", not as a state. A default of
    `'free'` here would tell the UI a paying Enterprise customer was unbilled.
    """
    row = {"organization_id": "org_1", "plan": "enterprise", "status": "active", "limits": {}}
    assert Subscription(**row).billing_state is None


def test_period_end_and_cancellation_are_projected():
    """Settings states a renewal date only because the backend sent one."""
    end = datetime(2026, 9, 11, tzinfo=timezone.utc)
    row = {
        "organization_id": "org_1",
        "plan": "plus",
        "status": "active",
        "billing_state": "active",
        "current_period_end": end.isoformat(),
        "cancel_at_period_end": True,
        "limits": {},
    }
    subscription = Subscription(**row)
    assert subscription.current_period_end == end
    assert subscription.cancel_at_period_end is True


def test_cancel_at_period_end_defaults_to_false():
    """Absence must not read as "cancelled" — that flips Settings from
    "Renews" to "Access until" and tells a paying customer they are leaving."""
    row = {"organization_id": "org_1", "plan": "plus", "status": "active", "limits": {}}
    assert Subscription(**row).cancel_at_period_end is False


def test_no_provider_identifier_is_ever_projected():
    """The guard that keeps a gateway id off the client API.

    `extra="ignore"` means a row carrying these columns — every gateway-billed
    row does — silently drops them. This test is what stops a future field
    being added "because it was already in the row".
    """
    row = {
        "organization_id": "org_1",
        "plan": "pro",
        "status": "active",
        "billing_state": "active",
        "billing_subscription_id": "sub_ABC123",
        "billing_customer_id": "cust_ABC123",
        "billing_provider": "razorpay",
        "limits": {},
    }
    dumped = Subscription(**row).model_dump()
    assert "billing_subscription_id" not in dumped
    assert "billing_customer_id" not in dumped
    assert "billing_provider" not in dumped
    assert not any("razorpay" in str(value).lower() for value in dumped.values())
