"""
Plan change between paid tiers — Plus → Pro, scheduled at the cycle end.

WHAT THIS REPLACES
------------------
BILL-13 refused this outright: an active Plus customer clicking "Upgrade to Pro"
got a 409 saying plan changes were not self-serve. Before that guard existed it
was an unhandled 500. It is now implemented properly, and the thing these tests
mostly exist to protect is the shape of the implementation rather than the fact
of it:

  * ONE subscription. The change is a PATCH against the subscription the
    customer already holds. A second `subscription.create` would mean a second
    mandate, a second charge and two live subscriptions for one organization —
    the exact outcome the old refusal was protecting against.
  * NOTHING CHARGED TODAY. `schedule_change_at="cycle_end"`. The customer keeps
    the Plus they paid for until the period ends.
  * NOTHING LOCAL WRITTEN. The organization stays on Plus until the gateway says
    otherwise. Granting Pro because a request succeeded is the same mistake as
    trusting a browser callback.

Every gateway call here is a stub. No network, no credentials, no real write.
"""
from __future__ import annotations

from datetime import datetime, timezone

import pytest

from app.billing.domain.errors import ProviderError
from app.billing.domain.models import (
    BillingMode,
    BillingProviderId,
    BillingState,
    Subscription,
)
from app.billing.service import BillingService, CheckoutRefused

ORG = "org_test"
PERIOD_END = datetime(2026, 9, 11, tzinfo=timezone.utc)

PLUS_PLAN_ID = "plan_TOUEWyB2hZYh3v"
PRO_PLAN_ID = "plan_TOUEXTKT5S4zww"


@pytest.fixture(autouse=True)
def _bind_plans(monkeypatch):
    """The bindings the deployment actually uses, from the environment."""
    monkeypatch.setenv("RAZORPAY_PLAN_PLUS_INR", PLUS_PLAN_ID)
    monkeypatch.setenv("RAZORPAY_PLAN_PRO_INR", PRO_PLAN_ID)


class StubRepo:
    def __init__(self, subscription):
        self.subscription = subscription
        self.saved = []

    def get_subscription(self, organization_id):
        return self.subscription

    def save_subscription(self, subscription):
        self.saved.append(subscription)
        return subscription


class StubProvider:
    """Records what the gateway was asked to do. Creates nothing."""

    def __init__(self, *, scheduled=None, fail=False):
        self.calls: list[tuple] = []
        self._scheduled = scheduled
        self._fail = fail

    # These two must never run on a plan change.
    def ensure_customer(self, *a, **k):
        self.calls.append(("customer.create", a))
        raise AssertionError("a plan change must not create a customer")

    def start_subscription(self, *a, **k):
        self.calls.append(("subscription.create", a))
        raise AssertionError("a plan change must not create a subscription")

    def fetch_scheduled_change(self, subscription_id):
        self.calls.append(("fetch_scheduled_change", subscription_id))
        return self._scheduled

    def change_plan(self, subscription_id, plan, *, at_cycle_end=True):
        self.calls.append(("change_plan", subscription_id, plan, at_cycle_end))
        if self._fail:
            raise ProviderError("razorpay", "plan change failed: gateway said no")
        from app.billing.domain.provider import ProviderSubscription

        # Razorpay reports a SCHEDULED change as a pending update: the
        # subscription is still on the old plan today.
        return ProviderSubscription(
            provider=BillingProviderId.razorpay,
            provider_subscription_id=subscription_id,
            provider_customer_id="cust_1",
            plan="plus",
            state=BillingState.active,
            current_period_start=None,
            current_period_end=PERIOD_END,
            cancel_at_period_end=False,
            raw={},
        )


def plus_subscription(**overrides):
    base = dict(
        organization_id=ORG,
        plan="plus",
        state=BillingState.active,
        billing_mode=BillingMode.provider,
        provider=BillingProviderId.razorpay,
        provider_customer_id="cust_1",
        provider_subscription_id="sub_EXISTING",
        current_period_end=PERIOD_END,
    )
    base.update(overrides)
    return Subscription(**base)


def service_for(subscription, **provider_kwargs):
    provider = StubProvider(**provider_kwargs)
    return BillingService(provider=provider, repository=StubRepo(subscription)), provider


# ── the upgrade itself ──────────────────────────────────────────────────────


def test_plus_to_pro_patches_the_existing_subscription():
    """THE CORE REQUIREMENT. One subscription, reused."""
    service, provider = service_for(plus_subscription())

    result = service.change_plan(organization_id=ORG, plan="pro")

    change = [c for c in provider.calls if c[0] == "change_plan"]
    assert len(change) == 1
    _, subscription_id, plan, at_cycle_end = change[0]
    assert subscription_id == "sub_EXISTING", "must reuse the existing subscription"
    assert plan == "pro"
    assert at_cycle_end is True, "this release schedules; it never changes immediately"

    assert result.scheduled_plan == "pro"
    assert result.current_plan == "plus"
    assert result.effective_at == PERIOD_END


def test_no_second_subscription_and_no_second_customer():
    """The stubs raise if either is attempted, so reaching the assert is the test."""
    service, provider = service_for(plus_subscription())
    service.change_plan(organization_id=ORG, plan="pro")

    attempted = {name for name, *_ in provider.calls}
    assert "subscription.create" not in attempted
    assert "customer.create" not in attempted


def test_the_plan_does_not_move_but_the_promise_persists():
    """THE WHOLE CONTRACT, in one test.

    `plan` stays `plus` — the organization keeps Plus's entitlements until the
    gateway reports the change, and writing `pro` here would grant a tier nobody
    has paid for. But `scheduled_plan` IS written, because a promise that lives
    only in the browser tab that made it does not survive a refresh, and
    Settings would go on offering an upgrade that was already booked.
    """
    service, _ = service_for(plus_subscription())

    service.change_plan(organization_id=ORG, plan="pro")

    assert len(service.repo.saved) == 1, "exactly one write, and it is the promise"
    saved = service.repo.saved[0]
    assert saved.plan == "plus", "the entitlement must not move today"
    assert saved.state is BillingState.active
    assert saved.scheduled_plan == "pro"
    assert saved.scheduled_plan_effective_at == PERIOD_END
    assert saved.has_scheduled_change is True


def test_the_persisted_promise_survives_a_reload():
    """Read back through the repository, which is what a refresh does."""
    service, _ = service_for(plus_subscription())
    service.change_plan(organization_id=ORG, plan="pro")

    # The stub repository returns what it was given, exactly as a real read
    # after a page reload would.
    reloaded = service.repo.saved[-1]
    assert reloaded.plan == "plus"
    assert reloaded.scheduled_plan == "pro"
    assert reloaded.scheduled_plan_effective_at is not None


def test_a_gateway_failure_persists_no_promise():
    """THE GATEWAY FIRST, THEN US.

    If the PATCH fails, nothing local changed — no plan move AND no phantom
    "Pro is coming" on the billing screen. Recording the promise first would
    leave us telling a customer about an upgrade the gateway never agreed to.
    """
    service, _ = service_for(plus_subscription(), fail=True)

    with pytest.raises(ProviderError):
        service.change_plan(organization_id=ORG, plan="pro")

    assert service.repo.saved == []
    assert service.repo.subscription.plan == "plus"
    assert service.repo.subscription.scheduled_plan is None
    assert service.repo.subscription.scheduled_plan_effective_at is None


# ── idempotence ─────────────────────────────────────────────────────────────


def test_an_identical_scheduled_change_is_not_queued_twice():
    """A customer who clicks twice must not queue two changes.

    Razorpay holds at most one pending update per subscription, so the second
    click is answered from what is already there — a success, not an error.
    """
    service, provider = service_for(
        plus_subscription(), scheduled={"plan_id": PRO_PLAN_ID}
    )

    result = service.change_plan(organization_id=ORG, plan="pro")

    assert result.already_scheduled is True
    assert result.scheduled_plan == "pro"
    assert not any(c[0] == "change_plan" for c in provider.calls), (
        "an existing identical schedule must not be rewritten"
    )


def test_a_conflicting_scheduled_change_is_refused_safely():
    """Something else is already queued. Refuse with a route out rather than
    silently replacing a change somebody deliberately made."""
    service, provider = service_for(
        plus_subscription(), scheduled={"plan_id": PLUS_PLAN_ID}
    )

    with pytest.raises(CheckoutRefused, match="different change is already scheduled"):
        service.change_plan(organization_id=ORG, plan="pro")

    assert not any(c[0] == "change_plan" for c in provider.calls)


# ── who may, and who may not ────────────────────────────────────────────────


def test_plus_to_plus_is_refused():
    service, _ = service_for(plus_subscription())
    with pytest.raises(CheckoutRefused, match="already on plus"):
        service.change_plan(organization_id=ORG, plan="plus")


def test_plus_to_free_is_refused_as_a_downgrade():
    service, _ = service_for(plus_subscription())
    with pytest.raises(CheckoutRefused):
        service.change_plan(organization_id=ORG, plan="free")


def test_pro_to_plus_is_refused_as_a_downgrade():
    """Taking capability away is a different act from adding it, and the
    customer paid for Pro until the period ends."""
    service, provider = service_for(plus_subscription(plan="pro"))
    with pytest.raises(CheckoutRefused, match="isn't self-serve"):
        service.change_plan(organization_id=ORG, plan="plus")
    assert not any(c[0] == "change_plan" for c in provider.calls)


def test_pro_to_free_is_refused():
    service, _ = service_for(plus_subscription(plan="pro"))
    with pytest.raises(CheckoutRefused):
        service.change_plan(organization_id=ORG, plan="free")


def test_enterprise_is_never_a_self_serve_target():
    """Quoted, contracted and invoiced offline. Unchanged by this feature."""
    service, _ = service_for(plus_subscription())
    with pytest.raises(CheckoutRefused, match="not a plan you can move to"):
        service.change_plan(organization_id=ORG, plan="enterprise")


def test_a_free_organization_has_nothing_to_change():
    """Free buys through checkout — there is no subscription to PATCH."""
    service, provider = service_for(
        plus_subscription(
            plan="free",
            state=BillingState.free,
            billing_mode=BillingMode.none,
            provider=None,
            provider_subscription_id=None,
        )
    )
    with pytest.raises(CheckoutRefused, match="no self-serve subscription"):
        service.change_plan(organization_id=ORG, plan="pro")
    assert not any(c[0] == "change_plan" for c in provider.calls)


def test_an_operator_granted_plan_is_not_changed_here():
    """`billing_mode='none'` — granted by a human, changed by a human."""
    service, _ = service_for(
        plus_subscription(
            plan="enterprise", billing_mode=BillingMode.none,
            provider=None, provider_subscription_id=None,
        )
    )
    with pytest.raises(CheckoutRefused, match="no self-serve subscription"):
        service.change_plan(organization_id=ORG, plan="pro")


def test_a_founding_organization_is_refused_first():
    service, _ = service_for(plus_subscription(plan_ruleset="founding"))
    with pytest.raises(CheckoutRefused, match="founding"):
        service.change_plan(organization_id=ORG, plan="pro")


def test_a_cancelled_subscription_must_go_through_checkout():
    """Coming back re-establishes a mandate; there is no live subscription to
    move."""
    service, _ = service_for(
        plus_subscription(state=BillingState.cancelled)
    )
    with pytest.raises(CheckoutRefused, match="isn't active"):
        service.change_plan(organization_id=ORG, plan="pro")


# ── checkout still refuses to double-subscribe ──────────────────────────────


def test_checkout_still_refuses_an_already_subscribed_organization():
    """`start_checkout` must NOT become the plan-change path.

    Sending a live subscriber through checkout would create a second gateway
    subscription and a second mandate. The refusal stays; only its wording
    changed, to name the endpoint that does the job.
    """
    service, provider = service_for(plus_subscription())

    with pytest.raises(CheckoutRefused, match="plan-change endpoint"):
        service.start_checkout(organization_id=ORG, plan="pro", email="o@example.com")

    assert not any(c[0] == "subscription.create" for c in provider.calls)
