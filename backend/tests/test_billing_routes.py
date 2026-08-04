"""
The billing HTTP surface.

Two security models in one router, and the tests are mostly about keeping them
apart:

  * `/billing/subscriptions*` — authenticated, owner-only, org-scoped.
  * `/billing/webhook/razorpay` — unauthenticated by necessity. Razorpay has no
    session and cannot carry a bearer token; its identity is the HMAC signature
    over the raw body.

The webhook cases are the ones worth reading. A router-level auth dependency
here would 401 every delivery, and the symptom would be *silent*: Razorpay would
retry, give up, and the subscriptions of paying customers would simply never
activate. `test_webhook_needs_no_authentication` is what stops someone
"tidying" that up.

Status codes are the retry protocol, so they are asserted rather than assumed.
"""
from __future__ import annotations

import json

import pytest
from fastapi.testclient import TestClient

from app.billing.domain.errors import BillingError, ProviderError
from app.enterprise.context import OrgContext
from app.enterprise.rbac import Permission
from app.main import app
from app.routes.billing import get_billing_service
from app.enterprise.deps import get_org_context

WEBHOOK = "/api/v1/billing/webhook/razorpay"
CHECKOUT = "/api/v1/billing/subscriptions"


class StubRecruiter:
    id = "rec_1"
    email = "owner@example.com"
    full_name = "Owner"


class StubContext:
    """Just enough `OrgContext` for these routes.

    `require()` is the RBAC hook — raising from it is how a non-owner is
    rejected, and the routes must not have their own role logic.
    """

    def __init__(self, *, permitted=True, org_id="org_1"):
        self.recruiter = StubRecruiter()
        self.organization_id = org_id
        self.organization_name = "Acme"
        self.workspace_id = None
        self._permitted = permitted

    def require(self, permission):
        if not self._permitted:
            from fastapi import HTTPException, status

            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"missing {permission}",
            )


class StubService:
    def __init__(self):
        self.handled = []
        self.webhook_result = {"received": True, "handled": True, "status": "processed"}
        self.webhook_error = None
        self.checkout_error = None
        self.raw_bodies = []

    def start_checkout(self, **kw):
        if self.checkout_error:
            raise self.checkout_error
        from app.billing.domain.models import BillingProviderId, Money
        from app.billing.domain.provider import CheckoutHandoff

        self.handled.append(kw)
        return CheckoutHandoff(
            provider=BillingProviderId.razorpay, kind="modal",
            subscription_id="sub_new", public_key="rzp_test_abc",
            amount=Money(99_900, "INR"),
        )

    def verify_callback(self, payload):
        return payload.get("sig") == "good"

    def cancel(self, **kw):
        from app.billing.domain.models import BillingState, Subscription

        self.handled.append(kw)
        return Subscription(
            organization_id="org_1", plan="plus", state=BillingState.active,
            cancel_at_period_end=True,
        )

    def handle_webhook(self, raw_body, headers):
        self.raw_bodies.append(raw_body)
        if self.webhook_error:
            raise self.webhook_error
        return self.webhook_result


@pytest.fixture
def service():
    stub = StubService()
    app.dependency_overrides[get_billing_service] = lambda: stub
    yield stub
    app.dependency_overrides.pop(get_billing_service, None)


@pytest.fixture
def owner():
    ctx = StubContext(permitted=True)
    app.dependency_overrides[get_org_context] = lambda: ctx
    yield ctx
    app.dependency_overrides.pop(get_org_context, None)


@pytest.fixture
def member():
    ctx = StubContext(permitted=False)
    app.dependency_overrides[get_org_context] = lambda: ctx
    yield ctx
    app.dependency_overrides.pop(get_org_context, None)


@pytest.fixture
def client():
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


# ── the webhook ─────────────────────────────────────────────────────────────


class TestWebhookSecurity:
    def test_webhook_needs_no_authentication(self, client, service):
        """LOAD-BEARING. Razorpay carries no session and cannot be given one.

        If this ever 401s, deliveries fail, Razorpay retries and gives up, and
        the subscriptions of paying customers never activate — with no error
        anywhere in our logs, because the request never reached a handler.
        """
        r = client.post(WEBHOOK, content=b'{"event":"subscription.activated"}')
        assert r.status_code == 200

    def test_the_raw_bytes_reach_the_verifier_untouched(self, client, service):
        """The signature is computed over exactly what Razorpay sent.

        Any middleware that parses and re-serialises JSON changes the bytes —
        key order, whitespace, unicode escaping — and the failure surfaces as
        "invalid signature", which sends you hunting for a credential problem
        that does not exist.
        """
        body = b'{"event":"subscription.charged","z":1,"a":{"b":  2}}'
        client.post(WEBHOOK, content=body)
        assert service.raw_bodies == [body]

    def test_a_forged_signature_is_terminal_not_retried(self, client, service):
        """400, not 5xx. A forgery must not be retried into existence."""
        service.webhook_error = ProviderError("razorpay", "signature verification failed")
        r = client.post(WEBHOOK, content=b"{}")
        assert r.status_code == 400

    def test_a_domain_refusal_is_not_retried_either(self, client, service):
        """A founding-org event will be refused identically on every
        redelivery, so a 5xx would loop forever."""
        service.webhook_error = BillingError("organization is founding")
        r = client.post(WEBHOOK, content=b"{}")
        assert r.status_code == 200
        assert r.json()["status"] == "refused"

    def test_a_transient_failure_asks_for_redelivery(self, client, service):
        """500 is the only way to get Razorpay to try again — it is the sole
        recovery mechanism this integration has."""
        service.webhook_error = RuntimeError("database unreachable")
        r = client.post(WEBHOOK, content=b"{}")
        assert r.status_code == 500
        assert r.json()["status"] == "retry"

    def test_a_duplicate_is_a_success(self, client, service):
        service.webhook_result = {"received": True, "duplicate": True, "status": "processed"}
        r = client.post(WEBHOOK, content=b"{}")
        assert r.status_code == 200
        assert r.json()["duplicate"] is True

    def test_the_webhook_is_not_advertised_in_the_api_schema(self):
        assert WEBHOOK not in app.openapi()["paths"]


# ── checkout ────────────────────────────────────────────────────────────────


class TestCheckoutRoute:
    def test_an_owner_can_start_checkout(self, client, service, owner):
        r = client.post(CHECKOUT, json={"plan": "plus"})
        assert r.status_code == 200
        body = r.json()
        assert body["subscription_id"] == "sub_new"
        assert body["amount_minor"] == 99_900

    def test_only_the_publishable_key_is_returned(self, client, service, owner):
        """The key secret never leaves the server, and nothing in this response
        is sufficient to charge anyone."""
        r = client.post(CHECKOUT, json={"plan": "plus"})
        assert r.json()["public_key"].startswith("rzp_test_")
        assert "secret" not in r.text.lower()

    def test_a_non_owner_is_refused(self, client, service, member):
        """Spending the organization's money is owner-only — the same class of
        act as disposing of the account."""
        r = client.post(CHECKOUT, json={"plan": "plus"})
        assert r.status_code == 403

    def test_the_organization_comes_from_the_session_not_the_body(
        self, client, service, owner
    ):
        """A caller must never be able to start a subscription for someone
        else's organization by naming it."""
        client.post(CHECKOUT, json={"plan": "plus", "organization_id": "org_victim"})
        assert service.handled[0]["organization_id"] == "org_1"

    def test_a_refused_checkout_is_409_not_400(self, client, service, owner):
        """The request is well-formed and the caller is authorized; what is
        wrong is the organization's state."""
        from app.billing.service import CheckoutRefused

        service.checkout_error = CheckoutRefused("this organization is already on pro")
        r = client.post(CHECKOUT, json={"plan": "pro"})
        assert r.status_code == 409
        assert "already on pro" in r.json()["detail"]

    def test_a_gateway_failure_says_nothing_was_charged(self, client, service, owner):
        """The first thing a customer wants to know after a payment error."""
        service.checkout_error = ProviderError("razorpay", "upstream 503")
        r = client.post(CHECKOUT, json={"plan": "plus"})
        assert r.status_code == 502
        assert "nothing was charged" in r.json()["detail"].lower()


class TestCallbackRoute:
    def test_a_verified_callback_does_not_claim_the_plan_is_active(
        self, client, service, owner
    ):
        """RULE 2, asserted at the HTTP boundary: only the webhook grants a
        plan, so this response must never say otherwise."""
        r = client.post(
            "/api/v1/billing/subscriptions/verify", json={"sig": "good"}
        )
        assert r.status_code == 200
        assert r.json()["verified"] is True
        assert r.json()["plan_active"] is False

    def test_an_unverified_callback_is_reported_honestly(self, client, service, owner):
        r = client.post(
            "/api/v1/billing/subscriptions/verify", json={"sig": "forged"}
        )
        assert r.json()["verified"] is False
        assert "contact us" in r.json()["message"].lower()

    def test_the_callback_route_is_owner_only(self, client, service, member):
        r = client.post("/api/v1/billing/subscriptions/verify", json={"sig": "good"})
        assert r.status_code == 403


class TestCancelRoute:
    def test_cancelling_at_period_end_keeps_the_plan_running(
        self, client, service, owner
    ):
        r = client.post("/api/v1/billing/subscriptions/cancel", json={})
        assert r.status_code == 200
        body = r.json()
        assert body["cancel_at_period_end"] is True
        assert body["state"] == "active"

    def test_at_period_end_defaults_to_true(self, client, service, owner):
        """The safe default: never take away a period the customer paid for."""
        client.post("/api/v1/billing/subscriptions/cancel", json={})
        assert service.handled[0]["at_period_end"] is True

    def test_cancellation_is_owner_only(self, client, service, member):
        r = client.post("/api/v1/billing/subscriptions/cancel", json={})
        assert r.status_code == 403
