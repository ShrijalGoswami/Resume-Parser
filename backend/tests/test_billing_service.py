"""
The billing lifecycle — checkout, webhooks, and the state transitions between.

Everything here runs against fakes. No network, no credentials, no database:
the provider is a stub implementing the port, and the repository is a
dictionary. That is deliberate and it is the same property the domain tests
have — if this layer could only be tested against a live gateway, it could not
be tested at the moments that matter, which are the failures.

The cases worth reading first are the ones that encode a rule rather than a
mechanism:

  * `test_founding_organization_cannot_be_sold_a_plan` and its webhook twin
  * `test_failed_event_is_reprocessed_on_redelivery`
  * `test_payload_is_never_trusted_over_the_api`
  * `test_callback_verification_grants_no_access`
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from app.billing.domain.capabilities import ProviderCapabilities
from app.billing.domain.errors import BillingError, ProviderError
from app.billing.domain.models import (
    BillingEvent,
    BillingMode,
    BillingProviderId,
    BillingState,
    Money,
    Subscription,
)
from app.billing.domain.provider import (
    CheckoutHandoff,
    ProviderSubscription,
    WebhookEnvelope,
)
from app.billing.service import BillingService, CheckoutRefused

NOW = datetime(2026, 8, 4, 12, 0, tzinfo=timezone.utc)


# ── fakes ───────────────────────────────────────────────────────────────────


class FakeRepo:
    """The billing repository, backed by dictionaries."""

    def __init__(self):
        self.subs: dict[str, Subscription] = {}
        self.events: dict[tuple[str, str], dict] = {}
        self.payments: list = []
        self.saves: list[Subscription] = []

    def get_subscription(self, organization_id):
        return self.subs.get(organization_id)

    def find_by_provider_subscription(self, provider_subscription_id):
        for sub in self.subs.values():
            if sub.provider_subscription_id == provider_subscription_id:
                return sub
        return None

    def save_subscription(self, subscription):
        self.subs[subscription.organization_id] = subscription
        self.saves.append(subscription)

    def record_event(self, event: BillingEvent) -> bool:
        key = (event.provider, event.event_id)
        if key in self.events:
            return False
        self.events[key] = {
            "provider": event.provider,
            "event_id": event.event_id,
            "event_type": event.event_type,
            "status": event.status,
            "attempts": 0,
            "organization_id": event.organization_id,
            "error": None,
        }
        return True

    def get_event(self, provider, event_id):
        return self.events.get((provider, event_id))

    def mark_event(self, provider, event_id, *, status, error=None,
                   organization_id=None, attempts=None):
        row = self.events.setdefault((provider, event_id), {})
        row["status"] = status
        row["error"] = error
        if organization_id:
            row["organization_id"] = organization_id

    def record_payment(self, payment, *, raw=None):
        self.payments.append(payment)


class FakeProvider:
    """A `BillingProvider` that answers from memory."""

    id = BillingProviderId.razorpay
    capabilities = ProviderCapabilities(
        supports_pause=True, supports_resume=True, supports_proration=False,
        supports_customer_portal=False, supports_plan_change=True,
        supports_partial_refund=True, supports_gateway_reactivation=False,
        requires_total_count=True, supports_immediate_plan_change=False,
    )

    def __init__(self):
        self.remote: dict[str, ProviderSubscription] = {}
        self.envelope: WebhookEnvelope | None = None
        self.callback_ok = True
        self.created: list[tuple] = []
        self.cancelled: list[tuple] = []
        self.fetches = 0

    def ensure_customer(self, organization_id, email, name=""):
        return f"cust_{organization_id[:8]}"

    def start_subscription(self, organization_id, plan, currency):
        sub_id = f"sub_{plan}_{len(self.created)}"
        self.created.append((organization_id, plan, currency))
        return CheckoutHandoff(
            provider=self.id, kind="modal", subscription_id=sub_id,
            public_key="rzp_test_key", amount=Money(99_900, "INR"),
        )

    def fetch_subscription(self, provider_subscription_id):
        self.fetches += 1
        try:
            return self.remote[provider_subscription_id]
        except KeyError:
            raise ProviderError("razorpay", f"no such subscription {provider_subscription_id}")

    def cancel_subscription(self, provider_subscription_id, at_period_end=True):
        self.cancelled.append((provider_subscription_id, at_period_end))
        return self.remote.get(provider_subscription_id)

    def verify_webhook(self, raw_body, headers):
        assert isinstance(raw_body, (bytes, bytearray)), "raw bytes only"
        return self.envelope

    def verify_client_callback(self, payload):
        return self.callback_ok

    def list_invoices(self, provider_customer_id, limit=20):
        return []


def make_service():
    provider, repo = FakeProvider(), FakeRepo()
    return BillingService(provider=provider, repository=repo), provider, repo


def envelope(event_type, subscription_id="sub_1", *, event_id="evt_1",
             notes=None, payment=None, verified=True):
    payload = {
        "event": event_type,
        "payload": {
            "subscription": {
                "entity": {
                    "id": subscription_id,
                    "notes": notes or {},
                }
            }
        },
    }
    if payment:
        payload["payload"]["payment"] = {"entity": payment}
    return WebhookEnvelope(
        provider=BillingProviderId.razorpay, event_id=event_id,
        event_type=event_type, payload=payload, verified=verified,
    )


def remote_sub(state, sub_id="sub_1", plan="plus", **kw):
    return ProviderSubscription(
        provider=BillingProviderId.razorpay,
        provider_subscription_id=sub_id,
        provider_customer_id=kw.pop("customer", "cust_1"),
        plan=plan, state=state, **kw,
    )


def seed(repo, org="org_1", *, state=BillingState.free, plan="free", **kw):
    sub = Subscription(organization_id=org, plan=plan, state=state, **kw)
    repo.subs[org] = sub
    return sub


# ── checkout ────────────────────────────────────────────────────────────────


class TestCheckout:
    def test_creates_a_gateway_subscription_and_hands_off(self):
        service, provider, repo = make_service()
        seed(repo)
        handoff = service.start_checkout(
            organization_id="org_1", plan="plus", email="a@b.com"
        )
        assert handoff.subscription_id
        assert handoff.public_key == "rzp_test_key"
        assert provider.created == [("org_1", "plus", "INR")]

    def test_checkout_grants_nothing(self):
        """The mandate is not authorized yet — that is a real transaction that
        can fail or be abandoned."""
        service, _, repo = make_service()
        seed(repo)
        service.start_checkout(organization_id="org_1", plan="plus", email="a@b.com")
        saved = repo.subs["org_1"]
        assert saved.state is BillingState.pending_activation
        assert saved.grants_paid_access is False

    def test_gateway_ids_are_recorded_before_the_handoff_returns(self):
        """A webhook can arrive while the modal is still open — mandates
        authorize fast. If the ids were written afterwards, that event could not
        be attributed to any organization."""
        service, _, repo = make_service()
        seed(repo)
        handoff = service.start_checkout(
            organization_id="org_1", plan="plus", email="a@b.com"
        )
        assert repo.find_by_provider_subscription(handoff.subscription_id) is not None

    def test_founding_organization_cannot_be_sold_a_plan(self):
        """Rule 13. A founding org has every capability with no limits; selling
        it a plan takes money for strictly less than it already has."""
        service, _, repo = make_service()
        seed(repo, plan_ruleset="founding")
        with pytest.raises(CheckoutRefused, match="founding"):
            service.start_checkout(organization_id="org_1", plan="pro", email="a@b.com")

    def test_enterprise_is_not_sold_self_serve(self):
        service, _, repo = make_service()
        seed(repo)
        with pytest.raises(CheckoutRefused, match="not sold self-serve"):
            service.start_checkout(
                organization_id="org_1", plan="enterprise", email="a@b.com"
            )

    def test_free_is_not_a_purchase(self):
        service, _, repo = make_service()
        seed(repo)
        with pytest.raises(CheckoutRefused):
            service.start_checkout(organization_id="org_1", plan="free", email="a@b.com")

    def test_non_inr_is_refused_with_a_route_the_customer_can_take(self):
        """The pricing page already routes non-INR visitors to sales, so
        reaching here means the client was bypassed."""
        service, _, repo = make_service()
        seed(repo)
        with pytest.raises(CheckoutRefused, match="contact us"):
            service.start_checkout(
                organization_id="org_1", plan="plus", email="a@b.com", currency="USD"
            )

    def test_already_on_the_plan_is_refused(self):
        service, _, repo = make_service()
        seed(repo, state=BillingState.active, plan="pro")
        with pytest.raises(CheckoutRefused, match="already on pro"):
            service.start_checkout(organization_id="org_1", plan="pro", email="a@b.com")

    def test_changing_plan_is_refused_cleanly_not_with_a_500(self):
        """BILL-13. This used to raise `IllegalTransitionError` straight out of
        the service — an unhandled 500 for an existing Plus customer clicking
        the "Upgrade to Pro" that both the pricing page and Settings ▸ Billing
        show them.

        A plan change is `subscription.update` at the gateway, not a second
        checkout, and it is not built. Refusing with a route the customer can
        take is the honest interim.
        """
        service, _, repo = make_service()
        seed(repo, state=BillingState.active, plan="plus",
             billing_mode=BillingMode.provider, provider=BillingProviderId.razorpay,
             provider_subscription_id="sub_old")
        with pytest.raises(CheckoutRefused, match="contact us"):
            service.start_checkout(organization_id="org_1", plan="pro", email="a@b.com")

    def test_a_dunning_customer_cannot_start_a_second_subscription(self):
        """`payment_failed` and `grace` still grant paid access, so they are
        subscribed — a second checkout would leave two gateway subscriptions
        against one organization."""
        service, _, repo = make_service()
        seed(repo, state=BillingState.payment_failed, plan="plus",
             billing_mode=BillingMode.provider, provider=BillingProviderId.razorpay,
             provider_subscription_id="sub_old")
        with pytest.raises(CheckoutRefused):
            service.start_checkout(organization_id="org_1", plan="pro", email="a@b.com")

    def test_a_cancelled_customer_can_resubscribe(self):
        """Razorpay cannot restart a cancelled subscription, so a returning
        customer gets a NEW one and re-authorizes a mandate."""
        service, provider, repo = make_service()
        seed(repo, state=BillingState.cancelled, plan="plus",
             provider_subscription_id="sub_old")
        handoff = service.start_checkout(
            organization_id="org_1", plan="plus", email="a@b.com"
        )
        assert handoff.subscription_id != "sub_old"
        assert repo.subs["org_1"].state is BillingState.pending_activation

    def test_abandoned_checkout_can_be_restarted(self):
        """`pending_activation -> pending_activation` is not a legal edge — the
        customer's access has not changed — so the ids update in place rather
        than forcing an illegal transition."""
        service, _, repo = make_service()
        seed(repo, state=BillingState.pending_activation, plan="plus",
             provider_subscription_id="sub_abandoned")
        handoff = service.start_checkout(
            organization_id="org_1", plan="plus", email="a@b.com"
        )
        assert repo.subs["org_1"].provider_subscription_id == handoff.subscription_id
        assert repo.subs["org_1"].state is BillingState.pending_activation

    def test_an_existing_customer_id_is_reused(self):
        service, provider, repo = make_service()
        seed(repo, state=BillingState.cancelled, provider_customer_id="cust_existing")
        service.start_checkout(organization_id="org_1", plan="plus", email="a@b.com")
        assert repo.subs["org_1"].provider_customer_id == "cust_existing"


# ── the browser callback ────────────────────────────────────────────────────


class TestClientCallback:
    def test_callback_verification_grants_no_access(self):
        """RULE 2. The most common bug in this shape, and it fails in both
        directions: a customer who closes the tab never gets their plan, and
        anyone who can forge a redirect gets one free."""
        service, _, repo = make_service()
        seed(repo, state=BillingState.pending_activation, plan="plus")
        assert service.verify_callback({"razorpay_payment_id": "pay_1"}) is True
        # Nothing was written and nothing was granted.
        assert repo.saves == []
        assert repo.subs["org_1"].state is BillingState.pending_activation

    def test_a_forged_callback_is_reported_as_unverified(self):
        service, provider, _ = make_service()
        provider.callback_ok = False
        assert service.verify_callback({"razorpay_payment_id": "pay_1"}) is False


# ── webhooks: verification and idempotency ──────────────────────────────────


class TestWebhookVerification:
    def test_an_unverified_webhook_is_refused_and_never_stored(self):
        """A forgery attempt, not a customer with a bad network."""
        service, provider, repo = make_service()
        provider.envelope = envelope("subscription.activated", verified=False)
        with pytest.raises(ProviderError, match="signature"):
            service.handle_webhook(b"{}", {})
        assert repo.events == {}

    def test_signature_is_checked_over_raw_bytes(self):
        service, provider, repo = make_service()
        provider.envelope = envelope("subscription.updated")
        seed(repo, state=BillingState.active, plan="plus",
             provider_subscription_id="sub_1")
        provider.remote["sub_1"] = remote_sub(BillingState.active)
        # FakeProvider.verify_webhook asserts the type.
        service.handle_webhook(b'{"event":"x"}', {})


class TestIdempotency:
    def test_a_duplicate_delivery_is_not_processed_twice(self):
        service, provider, repo = make_service()
        seed(repo, state=BillingState.pending_activation, plan="plus",
             provider_subscription_id="sub_1")
        provider.remote["sub_1"] = remote_sub(BillingState.active)
        provider.envelope = envelope("subscription.activated")

        first = service.handle_webhook(b"{}", {})
        saves_after_first = len(repo.saves)
        second = service.handle_webhook(b"{}", {})

        assert first["status"] == "processed"
        assert second["duplicate"] is True
        assert len(repo.saves) == saves_after_first, "reprocessed a duplicate"

    def test_the_gateway_is_not_re_queried_for_a_duplicate(self):
        service, provider, repo = make_service()
        seed(repo, state=BillingState.pending_activation, plan="plus",
             provider_subscription_id="sub_1")
        provider.remote["sub_1"] = remote_sub(BillingState.active)
        provider.envelope = envelope("subscription.activated")

        service.handle_webhook(b"{}", {})
        fetches = provider.fetches
        service.handle_webhook(b"{}", {})
        assert provider.fetches == fetches

    def test_failed_event_is_reprocessed_on_redelivery(self):
        """THE SUBTLE BUG THIS GUARDS.

        "Insert, and skip on duplicate" looks correct and is not: an event whose
        first attempt failed has a row, so every redelivery looks like a
        duplicate and it is never processed at all. The customer paid and the
        plan never activates.
        """
        service, provider, repo = make_service()
        seed(repo, state=BillingState.pending_activation, plan="plus",
             provider_subscription_id="sub_1")
        provider.envelope = envelope("subscription.activated")
        # First delivery: the gateway read fails.
        with pytest.raises(ProviderError):
            service.handle_webhook(b"{}", {})
        assert repo.events[("razorpay", "evt_1")]["status"] == "failed"

        # Redelivery, and this time the gateway answers.
        provider.remote["sub_1"] = remote_sub(BillingState.active)
        result = service.handle_webhook(b"{}", {})
        assert result["status"] == "processed"
        assert repo.subs["org_1"].state is BillingState.active

    def test_distinct_events_are_both_processed(self):
        service, provider, repo = make_service()
        seed(repo, state=BillingState.pending_activation, plan="plus",
             provider_subscription_id="sub_1")
        provider.remote["sub_1"] = remote_sub(BillingState.active)

        provider.envelope = envelope("subscription.activated", event_id="evt_1")
        service.handle_webhook(b"{}", {})
        provider.remote["sub_1"] = remote_sub(BillingState.payment_failed)
        provider.envelope = envelope("subscription.pending", event_id="evt_2")
        service.handle_webhook(b"{}", {})

        assert repo.subs["org_1"].state is BillingState.payment_failed


# ── webhooks: the lifecycle ─────────────────────────────────────────────────


class TestLifecycle:
    def _activate(self, service, provider, repo):
        seed(repo, state=BillingState.pending_activation, plan="plus",
             provider_subscription_id="sub_1", billing_mode=BillingMode.provider,
             provider=BillingProviderId.razorpay)
        provider.remote["sub_1"] = remote_sub(BillingState.active)
        provider.envelope = envelope("subscription.activated")
        return service.handle_webhook(b"{}", {})

    def test_activation_grants_the_plan(self):
        service, provider, repo = make_service()
        self._activate(service, provider, repo)
        sub = repo.subs["org_1"]
        assert sub.state is BillingState.active
        assert sub.grants_paid_access is True
        assert sub.billing_mode is BillingMode.provider

    def test_the_webhook_is_what_grants_access(self):
        """Not checkout, not the callback."""
        service, provider, repo = make_service()
        seed(repo)
        service.start_checkout(organization_id="org_1", plan="plus", email="a@b.com")
        assert repo.subs["org_1"].grants_paid_access is False
        sub_id = repo.subs["org_1"].provider_subscription_id
        provider.remote[sub_id] = remote_sub(BillingState.active, sub_id=sub_id)
        provider.envelope = envelope("subscription.activated", sub_id)
        service.handle_webhook(b"{}", {})
        assert repo.subs["org_1"].grants_paid_access is True

    def test_a_failed_charge_retains_access(self):
        """Dunning is a billing conversation, not a reason to lock a hiring team
        out mid-week."""
        service, provider, repo = make_service()
        self._activate(service, provider, repo)
        provider.remote["sub_1"] = remote_sub(BillingState.payment_failed)
        provider.envelope = envelope("subscription.pending", event_id="evt_2")
        service.handle_webhook(b"{}", {})
        sub = repo.subs["org_1"]
        assert sub.state is BillingState.payment_failed
        assert sub.grants_paid_access is True
        assert sub.grace_period_ends_at is not None

    def test_exhausted_retries_enter_grace_and_still_retain_access(self):
        service, provider, repo = make_service()
        self._activate(service, provider, repo)
        provider.remote["sub_1"] = remote_sub(BillingState.payment_failed)
        provider.envelope = envelope("subscription.pending", event_id="evt_2")
        service.handle_webhook(b"{}", {})
        provider.remote["sub_1"] = remote_sub(BillingState.grace)
        provider.envelope = envelope("subscription.halted", event_id="evt_3")
        service.handle_webhook(b"{}", {})
        sub = repo.subs["org_1"]
        assert sub.state is BillingState.grace
        assert sub.grants_paid_access is True

    def test_recovery_clears_the_dunning_marks(self):
        """Leaving them set would re-trigger the sweep and suspend an
        organization that has already paid."""
        service, provider, repo = make_service()
        self._activate(service, provider, repo)
        provider.remote["sub_1"] = remote_sub(BillingState.payment_failed)
        provider.envelope = envelope("subscription.pending", event_id="evt_2")
        service.handle_webhook(b"{}", {})
        provider.remote["sub_1"] = remote_sub(BillingState.active)
        provider.envelope = envelope("subscription.charged", event_id="evt_3")
        service.handle_webhook(b"{}", {})
        sub = repo.subs["org_1"]
        assert sub.state is BillingState.active
        assert sub.payment_failed_at is None
        assert sub.grace_period_ends_at is None

    def test_a_renewal_moves_the_period_forward(self):
        """`active -> active` is a real event, not a no-op."""
        service, provider, repo = make_service()
        self._activate(service, provider, repo)
        end = NOW + timedelta(days=30)
        provider.remote["sub_1"] = remote_sub(
            BillingState.active, current_period_start=NOW, current_period_end=end
        )
        provider.envelope = envelope("subscription.charged", event_id="evt_2")
        service.handle_webhook(b"{}", {})
        assert repo.subs["org_1"].current_period_end == end

    def test_cancellation_resolves_to_no_paid_access(self):
        service, provider, repo = make_service()
        self._activate(service, provider, repo)
        provider.remote["sub_1"] = remote_sub(BillingState.cancelled)
        provider.envelope = envelope("subscription.cancelled", event_id="evt_2")
        service.handle_webhook(b"{}", {})
        assert repo.subs["org_1"].grants_paid_access is False

    def test_a_pause_is_not_a_payment_failure(self):
        """Razorpay maps `paused` to `active`: no dunning clock starts, because
        a paused customer is not in arrears."""
        service, provider, repo = make_service()
        self._activate(service, provider, repo)
        provider.remote["sub_1"] = remote_sub(BillingState.active)
        provider.envelope = envelope("subscription.paused", event_id="evt_2")
        service.handle_webhook(b"{}", {})
        sub = repo.subs["org_1"]
        assert sub.grants_paid_access is True
        assert sub.payment_failed_at is None

    def test_the_plan_follows_the_gateway(self):
        service, provider, repo = make_service()
        self._activate(service, provider, repo)
        provider.remote["sub_1"] = remote_sub(BillingState.active, plan="pro")
        provider.envelope = envelope("subscription.updated", event_id="evt_2")
        service.handle_webhook(b"{}", {})
        assert repo.subs["org_1"].plan == "pro"


# ── webhooks: what must never happen ────────────────────────────────────────


class TestWebhookGuards:
    def test_payload_is_never_trusted_over_the_api(self):
        """RULE 1. Razorpay does not guarantee ordering and the payload is a
        snapshot from emit time — so the payload here claims `cancelled` while
        the API says `active`, and the API must win."""
        service, provider, repo = make_service()
        seed(repo, state=BillingState.pending_activation, plan="plus",
             provider_subscription_id="sub_1")
        provider.remote["sub_1"] = remote_sub(BillingState.active)
        env = envelope("subscription.cancelled")
        env.payload["payload"]["subscription"]["entity"]["status"] = "cancelled"
        provider.envelope = env

        service.handle_webhook(b"{}", {})
        assert repo.subs["org_1"].state is BillingState.active
        assert provider.fetches == 1, "the API was not consulted"

    def test_a_founding_organization_is_never_demoted_by_a_webhook(self):
        """Rule 13 on the ingress path. A founding org with a gateway
        subscription is an integrity finding, not an instruction."""
        service, provider, repo = make_service()
        seed(repo, state=BillingState.active, plan="free",
             plan_ruleset="founding", provider_subscription_id="sub_1")
        provider.remote["sub_1"] = remote_sub(BillingState.cancelled)
        provider.envelope = envelope("subscription.cancelled")

        with pytest.raises(BillingError, match="founding"):
            service.handle_webhook(b"{}", {})
        assert repo.subs["org_1"].plan_ruleset == "founding"
        assert repo.saves == [], "a founding row was written"

    def test_plan_ruleset_is_never_written_by_billing(self):
        service, provider, repo = make_service()
        seed(repo, state=BillingState.pending_activation, plan="plus",
             provider_subscription_id="sub_1")
        provider.remote["sub_1"] = remote_sub(BillingState.active)
        provider.envelope = envelope("subscription.activated")
        service.handle_webhook(b"{}", {})
        assert all(s.plan_ruleset == "v1" for s in repo.saves)

    def test_an_unhandled_event_is_recorded_not_dropped(self):
        """"We never received it" and "we received it and did nothing" must stay
        distinguishable during an investigation."""
        service, provider, repo = make_service()
        provider.envelope = envelope("payment.failed", event_id="evt_x")
        result = service.handle_webhook(b"{}", {})
        assert result["status"] == "ignored"
        assert repo.events[("razorpay", "evt_x")]["status"] == "ignored"

    def test_an_unattributable_event_is_kept_for_a_human(self):
        service, provider, repo = make_service()
        provider.envelope = envelope("subscription.activated", "sub_unknown")
        result = service.handle_webhook(b"{}", {})
        assert result["status"] == "unattributed"
        assert repo.events[("razorpay", "evt_1")]["status"] == "failed"

    def test_an_event_with_no_subscription_is_ignored_not_failed(self):
        service, provider, repo = make_service()
        env = envelope("subscription.activated")
        env.payload["payload"]["subscription"]["entity"].pop("id")
        provider.envelope = env
        result = service.handle_webhook(b"{}", {})
        assert result["status"] == "ignored"

    def test_notes_are_the_fallback_when_the_id_is_unknown(self):
        """Covers a subscription created outside this application — from the
        dashboard, or by a bootstrap script."""
        service, provider, repo = make_service()
        seed(repo, state=BillingState.pending_activation, plan="plus")
        provider.remote["sub_new"] = remote_sub(BillingState.active, sub_id="sub_new")
        provider.envelope = envelope(
            "subscription.activated", "sub_new", notes={"organization_id": "org_1"}
        )
        result = service.handle_webhook(b"{}", {})
        assert result["status"] == "processed"
        assert repo.subs["org_1"].state is BillingState.active

    def test_an_illegal_transition_is_recorded_and_not_retried(self):
        """Redelivering it would be refused identically, so a 5xx would loop
        forever. This needs a human, not a retry."""
        service, provider, repo = make_service()
        # `free -> grace` is not a legal edge.
        seed(repo, state=BillingState.free, plan="plus",
             provider_subscription_id="sub_1")
        provider.remote["sub_1"] = remote_sub(BillingState.grace)
        provider.envelope = envelope("subscription.halted")
        result = service.handle_webhook(b"{}", {})
        assert result["status"] == "rejected"
        assert repo.events[("razorpay", "evt_1")]["status"] == "failed"

    def test_a_transient_failure_asks_for_redelivery(self):
        service, provider, repo = make_service()
        seed(repo, state=BillingState.pending_activation, plan="plus",
             provider_subscription_id="sub_1")
        provider.envelope = envelope("subscription.activated")
        # No remote entry — the gateway read raises.
        with pytest.raises(ProviderError):
            service.handle_webhook(b"{}", {})


# ── payments ────────────────────────────────────────────────────────────────


class TestPaymentRecording:
    def test_a_charge_is_recorded_alongside_the_subscription(self):
        service, provider, repo = make_service()
        seed(repo, state=BillingState.pending_activation, plan="plus",
             provider_subscription_id="sub_1")
        provider.remote["sub_1"] = remote_sub(BillingState.active)
        provider.envelope = envelope(
            "subscription.charged",
            payment={"id": "pay_1", "amount": 99_900, "currency": "INR",
                     "status": "captured", "method": "card"},
        )
        service.handle_webhook(b"{}", {})
        assert len(repo.payments) == 1
        assert repo.payments[0].amount == Money(99_900, "INR")

    def test_an_event_without_a_payment_records_none(self):
        service, provider, repo = make_service()
        seed(repo, state=BillingState.pending_activation, plan="plus",
             provider_subscription_id="sub_1")
        provider.remote["sub_1"] = remote_sub(BillingState.active)
        provider.envelope = envelope("subscription.activated")
        service.handle_webhook(b"{}", {})
        assert repo.payments == []


# ── cancellation ────────────────────────────────────────────────────────────


class TestCancellation:
    def test_cancel_at_period_end_keeps_access(self):
        """The customer paid for this period and keeps it."""
        service, provider, repo = make_service()
        seed(repo, state=BillingState.active, plan="plus",
             billing_mode=BillingMode.provider, provider=BillingProviderId.razorpay,
             provider_subscription_id="sub_1")
        updated = service.cancel(organization_id="org_1")
        assert updated.cancel_at_period_end is True
        assert updated.state is BillingState.active
        assert updated.grants_paid_access is True

    def test_the_gateway_is_called_before_the_row_is_written(self):
        """If the gateway refuses, nothing local changed and the customer is
        still subscribed — which is the honest outcome."""
        service, provider, repo = make_service()
        seed(repo, state=BillingState.active, plan="plus",
             billing_mode=BillingMode.provider, provider=BillingProviderId.razorpay,
             provider_subscription_id="sub_1")

        def refuse(sub_id, at_period_end=True):
            raise ProviderError("razorpay", "gateway down")

        provider.cancel_subscription = refuse
        with pytest.raises(ProviderError):
            service.cancel(organization_id="org_1")
        assert repo.saves == []

    def test_founding_is_never_cancelled(self):
        service, _, repo = make_service()
        seed(repo, state=BillingState.active, plan_ruleset="founding",
             billing_mode=BillingMode.provider, provider_subscription_id="sub_1")
        with pytest.raises(CheckoutRefused, match="founding"):
            service.cancel(organization_id="org_1")

    def test_an_org_with_no_gateway_subscription_is_refused(self):
        service, _, repo = make_service()
        seed(repo, state=BillingState.free)
        with pytest.raises(CheckoutRefused, match="no gateway subscription"):
            service.cancel(organization_id="org_1")
