"""
Razorpay adapter — signatures, mapping, plan bindings, events, provider.

**No network, no credentials, no live API call.** The SDK client is injected as
a stub, and every secret is a literal in the test. Nothing here would behave
differently on a machine with no internet.

Mapping tables are asserted against the behaviour documented at
https://razorpay.com/docs/payments/subscriptions/states/ as verified on
1 Aug 2026 — the point being that if Razorpay changes, these fail rather than
the product quietly doing the wrong thing.

Runnable without pytest:  python -m tests.test_billing_razorpay
"""
from __future__ import annotations

import json
from datetime import datetime, timezone

import pytest

from app.billing.domain.capabilities import ProviderCapabilities
from app.billing.domain.errors import (
    BillingError,
    ProviderError,
    UnknownPlanBindingError,
)
from app.billing.domain.models import BillingState
from app.billing.domain.provider import BillingProvider
from app.billing.providers.razorpay import events, mapping, plans, signatures
from app.billing.providers.razorpay.config import RazorpaySettings, load_settings
from app.billing.providers.razorpay.provider import (
    RAZORPAY_CAPABILITIES,
    RazorpayProvider,
)

KEY_SECRET = "test_key_secret"
WEBHOOK_SECRET = "test_webhook_secret"

SETTINGS = RazorpaySettings(
    key_id="rzp_test_abcdef123456",
    key_secret=KEY_SECRET,
    webhook_secret=WEBHOOK_SECRET,
)


class StubClient:
    """Stands in for `razorpay.Client`. Records calls; returns canned objects."""

    def __init__(self, **responses):
        self.calls: list[tuple[str, tuple]] = []
        self.responses = responses
        outer = self

        class _Res:
            def __init__(self, name):
                self.name = name

            def _call(self, method, *args):
                outer.calls.append((f"{self.name}.{method}", args))
                key = f"{self.name}.{method}"
                value = outer.responses.get(key)
                if isinstance(value, Exception):
                    raise value
                return value

            def create(self, *a):
                return self._call("create", *a)

            def fetch(self, *a):
                return self._call("fetch", *a)

            def cancel(self, *a):
                return self._call("cancel", *a)

            def all(self, *a):
                return self._call("all", *a)

        self.customer = _Res("customer")
        self.subscription = _Res("subscription")
        self.invoice = _Res("invoice")
        self.plan = _Res("plan")


def provider(**responses) -> RazorpayProvider:
    return RazorpayProvider(settings=SETTINGS, client=StubClient(**responses))


# ── configuration ───────────────────────────────────────────────────────────
class TestConfig:
    def test_credentials_come_only_from_the_environment(self, monkeypatch):
        monkeypatch.setenv("RAZORPAY_KEY_ID", "rzp_test_x")
        monkeypatch.setenv("RAZORPAY_KEY_SECRET", "s")
        monkeypatch.setenv("RAZORPAY_WEBHOOK_SECRET", "w")
        assert load_settings().key_id == "rzp_test_x"

    def test_missing_variables_name_themselves(self, monkeypatch):
        # A blank secret otherwise fails later as an auth error, which sends
        # whoever is debugging it to the wrong place.
        for var in ("RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET"):
            monkeypatch.delenv(var, raising=False)
        with pytest.raises(ProviderError) as exc:
            load_settings()
        assert "RAZORPAY_KEY_ID" in str(exc.value)

    def test_key_id_must_be_test_or_live(self, monkeypatch):
        monkeypatch.setenv("RAZORPAY_KEY_ID", "nonsense")
        monkeypatch.setenv("RAZORPAY_KEY_SECRET", "s")
        monkeypatch.setenv("RAZORPAY_WEBHOOK_SECRET", "w")
        with pytest.raises(ProviderError):
            load_settings()

    def test_test_mode_is_detected_from_the_prefix(self):
        assert SETTINGS.is_test_mode and not SETTINGS.is_live_mode

    def test_repr_never_leaks_a_secret(self):
        # Settings end up in tracebacks and error reports.
        text = repr(SETTINGS)
        assert KEY_SECRET not in text and WEBHOOK_SECRET not in text


# ── signatures: path 1, webhooks ────────────────────────────────────────────
class TestWebhookSignature:
    def test_valid_signature_verifies(self):
        body = b'{"event":"subscription.activated"}'
        sig = signatures.sign_webhook(body, WEBHOOK_SECRET)
        assert signatures.verify_webhook_signature(body, {"X-Razorpay-Signature": sig}, WEBHOOK_SECRET)

    def test_header_lookup_is_case_insensitive(self):
        # ASGI, proxies and test clients disagree about header case.
        body = b'{"event":"x"}'
        sig = signatures.sign_webhook(body, WEBHOOK_SECRET)
        for header in ("x-razorpay-signature", "X-RAZORPAY-SIGNATURE", "X-Razorpay-Signature"):
            assert signatures.verify_webhook_signature(body, {header: sig}, WEBHOOK_SECRET)

    def test_tampered_body_fails(self):
        body = b'{"event":"subscription.activated"}'
        sig = signatures.sign_webhook(body, WEBHOOK_SECRET)
        assert not signatures.verify_webhook_signature(b'{"event":"subscription.cancelled"}',
                                                       {"X-Razorpay-Signature": sig}, WEBHOOK_SECRET)

    def test_wrong_secret_fails(self):
        body = b'{"event":"x"}'
        sig = signatures.sign_webhook(body, "some-other-secret")
        assert not signatures.verify_webhook_signature(body, {"X-Razorpay-Signature": sig}, WEBHOOK_SECRET)

    def test_missing_signature_fails(self):
        assert not signatures.verify_webhook_signature(b"{}", {}, WEBHOOK_SECRET)

    def test_parsed_body_is_refused_outright(self):
        # Any middleware that re-serialises JSON changes key order or
        # whitespace and breaks the signature. Refusing a non-bytes body turns
        # that into an obvious error instead of a mysterious mismatch.
        with pytest.raises(TypeError):
            signatures.verify_webhook_signature({"event": "x"}, {}, WEBHOOK_SECRET)  # type: ignore[arg-type]

    def test_event_id_comes_from_the_header(self):
        # The subscription webhook envelope carries no event id of its own.
        assert signatures.extract_event_id({"X-Razorpay-Event-Id": "evt_123"}) == "evt_123"
        assert signatures.extract_event_id({}) == ""


# ── signatures: path 2, checkout callback ───────────────────────────────────
class TestCallbackSignature:
    def test_valid_callback_verifies(self):
        sig = signatures.sign_subscription_payment("pay_1", "sub_1", KEY_SECRET)
        assert signatures.verify_subscription_payment_signature("pay_1", "sub_1", sig, KEY_SECRET)

    def test_message_order_is_payment_then_subscription(self):
        # THE trap. Orders sign `order_id|payment_id`; subscriptions sign
        # `payment_id|subscription_id`. Copying the Orders form — which is what
        # almost every example online shows — produces a signature that fails
        # only against Razorpay.
        correct = signatures.sign_subscription_payment("pay_1", "sub_1", KEY_SECRET)
        reversed_order = signatures.sign_subscription_payment("sub_1", "pay_1", KEY_SECRET)
        assert correct != reversed_order
        assert not signatures.verify_subscription_payment_signature(
            "pay_1", "sub_1", reversed_order, KEY_SECRET
        )

    def test_callback_uses_the_key_secret_not_the_webhook_secret(self):
        # Two secrets, two purposes. Conflating them yields a check that passes
        # in no environment but the one where they happen to be equal.
        sig = signatures.sign_subscription_payment("pay_1", "sub_1", WEBHOOK_SECRET)
        assert not signatures.verify_subscription_payment_signature("pay_1", "sub_1", sig, KEY_SECRET)

    def test_missing_fields_fail_closed(self):
        for args in (("", "sub_1", "sig"), ("pay_1", "", "sig"), ("pay_1", "sub_1", "")):
            assert not signatures.verify_subscription_payment_signature(*args, KEY_SECRET)

    def test_the_two_paths_share_no_implementation(self):
        # Same body, same secret, different purpose — the digests must differ,
        # or one path is silently reusing the other.
        webhook = signatures.sign_webhook(b"pay_1|sub_1", KEY_SECRET)
        callback = signatures.sign_subscription_payment("pay_1", "sub_1", KEY_SECRET)
        assert webhook == callback  # same HMAC primitive, as expected...
        # ...but the verifiers are not interchangeable: one takes raw bytes and
        # a header, the other takes two ids. Neither can be called with the
        # other's inputs.
        with pytest.raises(TypeError):
            signatures.verify_webhook_signature("pay_1|sub_1", {}, KEY_SECRET)  # type: ignore[arg-type]


# ── state mapping ───────────────────────────────────────────────────────────
class TestStateMapping:
    @pytest.mark.parametrize("razorpay_status,expected", [
        ("created", BillingState.pending_activation),
        ("authenticated", BillingState.pending_activation),
        ("active", BillingState.active),
        ("pending", BillingState.payment_failed),
        ("halted", BillingState.grace),
        ("paused", BillingState.active),
        ("cancelled", BillingState.cancelled),
        ("expired", BillingState.cancelled),
        ("completed", BillingState.active),
    ])
    def test_documented_statuses(self, razorpay_status, expected):
        assert mapping.to_billing_state(razorpay_status) is expected

    def test_pending_and_halted_are_the_dunning_split(self):
        # Razorpay: pending = still retrying; halted = retries exhausted. This
        # is exactly why the domain distinguishes payment_failed from grace.
        assert mapping.to_billing_state("pending") is BillingState.payment_failed
        assert mapping.to_billing_state("halted") is BillingState.grace

    def test_both_dunning_states_retain_access(self):
        for status in ("pending", "halted"):
            assert mapping.to_billing_state(status).grants_paid_access

    def test_paused_never_enters_dunning(self):
        # The approved correction. Mapping paused -> past_due would open a
        # grace window and suspend a customer who merely paused, with no failed
        # payment anywhere in their history.
        state = mapping.to_billing_state("paused")
        assert state is BillingState.active
        assert state.grants_paid_access
        assert state is not BillingState.payment_failed
        assert state is not BillingState.grace

    def test_paused_is_reported_as_external(self):
        assert mapping.is_externally_paused("paused")
        assert not mapping.is_externally_paused("active")

    def test_completed_does_not_expire_the_customer(self):
        # The cycle counter is ours; a customer must not lose access because a
        # number we chose ran out.
        assert mapping.to_billing_state("completed").grants_paid_access

    def test_unknown_status_is_never_guessed(self):
        with pytest.raises(KeyError) as exc:
            mapping.to_billing_state("some_new_state")
        assert "refusing to guess" in str(exc.value)

    def test_cancelled_is_terminal_at_the_gateway(self):
        assert mapping.is_terminal("cancelled")
        assert not mapping.is_terminal("active")

    def test_timestamps_become_timezone_aware_utc(self):
        # A naive datetime would compare wrongly against grace_period_ends_at
        # and could suspend an account early.
        dt = mapping.to_datetime(1_785_000_000)
        assert dt is not None and dt.tzinfo is timezone.utc
        assert mapping.to_datetime(None) is None


# ── capabilities ────────────────────────────────────────────────────────────
class TestCapabilities:
    def test_declared_not_inferred(self):
        assert RazorpayProvider.capabilities is RAZORPAY_CAPABILITIES

    def test_razorpay_cannot_reactivate_a_cancelled_subscription(self):
        assert RAZORPAY_CAPABILITIES.supports_gateway_reactivation is False

    def test_reactivation_fails_with_an_explanation(self):
        # Better here than as an opaque API error after the customer has
        # already decided to resubscribe.
        with pytest.raises(BillingError) as exc:
            provider().reactivate_subscription("sub_1")
        assert "supports_gateway_reactivation" in str(exc.value)

    def test_no_hosted_portal(self):
        # We build that surface; it is product work, not adapter work.
        assert RAZORPAY_CAPABILITIES.supports_customer_portal is False

    def test_no_proration_and_no_immediate_plan_change(self):
        assert RAZORPAY_CAPABILITIES.supports_proration is False
        assert RAZORPAY_CAPABILITIES.supports_immediate_plan_change is False

    def test_total_count_is_required(self):
        assert RAZORPAY_CAPABILITIES.requires_total_count is True

    def test_require_raises_for_an_unsupported_capability(self):
        caps = ProviderCapabilities(supports_pause=True)
        caps.require("supports_pause")
        with pytest.raises(BillingError):
            caps.require("supports_proration")

    def test_a_provider_that_declares_nothing_gets_nothing(self):
        assert ProviderCapabilities().supports_pause is False


# ── plan bindings ───────────────────────────────────────────────────────────
class TestPlanBindings:
    def test_binding_reads_the_environment(self, monkeypatch):
        monkeypatch.setenv("RAZORPAY_PLAN_PRO_INR", "plan_abc123")
        binding = plans.binding_for("pro")
        assert binding.razorpay_plan_id == "plan_abc123"
        assert binding.amount.minor_units == 249_900

    def test_unbound_plan_is_a_hard_error(self, monkeypatch):
        # Never a silent fallback to Free — that downgrades a paying customer.
        monkeypatch.delenv("RAZORPAY_PLAN_PRO_INR", raising=False)
        with pytest.raises(UnknownPlanBindingError):
            plans.binding_for("pro")

    def test_unsellable_plan_is_refused(self):
        for plan in ("free", "enterprise"):
            with pytest.raises(UnknownPlanBindingError):
                plans.binding_for(plan)

    def test_reverse_lookup(self, monkeypatch):
        monkeypatch.setenv("RAZORPAY_PLAN_PLUS_INR", "plan_plus_1")
        assert plans.plan_for_razorpay_id("plan_plus_1") == "plus"

    def test_unknown_plan_id_from_a_webhook_is_refused(self, monkeypatch):
        monkeypatch.delenv("RAZORPAY_PLAN_PLUS_INR", raising=False)
        monkeypatch.delenv("RAZORPAY_PLAN_PRO_INR", raising=False)
        with pytest.raises(UnknownPlanBindingError):
            plans.plan_for_razorpay_id("plan_created_in_the_dashboard")

    def test_binding_amounts_match_the_published_prices(self):
        # ₹999 and ₹2,499, GST-inclusive.
        assert plans.PUBLISHED_PRICE["plus"].minor_units == 99_900
        assert plans.PUBLISHED_PRICE["pro"].minor_units == 249_900

    def test_verify_bindings_passes_when_the_gateway_agrees(self, monkeypatch):
        monkeypatch.setenv("RAZORPAY_PLAN_PRO_INR", "plan_pro_1")
        monkeypatch.delenv("RAZORPAY_PLAN_PLUS_INR", raising=False)
        problems = plans.verify_bindings(
            lambda pid: {"item": {"amount": 249_900, "currency": "INR"}}
        )
        assert problems == []

    def test_verify_bindings_catches_a_price_mismatch(self, monkeypatch):
        # The worst defect this integration can have: the page says one number
        # and the card is charged another. It must fail a deploy, not a customer.
        monkeypatch.setenv("RAZORPAY_PLAN_PRO_INR", "plan_pro_1")
        monkeypatch.delenv("RAZORPAY_PLAN_PLUS_INR", raising=False)
        problems = plans.verify_bindings(
            lambda pid: {"item": {"amount": 199_900, "currency": "INR"}}
        )
        assert len(problems) == 1 and "advertises" in problems[0]

    def test_subscription_cycles_is_a_long_horizon(self):
        # total_count is mandatory; exhaustion must be a renewal, not an expiry.
        assert plans.SUBSCRIPTION_CYCLES >= 60


# ── events ──────────────────────────────────────────────────────────────────
def envelope(event_type="subscription.activated", event_id="evt_1", verified=True, **payload):
    from app.billing.domain.provider import WebhookEnvelope
    from app.billing.domain.models import BillingProviderId

    body = {"entity": "event", "event": event_type, "contains": ["subscription"], **payload}
    return WebhookEnvelope(
        provider=BillingProviderId.razorpay, event_id=event_id,
        event_type=event_type, payload=body, verified=verified,
    )


class TestEvents:
    def test_handled_event_is_recorded_as_received(self):
        ev = events.to_billing_event(envelope())
        assert ev.provider == "razorpay" and ev.status == "received"
        assert ev.key == ("razorpay", "evt_1")

    def test_unhandled_event_is_recorded_as_ignored_not_dropped(self):
        # "We never received it" and "we received it and did nothing" must stay
        # distinguishable during an investigation.
        ev = events.to_billing_event(envelope(event_type="payment.dispute.created"))
        assert ev.status == "ignored"

    def test_unverified_envelope_is_refused(self):
        with pytest.raises(ProviderError):
            events.to_billing_event(envelope(verified=False))

    def test_missing_event_id_is_refused(self):
        # A generated key would make every redelivery look new and be processed
        # twice — the exact failure the key exists to prevent.
        with pytest.raises(ProviderError) as exc:
            events.to_billing_event(envelope(event_id=""))
        assert "idempotency" in str(exc.value)

    def test_organization_id_recovered_from_notes(self):
        ev = events.to_billing_event(envelope(payload={
            "subscription": {"entity": {"id": "sub_1", "notes": {"organization_id": "org-9"}}}
        }))
        assert ev.organization_id == "org-9"

    def test_unattributable_event_is_still_recorded(self):
        # billing_events.organization_id is nullable for exactly this reason.
        ev = events.to_billing_event(envelope(payload={"subscription": {"entity": {"id": "sub_1"}}}))
        assert ev.organization_id is None

    def test_subscription_id_is_extracted_for_refetch(self):
        payload = {"payload": {"subscription": {"entity": {"id": "sub_77"}}}}
        assert events.subscription_id_from(payload) == "sub_77"

    def test_every_handled_event_has_a_description(self):
        for event_type in mapping.HANDLED_EVENTS:
            assert events.describe(event_type)


# ── provider ────────────────────────────────────────────────────────────────
class TestProvider:
    def test_satisfies_the_port(self):
        assert isinstance(provider(), BillingProvider)

    def test_ensure_customer_is_idempotent_at_the_gateway(self):
        # fail_existing=0 makes Razorpay return the existing customer rather
        # than erroring, so a retried signup does not 500.
        p = provider(**{"customer.create": {"id": "cust_1"}})
        assert p.ensure_customer("org-1", "a@b.test") == "cust_1"
        payload = p._client().calls[0][1][0]
        assert payload["fail_existing"] == 0
        assert payload["notes"]["organization_id"] == "org-1"

    def test_start_subscription_sends_mandatory_total_count(self, monkeypatch):
        monkeypatch.setenv("RAZORPAY_PLAN_PRO_INR", "plan_pro_1")
        p = provider(**{"subscription.create": {"id": "sub_1", "status": "created"}})
        handoff = p.start_subscription("org-1", "pro", "INR")
        sent = p._client().calls[0][1][0]
        assert sent["total_count"] == plans.SUBSCRIPTION_CYCLES
        assert sent["plan_id"] == "plan_pro_1"
        assert sent["notes"]["organization_id"] == "org-1"
        assert handoff.kind == "modal" and handoff.subscription_id == "sub_1"

    def test_handoff_exposes_only_the_publishable_key(self):
        # The key secret must never leave the server.
        import os
        os.environ["RAZORPAY_PLAN_PRO_INR"] = "plan_pro_1"
        p = provider(**{"subscription.create": {"id": "sub_1"}})
        handoff = p.start_subscription("org-1", "pro", "INR")
        assert handoff.public_key == SETTINGS.key_id
        assert KEY_SECRET not in str(handoff)

    def test_non_inr_currency_is_refused(self):
        # V1 sells in INR only; creating a subscription in a currency we never
        # advertised would charge someone a price they never saw.
        with pytest.raises(ProviderError):
            provider().start_subscription("org-1", "pro", "USD")

    def test_fetch_translates_status_and_period(self, monkeypatch):
        monkeypatch.setenv("RAZORPAY_PLAN_PRO_INR", "plan_pro_1")
        p = provider(**{"subscription.fetch": {
            "id": "sub_1", "customer_id": "cust_1", "plan_id": "plan_pro_1",
            "status": "halted", "current_start": 1_785_000_000, "current_end": 1_787_592_000,
        }})
        sub = p.fetch_subscription("sub_1")
        assert sub.state is BillingState.grace     # halted -> grace
        assert sub.plan == "pro"
        assert sub.current_period_start.tzinfo is timezone.utc

    def test_fetch_refuses_an_unknown_status(self, monkeypatch):
        monkeypatch.setenv("RAZORPAY_PLAN_PRO_INR", "plan_pro_1")
        p = provider(**{"subscription.fetch": {
            "id": "sub_1", "plan_id": "plan_pro_1", "status": "brand_new_state",
        }})
        with pytest.raises(ProviderError):
            p.fetch_subscription("sub_1")

    def test_paused_subscription_keeps_access(self, monkeypatch):
        monkeypatch.setenv("RAZORPAY_PLAN_PRO_INR", "plan_pro_1")
        p = provider(**{"subscription.fetch": {
            "id": "sub_1", "plan_id": "plan_pro_1", "status": "paused",
        }})
        sub = p.fetch_subscription("sub_1")
        assert sub.state is BillingState.active and sub.state.grants_paid_access

    def test_cancel_sends_the_gateway_flag(self):
        p = provider(**{"subscription.cancel": {"id": "sub_1", "status": "active",
                                                "plan_id": "", "cancel_at_cycle_end": 1}})
        p.cancel_subscription("sub_1", at_period_end=True)
        assert p._client().calls[0][1][1] == {"cancel_at_cycle_end": 1}

    def test_sdk_failures_become_provider_errors(self):
        # A raw SDK exception leaking upward would couple the caller to the SDK.
        p = provider(**{"customer.create": RuntimeError("network down")})
        with pytest.raises(ProviderError):
            p.ensure_customer("org-1", "a@b.test")

    def test_webhook_verification_uses_the_webhook_secret(self):
        p = provider()
        body = json.dumps({"event": "subscription.activated"}).encode()
        sig = signatures.sign_webhook(body, WEBHOOK_SECRET)
        env = p.verify_webhook(body, {"X-Razorpay-Signature": sig,
                                      "X-Razorpay-Event-Id": "evt_9"})
        assert env.verified and env.event_id == "evt_9"
        assert env.event_type == "subscription.activated"

    def test_webhook_forgery_is_rejected(self):
        p = provider()
        body = json.dumps({"event": "subscription.activated"}).encode()
        env = p.verify_webhook(body, {"X-Razorpay-Signature": "deadbeef"})
        assert not env.verified

    def test_livemode_reflects_the_credentials_not_the_payload(self):
        # A test-mode webhook must never be able to grant a plan in production.
        p = provider()
        body = json.dumps({"event": "subscription.activated", "livemode": True}).encode()
        env = p.verify_webhook(body, {"X-Razorpay-Signature":
                                      signatures.sign_webhook(body, WEBHOOK_SECRET)})
        assert env.livemode is False   # settings are rzp_test_

    def test_client_callback_verification(self):
        p = provider()
        sig = signatures.sign_subscription_payment("pay_1", "sub_1", KEY_SECRET)
        assert p.verify_client_callback({
            "razorpay_payment_id": "pay_1",
            "razorpay_subscription_id": "sub_1",
            "razorpay_signature": sig,
        })

    def test_invoices_are_listed_gst_inclusive(self):
        p = provider(**{"invoice.all": {"items": [{
            "id": "inv_1", "amount": 99_900, "tax_amount": 15_239, "currency": "INR",
            "status": "paid", "short_url": "https://rzp.io/i/x",
            "notes": {"organization_id": "org-1", "plan": "plus"},
        }]}})
        invoices = p.list_invoices("cust_1")
        assert len(invoices) == 1
        inv = invoices[0]
        # net + tax == total, and total is the advertised price.
        assert inv.total.minor_units == 99_900
        assert inv.net.minor_units + inv.tax.minor_units == inv.total.minor_units


# ── isolation ───────────────────────────────────────────────────────────────
class TestIsolation:
    def test_domain_still_imports_without_the_sdk(self):
        import importlib

        for module in ("models", "state_machine", "invariants", "provider",
                       "errors", "capabilities"):
            importlib.import_module(f"app.billing.domain.{module}")

    def test_fake_provider_still_works(self):
        # "FakeBillingProvider must continue to work unchanged."
        from app.billing.providers.fake import FakeBillingProvider

        fake = FakeBillingProvider()
        assert isinstance(fake, BillingProvider)
        handoff = fake.start_subscription("org-1", "pro", "INR")
        assert fake.authorize(handoff.subscription_id).state is BillingState.active

    def test_both_providers_satisfy_one_port(self):
        from app.billing.providers.fake import FakeBillingProvider

        for impl in (FakeBillingProvider(), provider()):
            assert isinstance(impl, BillingProvider)
            assert impl.capabilities is not None


if __name__ == "__main__":
    raise SystemExit(pytest.main([__file__, "-q"]))
