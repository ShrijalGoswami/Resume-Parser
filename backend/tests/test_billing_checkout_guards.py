"""
Who may start a checkout, and what happens to everyone else.

WHY THIS FILE EXISTS
--------------------
`start_checkout` refused three cases — founding, already-on-this-plan, and
already-gateway-subscribed — and let everything else through to
`_to_pending`, which drives the state machine. Anything reaching there from a
state with no edge to `pending_activation` raised `IllegalTransitionError` out
of the method, and the route has no handler for it: an unhandled 500 for an
owner who clicked "Upgrade to Pro".

That is not hypothetical. Every organization in the live deployment is
`plan='enterprise', billing_state='active', billing_mode='none'` — granted by an
operator, never gateway-billed — which passes all three guards and fails on the
fourth step. It was found by clicking the button in a browser.

The rule these tests pin: **a checkout that cannot legally proceed is refused
with a reason, never with a stack trace.**
"""
from __future__ import annotations

import pytest

from app.billing.domain.models import (
    BillingMode,
    BillingProviderId,
    BillingState,
    Subscription,
)
from app.billing.service import BillingService, CheckoutRefused

ORG = "org_test"


class StubRepo:
    """Just enough repository to answer `get_subscription`."""

    def __init__(self, subscription):
        self.subscription = subscription
        self.saved = []

    def get_subscription(self, organization_id):
        return self.subscription

    def save_subscription(self, subscription):
        self.saved.append(subscription)
        return subscription


class ExplodingProvider:
    """Any call is a failure: none of these cases may reach the gateway.

    A refusal that still creates a customer or a subscription at Razorpay would
    leave permanent objects behind for a purchase that was never allowed.
    """

    def ensure_customer(self, *args, **kwargs):  # pragma: no cover - must not run
        raise AssertionError("checkout must be refused before reaching the gateway")

    def start_subscription(self, *args, **kwargs):  # pragma: no cover - must not run
        raise AssertionError("checkout must be refused before reaching the gateway")


def service_for(subscription):
    repo = StubRepo(subscription)
    return BillingService(provider=ExplodingProvider(), repository=repo), repo


def subscription(**overrides):
    base = dict(
        organization_id=ORG,
        plan="free",
        state=BillingState.free,
        billing_mode=BillingMode.none,
    )
    base.update(overrides)
    return Subscription(**base)


def test_operator_granted_plan_is_refused_not_crashed():
    """THE REGRESSION. `active` + not gateway-billed used to reach the machine.

    An operator-granted Enterprise account is the single most common shape in
    this deployment, and clicking upgrade returned 500.
    """
    service, repo = service_for(
        subscription(plan="enterprise", state=BillingState.active, billing_mode=BillingMode.none)
    )

    with pytest.raises(CheckoutRefused) as caught:
        service.start_checkout(organization_id=ORG, plan="pro", email="owner@example.com")

    # The reason must be something a customer can act on, and must name the
    # route out. "Illegal transition active -> pending_activation" is not that.
    assert "managed directly by us" in str(caught.value)
    assert "Contact us" in str(caught.value)
    assert repo.saved == [], "a refused checkout must not write a subscription"


def test_the_shape_signup_actually_produces_can_reach_the_gateway():
    """END-TO-END REGRESSION, from the row a real signup writes.

    The other cases in this file build a `Subscription` directly, which cannot
    catch a defect in how a ROW becomes one — and that is exactly where this bug
    lived. So this case starts from the literal column values
    `provision_default_org()` inserts and pushes them through the real
    `_state_from_row` before `start_checkout` ever sees them.

    Reaching the exploding stub is the pass condition: it means every guard let
    the organization through and the next thing that would have happened is a
    real gateway call. Razorpay is never contacted.
    """
    from app.billing.repository import _to_domain

    provisioned = _to_domain({
        "organization_id": ORG,
        "plan": "free",
        "status": "active",          # the column default, and the whole problem
        "billing_state": None,       # `provision_default_org` sets neither
        "billing_mode": "none",
        "billing_provider": None,
        "billing_customer_id": None,
        "billing_subscription_id": None,
        "plan_ruleset": "v1",
        "plan_version": 1,
    })
    assert provisioned.state is BillingState.free, (
        "a freshly provisioned organization must read as free, or nobody can buy"
    )

    service, _ = service_for(provisioned)
    with pytest.raises(AssertionError, match="before reaching the gateway"):
        service.start_checkout(organization_id=ORG, plan="pro", email="owner@example.com")


def test_free_organization_is_not_refused_by_the_new_guard():
    """The guard must not close the door it exists to keep open.

    `free -> pending_activation` is legal, so this must get past every check and
    fail only at the stub gateway — which is how we know it got there.
    """
    service, _ = service_for(subscription())

    with pytest.raises(AssertionError, match="before reaching the gateway"):
        service.start_checkout(organization_id=ORG, plan="pro", email="owner@example.com")


def test_a_free_organization_may_buy_pro_without_buying_plus_first():
    """NO UPGRADE LADDER. Skipping a tier is an ordinary purchase.

    Settings ▸ Billing derived its single CTA from `nextPlan()` and so offered a
    Free organization Plus and only Plus, making Pro reachable only by buying
    Plus first. That was a UI artefact — this asserts the server never had such
    a rule, so the frontend fix is not papering over a backend restriction.
    """
    service, _ = service_for(subscription())

    with pytest.raises(AssertionError, match="before reaching the gateway"):
        service.start_checkout(organization_id=ORG, plan="pro", email="owner@example.com")


def test_cancelled_organization_may_resubscribe():
    """`cancelled -> pending_activation` is legal: a returning customer gets a
    NEW gateway subscription rather than a refusal."""
    service, _ = service_for(
        subscription(plan="pro", state=BillingState.cancelled, billing_mode=BillingMode.provider)
    )

    with pytest.raises(AssertionError, match="before reaching the gateway"):
        service.start_checkout(organization_id=ORG, plan="pro", email="owner@example.com")


def test_suspended_organization_may_resubscribe():
    service, _ = service_for(
        subscription(plan="plus", state=BillingState.suspended, billing_mode=BillingMode.provider)
    )

    with pytest.raises(AssertionError, match="before reaching the gateway"):
        service.start_checkout(organization_id=ORG, plan="plus", email="owner@example.com")


def test_gateway_subscribed_organization_still_gets_its_own_message():
    """The pre-existing BILL-13 refusal must not be shadowed by the new one.

    Both are 409s, but they say different things — one is "you already bought
    this here", the other is "we manage your plan". Losing the distinction would
    tell a paying self-serve customer their account is operator-managed.
    """
    service, _ = service_for(
        subscription(
            plan="plus",
            state=BillingState.active,
            billing_mode=BillingMode.provider,
            provider=BillingProviderId.razorpay,
            provider_subscription_id="sub_ABC",
        )
    )

    with pytest.raises(CheckoutRefused) as caught:
        service.start_checkout(organization_id=ORG, plan="pro", email="owner@example.com")

    assert "already subscribed" in str(caught.value)


def test_founding_organization_is_still_refused_first():
    """Founding is checked before everything, and says why."""
    service, _ = service_for(
        subscription(plan="enterprise", state=BillingState.active, plan_ruleset="founding")
    )

    with pytest.raises(CheckoutRefused) as caught:
        service.start_checkout(organization_id=ORG, plan="pro", email="owner@example.com")

    assert "founding" in str(caught.value)


@pytest.mark.parametrize("plan", ["free", "enterprise", "gold", ""])
def test_unsellable_plans_are_refused(plan):
    service, _ = service_for(subscription())
    with pytest.raises(CheckoutRefused):
        service.start_checkout(organization_id=ORG, plan=plan, email="owner@example.com")


def test_non_inr_currency_is_refused():
    """V1 settles INR only. The UI routes other markets to sales; the server
    refuses regardless of what the UI did."""
    service, _ = service_for(subscription())
    with pytest.raises(CheckoutRefused, match="USD"):
        service.start_checkout(
            organization_id=ORG, plan="pro", email="owner@example.com", currency="USD"
        )


# ── One-time trials ──────────────────────────────────────────────────────────
def test_free_organization_can_buy_a_trial():
    """A trial is an ordinary checkout from Free — reaching the gateway is the
    pass condition (the exploding stub proves every guard let it through)."""
    service, _ = service_for(subscription())
    with pytest.raises(AssertionError, match="before reaching the gateway"):
        service.start_checkout(organization_id=ORG, plan="trial", email="o@example.com")


def test_trial_holder_upgrades_through_a_new_checkout():
    """The BILL-13 refusal must NOT catch a completed trial: its single gateway
    cycle has already run, so there is no live mandate to protect and nothing to
    PATCH. Reaching the gateway is the pass condition."""
    service, _ = service_for(
        subscription(
            plan="trial_interview",
            state=BillingState.active,
            billing_mode=BillingMode.provider,
            provider=BillingProviderId.razorpay,
            provider_subscription_id="sub_TRIAL",
        )
    )
    with pytest.raises(AssertionError, match="before reaching the gateway"):
        service.start_checkout(organization_id=ORG, plan="plus", email="o@example.com")


def test_trial_pending_state_is_written_when_upgrading_from_a_trial():
    """The same upgrade, driven to completion with the fake gateway: the saved
    row must be `pending_activation` on the NEW plan — access changes only when
    the webhook says so."""
    from app.billing.providers.fake import FakeBillingProvider

    repo = StubRepo(
        subscription(
            plan="trial",
            state=BillingState.active,
            billing_mode=BillingMode.provider,
            provider=BillingProviderId.razorpay,
            provider_customer_id="cust_1",
            provider_subscription_id="sub_TRIAL",
        )
    )
    service = BillingService(provider=FakeBillingProvider(), repository=repo)
    service.start_checkout(organization_id=ORG, plan="plus", email="o@example.com")
    assert len(repo.saved) == 1
    pending = repo.saved[0]
    assert pending.plan == "plus"
    assert pending.state is BillingState.pending_activation


def test_repurchasing_the_same_trial_is_refused():
    """The lifetime counters do not reset, so selling the same trial twice
    would take money for nothing."""
    service, repo = service_for(
        subscription(
            plan="trial",
            state=BillingState.active,
            billing_mode=BillingMode.provider,
            provider=BillingProviderId.razorpay,
            provider_subscription_id="sub_TRIAL",
        )
    )
    with pytest.raises(CheckoutRefused, match="already on trial"):
        service.start_checkout(organization_id=ORG, plan="trial", email="o@example.com")
    assert repo.saved == []
