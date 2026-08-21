"""
The boot-time plan-binding check.

`lib/pricing.ts` publishes ₹999; the Razorpay plan object carries its own
amount. Two systems, no shared storage, and nothing stops them drifting except
this. A mismatch between what a customer is shown and what leaves their card is
the single worst defect this integration can produce — so it fails a DEPLOY
rather than a card.

The three outcomes are all deliberate and all tested here:

  agree        → log and continue
  disagree     → fatal in production, loud in development
  cannot ask   → warn and continue, because unknown is not the same as wrong and
                 a network blip must not take the whole service down
"""
from __future__ import annotations

import pytest

from app.billing.providers.razorpay import plans
from app.core.startup import StartupError, _validate_plan_bindings


def _clear_bindings(monkeypatch):
    """Remove EVERY plan binding the shell may carry (.env.local exports real
    test-mode ids into os.environ) so each test starts from a known set."""
    for env_var in plans.PLAN_ENV_VARS.values():
        monkeypatch.delenv(env_var, raising=False)


@pytest.fixture
def bound(monkeypatch):
    """Bind Plus and Pro — and ONLY Plus and Pro — for the duration of a test."""
    _clear_bindings(monkeypatch)
    monkeypatch.setenv("RAZORPAY_PLAN_PLUS_INR", "plan_plus")
    monkeypatch.setenv("RAZORPAY_PLAN_PRO_INR", "plan_pro")


def _provider_returning(amounts: dict[str, int], currency: str = "INR"):
    """Patch the provider so `verify_bindings` reads canned plan objects."""
    class FakeClient:
        class plan:  # noqa: N801 - mirrors the SDK's shape
            @staticmethod
            def fetch(plan_id):
                return {"item": {"amount": amounts[plan_id], "currency": currency}}

    class FakeProvider:
        def _client(self):
            return FakeClient()

    return FakeProvider


class TestPlanBindingCheck:
    def test_no_bindings_is_not_an_error(self, monkeypatch):
        """Checkout is simply unavailable. A billing-less deployment is a
        configuration this app supports, and `start_checkout` says so honestly
        at request time."""
        _clear_bindings(monkeypatch)
        _validate_plan_bindings()  # must not raise

    def test_matching_prices_pass(self, bound, monkeypatch):
        monkeypatch.setattr(
            "app.billing.providers.razorpay.provider.RazorpayProvider",
            _provider_returning({"plan_plus": 99_900, "plan_pro": 249_900}),
        )
        _validate_plan_bindings()  # must not raise

    def test_a_mismatch_is_fatal_in_production(self, bound, monkeypatch):
        """The customer would be charged something the page never showed."""
        monkeypatch.setattr(
            "app.billing.providers.razorpay.provider.RazorpayProvider",
            # Plus bound to a plan that charges ₹1,999, not ₹999.
            _provider_returning({"plan_plus": 199_900, "plan_pro": 249_900}),
        )
        monkeypatch.setattr("app.core.startup.settings.ENVIRONMENT", "production")
        with pytest.raises(StartupError, match="disagree with the published prices"):
            _validate_plan_bindings()

    def test_a_mismatch_is_loud_but_survivable_in_development(
        self, bound, monkeypatch, caplog
    ):
        monkeypatch.setattr(
            "app.billing.providers.razorpay.provider.RazorpayProvider",
            _provider_returning({"plan_plus": 199_900, "plan_pro": 249_900}),
        )
        monkeypatch.setattr("app.core.startup.settings.ENVIRONMENT", "development")
        with caplog.at_level("ERROR"):
            _validate_plan_bindings()
        assert "disagree" in caplog.text

    def test_a_wrong_currency_is_caught_too(self, bound, monkeypatch):
        """The amount can match while the currency does not — 99900 USD is not
        ₹999."""
        monkeypatch.setattr(
            "app.billing.providers.razorpay.provider.RazorpayProvider",
            _provider_returning({"plan_plus": 99_900, "plan_pro": 249_900}, currency="USD"),
        )
        monkeypatch.setattr("app.core.startup.settings.ENVIRONMENT", "production")
        with pytest.raises(StartupError):
            _validate_plan_bindings()

    def test_an_unreachable_gateway_does_not_take_the_service_down(
        self, bound, monkeypatch, caplog
    ):
        """Unknown is not the same as wrong. The check runs again next boot."""
        class Exploding:
            def _client(self):
                raise RuntimeError("connection refused")

        monkeypatch.setattr(
            "app.billing.providers.razorpay.provider.RazorpayProvider", Exploding
        )
        monkeypatch.setattr("app.core.startup.settings.ENVIRONMENT", "production")
        with caplog.at_level("WARNING"):
            _validate_plan_bindings()  # must not raise
        assert "UNVERIFIED" in caplog.text


class TestPublishedPrices:
    def test_the_published_figures_match_the_pricing_page(self):
        """These are the numbers `frontend/lib/pricing.ts` shows, in
        minor units. If the page changes, this must change with it — and then a
        NEW Razorpay plan must be created, because plans are immutable."""
        assert plans.PUBLISHED_PRICE["trial"].minor_units == 9_900
        assert plans.PUBLISHED_PRICE["trial_interview"].minor_units == 14_900
        assert plans.PUBLISHED_PRICE["plus"].minor_units == 99_900
        assert plans.PUBLISHED_PRICE["pro"].minor_units == 249_900
        assert all(p.currency == "INR" for p in plans.PUBLISHED_PRICE.values())

    def test_sellable_set_is_trials_plus_and_pro(self):
        """Free is not a purchase and Custom (enterprise) is contracted
        offline. The one-time trials sell through the gateway as single-cycle
        subscriptions."""
        assert sorted(plans.PLAN_ENV_VARS) == ["plus", "pro", "trial", "trial_interview"]

    def test_trials_are_single_cycle(self):
        """One charge, then `subscription.completed` → active. A trial that
        renewed monthly would be a subscription sold as a one-time purchase."""
        assert plans.cycles_for("trial") == 1
        assert plans.cycles_for("trial_interview") == 1
        assert plans.cycles_for("plus") == plans.SUBSCRIPTION_CYCLES
        assert plans.cycles_for("pro") == plans.SUBSCRIPTION_CYCLES
