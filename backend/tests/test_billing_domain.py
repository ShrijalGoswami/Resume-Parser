"""
Billing domain — models, state machine, provider port, fake provider.

Runs with **no Razorpay, no credentials and no network**. If any test here
needed a gateway, the abstraction in `domain/provider.py` would be decorative.

Runnable without pytest:  python -m tests.test_billing_domain
(from backend/, with the project venv active)
"""
from __future__ import annotations

import sys
from datetime import datetime, timedelta, timezone

import pytest

from app.billing.domain.errors import (
    IllegalTransitionError,
    MoneyError,
    UnknownPlanBindingError,
)
from app.billing.domain.models import (
    BillingMode,
    BillingProviderId,
    BillingState,
    BillingStatus,
    Invoice,
    Money,
    Payment,
    Subscription,
)
from app.billing.domain.provider import BillingProvider
from app.billing.domain import state_machine as sm
from app.billing.providers.fake import FakeBillingProvider

NOW = datetime(2026, 8, 1, 12, 0, tzinfo=timezone.utc)


def sub(state: BillingState = BillingState.free, **kw) -> Subscription:
    return Subscription(organization_id="org-1", plan="pro", state=state, **kw)


# ── Money ───────────────────────────────────────────────────────────────────
class TestMoney:
    def test_minor_units_only(self):
        assert Money(99900, "INR").minor_units == 99900

    def test_rejects_float(self):
        # The permanent project rule. A float amount is how 0.1 + 0.2 stops
        # summing and an invoice silently fails to balance.
        with pytest.raises(MoneyError):
            Money(999.0, "INR")  # type: ignore[arg-type]

    def test_rejects_bool(self):
        # bool is an int in Python; True would become 1 paise.
        with pytest.raises(MoneyError):
            Money(True, "INR")  # type: ignore[arg-type]

    def test_rejects_negative(self):
        with pytest.raises(MoneyError):
            Money(-1, "INR")

    def test_rejects_bad_currency(self):
        for bad in ("inr", "RUPEE", "", "IN"):
            with pytest.raises(MoneyError):
                Money(100, bad)

    def test_arithmetic_within_currency(self):
        assert (Money(84661, "INR") + Money(15239, "INR")).minor_units == 99900

    def test_refuses_to_mix_currencies(self):
        # Not an arithmetic problem — a category error. INR and USD are
        # independent market prices and are never convertible here.
        with pytest.raises(MoneyError):
            Money(999, "INR") + Money(19, "USD")


# ── State vocabulary ────────────────────────────────────────────────────────
class TestStateProjection:
    def test_every_state_projects_to_a_persisted_status(self):
        for state in BillingState:
            assert isinstance(state.to_status(), BillingStatus)

    def test_failure_states_persist_as_past_due(self):
        assert BillingState.payment_failed.to_status() is BillingStatus.past_due
        assert BillingState.grace.to_status() is BillingStatus.past_due

    def test_failure_states_retain_paid_access(self):
        # The single most important assertion in this file. Dunning is a
        # billing conversation, not a reason to lock a hiring team out.
        assert BillingState.payment_failed.grants_paid_access
        assert BillingState.grace.grants_paid_access

    def test_suspended_and_cancelled_lose_access_and_both_persist_as_canceled(self):
        for state in (BillingState.suspended, BillingState.cancelled):
            assert not state.grants_paid_access
            assert state.to_status() is BillingStatus.canceled

    def test_pending_activation_grants_nothing(self):
        # A mandate that has not been authorized has not been paid.
        assert not BillingState.pending_activation.grants_paid_access
        assert BillingState.pending_activation.to_status() is BillingStatus.incomplete

    def test_projection_never_invents_a_status(self):
        # The persisted vocabulary is pinned by a CHECK since 0016. The domain
        # maps into it and must never widen it.
        allowed = {"incomplete", "trialing", "active", "past_due", "canceled"}
        assert {s.to_status().value for s in BillingState} <= allowed


# ── State machine ───────────────────────────────────────────────────────────
class TestTransitions:
    def test_free_to_active_via_checkout(self):
        s = sm.start_checkout(sub(), at=NOW)
        assert s.state is BillingState.pending_activation
        s = sm.activate(s, at=NOW)
        assert s.state is BillingState.active

    def test_active_to_payment_failed_opens_a_dated_grace_window(self):
        s = sm.record_payment_failure(sub(BillingState.active), at=NOW)
        assert s.state is BillingState.payment_failed
        assert s.payment_failed_at == NOW
        assert s.grace_period_ends_at == NOW + timedelta(days=sm.GRACE_PERIOD_DAYS)
        assert s.grants_paid_access  # still working

    def test_payment_failed_to_grace_does_not_extend_the_deadline(self):
        # Otherwise access would depend on how long the gateway happened to retry.
        failed = sm.record_payment_failure(sub(BillingState.active), at=NOW)
        later = NOW + timedelta(days=3)
        graced = sm.enter_grace(failed, at=later)
        assert graced.grace_period_ends_at == failed.grace_period_ends_at

    def test_grace_to_active_clears_the_dunning_marks(self):
        s = sm.enter_grace(sm.record_payment_failure(sub(BillingState.active), at=NOW), at=NOW)
        s = sm.activate(s, at=NOW)
        assert s.state is BillingState.active
        # Left set, the sweep would suspend an organization that has paid.
        assert s.payment_failed_at is None
        assert s.grace_period_ends_at is None

    def test_grace_to_suspended(self):
        s = sm.enter_grace(sm.record_payment_failure(sub(BillingState.active), at=NOW), at=NOW)
        s = sm.suspend(s, at=NOW)
        assert s.state is BillingState.suspended
        assert not s.grants_paid_access

    def test_suspended_to_cancelled(self):
        s = sm.transition(sub(BillingState.suspended), BillingState.cancelled, at=NOW)
        assert s.state is BillingState.cancelled

    def test_cancelled_to_active_is_the_manual_path(self):
        s = sm.reactivate(sub(BillingState.cancelled), plan="pro", at=NOW)
        assert s.state is BillingState.active

    def test_suspended_reactivation_reauthorizes_rather_than_assuming(self):
        # A suspension means a mandate stopped working. Going straight to
        # active would grant access nobody can be charged for.
        s = sm.reactivate(sub(BillingState.suspended), at=NOW)
        assert s.state is BillingState.pending_activation

    def test_cancel_at_period_end_keeps_what_was_paid_for(self):
        s = sm.cancel(sub(BillingState.active), at_period_end=True)
        assert s.state is BillingState.active
        assert s.cancel_at_period_end
        assert s.grants_paid_access

    def test_cancel_immediately_ends_it(self):
        s = sm.cancel(sub(BillingState.active), at_period_end=False, at=NOW)
        assert s.state is BillingState.cancelled

    def test_every_transition_bumps_plan_version(self):
        # The client compares this against a 402 to spot a stale cached context.
        before = sub(BillingState.active)
        after = sm.record_payment_failure(before, at=NOW)
        assert after.plan_version == before.plan_version + 1

    def test_transitions_never_mutate_the_input(self):
        before = sub(BillingState.active)
        sm.record_payment_failure(before, at=NOW)
        assert before.state is BillingState.active


class TestIllegalTransitions:
    @pytest.mark.parametrize("current,target", [
        (BillingState.free, BillingState.suspended),
        (BillingState.free, BillingState.grace),
        (BillingState.active, BillingState.grace),        # must fail first
        (BillingState.active, BillingState.suspended),    # never without grace
        (BillingState.payment_failed, BillingState.suspended),  # window is promised
        (BillingState.suspended, BillingState.active),    # must re-authorize
        (BillingState.cancelled, BillingState.grace),
        (BillingState.trialing, BillingState.grace),
    ])
    def test_illegal_edges_raise(self, current, target):
        with pytest.raises(IllegalTransitionError):
            sm.transition(sub(current), target, at=NOW)

    def test_the_error_names_both_states(self):
        # An error that says only "invalid transition" makes an operator guess.
        with pytest.raises(IllegalTransitionError) as exc:
            sm.transition(sub(BillingState.active), BillingState.suspended, at=NOW)
        assert "active" in str(exc.value) and "suspended" in str(exc.value)

    def test_suspension_is_reachable_only_from_grace(self):
        sources = [s for s in BillingState if BillingState.suspended in sm.legal_targets(s)]
        assert sources == [BillingState.grace]


class TestGraceSweep:
    def test_not_expired_before_the_deadline(self):
        s = sm.record_payment_failure(sub(BillingState.active), at=NOW)
        assert not sm.is_grace_expired(s, at=NOW + timedelta(days=6))

    def test_expired_after_the_deadline(self):
        s = sm.record_payment_failure(sub(BillingState.active), at=NOW)
        assert sm.is_grace_expired(s, at=NOW + timedelta(days=7, seconds=1))

    def test_due_for_suspension_is_a_pure_query(self):
        healthy = sub(BillingState.active)
        failing = sm.record_payment_failure(sub(BillingState.active), at=NOW)
        due = sm.due_for_suspension([healthy, failing], at=NOW + timedelta(days=8))
        assert due == [failing]

    def test_expire_grace_walks_both_edges_from_payment_failed(self):
        # The window opens at payment_failed but `grace` means retries are
        # exhausted, so a deadline can arrive first. Access is still only lost
        # via grace -> suspended.
        s = sm.record_payment_failure(sub(BillingState.active), at=NOW)
        out = sm.expire_grace(s, at=NOW + timedelta(days=8))
        assert out.state is BillingState.suspended

    def test_expire_grace_refuses_early(self):
        s = sm.record_payment_failure(sub(BillingState.active), at=NOW)
        with pytest.raises(IllegalTransitionError):
            sm.expire_grace(s, at=NOW + timedelta(days=1))


class TestManualEnterprise:
    def test_manual_activation_sets_manual_mode_and_no_provider(self):
        s = sm.manual_activate(sub(BillingState.free), plan="enterprise", at=NOW)
        assert s.state is BillingState.active
        assert s.billing_mode is BillingMode.manual
        assert s.provider is None
        assert s.provider_subscription_id is None
        assert s.grants_paid_access

    def test_manual_enterprise_never_touches_a_gateway(self):
        s = sm.manual_activate(sub(BillingState.free), plan="enterprise", at=NOW)
        assert not s.is_gateway_billed

    def test_manual_deactivation_returns_to_no_billing_relationship(self):
        s = sm.manual_activate(sub(BillingState.free), plan="enterprise", at=NOW)
        s = sm.manual_deactivate(s, at=NOW)
        assert s.state is BillingState.cancelled
        assert s.billing_mode is BillingMode.none

    def test_manual_activation_obeys_the_same_transition_table(self):
        # Enterprise is not a bypass. free -> active is legal; grace -> active
        # from a state with no edge is not.
        with pytest.raises(IllegalTransitionError):
            sm.manual_activate(sub(BillingState.suspended), plan="enterprise", at=NOW)


# ── Invoices ────────────────────────────────────────────────────────────────
class TestInvoice:
    def test_gst_inclusive_invoice_balances(self):
        inv = Invoice(
            organization_id="org-1", provider="razorpay", provider_invoice_id="inv_1",
            plan="plus", total=Money(99900, "INR"), tax=Money(15239, "INR"),
            net=Money(84661, "INR"), tax_rate_bp=1800,
        )
        assert inv.total.minor_units == 99900

    def test_unbalanced_invoice_is_refused(self):
        # Same invariant the database enforces, checked where the object is
        # built so it fails with a domain error rather than three layers down.
        with pytest.raises(MoneyError):
            Invoice(
                organization_id="org-1", provider="razorpay", provider_invoice_id="inv_2",
                plan="plus", total=Money(99900, "INR"), tax=Money(15239, "INR"),
                net=Money(80000, "INR"),
            )

    def test_mixed_currency_invoice_is_refused(self):
        with pytest.raises(MoneyError):
            Invoice(
                organization_id="org-1", provider="razorpay", provider_invoice_id="inv_3",
                plan="plus", total=Money(99900, "INR"), tax=Money(0, "USD"),
                net=Money(99900, "INR"),
            )

    def test_manual_invoice_needs_no_gateway(self):
        inv = Invoice(
            organization_id="org-1", provider="manual", provider_invoice_id="ENT-2026-01",
            plan="enterprise", total=Money(5_000_000, "INR"), tax=Money(762_712, "INR"),
            net=Money(4_237_288, "INR"), tax_rate_bp=1800,
        )
        assert inv.provider == "manual"

    def test_refund_cannot_exceed_the_payment(self):
        with pytest.raises(MoneyError):
            Payment(
                organization_id="org-1", provider="razorpay", provider_payment_id="pay_1",
                amount=Money(100, "INR"), status="captured",
                refunded_amount=Money(500, "INR"),
            )


# ── Fake provider ───────────────────────────────────────────────────────────
class TestFakeProvider:
    def test_satisfies_the_port(self):
        assert isinstance(FakeBillingProvider(), BillingProvider)

    def test_ensure_customer_is_idempotent(self):
        # Calling twice must not create two customers and bill an organization
        # twice.
        p = FakeBillingProvider()
        assert p.ensure_customer("org-1", "a@b.test") == p.ensure_customer("org-1", "a@b.test")

    def test_start_subscription_begins_unauthorized(self):
        p = FakeBillingProvider()
        handoff = p.start_subscription("org-1", "pro", "INR")
        assert handoff.kind == "modal" and handoff.subscription_id
        assert p.fetch_subscription(handoff.subscription_id).state is BillingState.pending_activation

    def test_unknown_plan_is_a_hard_error(self):
        # Never a silent fallback to a cheaper plan.
        with pytest.raises(UnknownPlanBindingError):
            FakeBillingProvider().start_subscription("org-1", "platinum", "INR")

    def test_authorize_activates(self):
        p = FakeBillingProvider()
        h = p.start_subscription("org-1", "pro", "INR")
        assert p.authorize(h.subscription_id, now=NOW).state is BillingState.active

    def test_declined_mandate_lands_in_payment_failed(self):
        p = FakeBillingProvider()
        h = p.start_subscription("org-1", "pro", "INR")
        p.fail_next_charge()
        assert p.authorize(h.subscription_id, now=NOW).state is BillingState.payment_failed

    def test_exhausted_retries_land_in_grace(self):
        p = FakeBillingProvider()
        h = p.start_subscription("org-1", "pro", "INR")
        p.authorize(h.subscription_id, now=NOW)
        p.exhaust_retries()
        assert p.charge_fails(h.subscription_id).state is BillingState.grace

    def test_webhook_signature_is_verified(self):
        p = FakeBillingProvider()
        body, headers = p.signed_webhook("evt_1", "subscription.activated")
        assert p.verify_webhook(body, headers).verified

    def test_forged_signature_is_rejected(self):
        p = FakeBillingProvider()
        body, _ = p.signed_webhook("evt_1", "subscription.activated")
        assert not p.verify_webhook(body, {"x-fake-signature": "deadbeef"}).verified

    def test_tampered_body_is_rejected(self):
        p = FakeBillingProvider()
        body, headers = p.signed_webhook("evt_1", "subscription.activated")
        assert not p.verify_webhook(body.replace(b"evt_1", b"evt_2"), headers).verified

    def test_cancel_at_period_end_keeps_the_state(self):
        p = FakeBillingProvider()
        h = p.start_subscription("org-1", "pro", "INR")
        p.authorize(h.subscription_id, now=NOW)
        out = p.cancel_subscription(h.subscription_id, at_period_end=True)
        assert out.cancel_at_period_end and out.state is BillingState.active

    def test_full_lifecycle_without_a_gateway(self):
        # The point of Step 2: signup to suspension, no network involved.
        p = FakeBillingProvider()
        s = sub()
        h = p.start_subscription("org-1", "pro", "INR")
        s = sm.start_checkout(s, at=NOW)

        p.authorize(h.subscription_id, now=NOW)
        s = sm.activate(s, at=NOW)
        assert s.grants_paid_access

        s = sm.record_payment_failure(s, at=NOW)
        s = sm.enter_grace(s, at=NOW + timedelta(days=2))
        assert s.grants_paid_access  # still working through dunning

        s = sm.expire_grace(s, at=NOW + timedelta(days=8))
        assert s.state is BillingState.suspended and not s.grants_paid_access


# ── standalone runner ───────────────────────────────────────────────────────
if __name__ == "__main__":
    raise SystemExit(pytest.main([__file__, "-q"]))
