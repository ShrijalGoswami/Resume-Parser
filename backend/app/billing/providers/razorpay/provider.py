"""
`RazorpayProvider` — the only class in this codebase that talks to Razorpay.

Implements `BillingProvider`. Everything gateway-specific lives here or in its
sibling modules; the domain above never sees a Razorpay identifier, a Razorpay
status string, or the SDK.

The SDK is imported lazily, inside `_client()`. That keeps this module
importable — and most of it testable — with no `razorpay` package installed and
no credentials set, which is what lets the signature and mapping tests run
offline.
"""
from __future__ import annotations

import logging
from typing import Any, Mapping, Optional

from app.billing.domain.capabilities import ProviderCapabilities
from app.billing.domain.errors import ProviderError
from app.billing.domain.models import BillingProviderId, Invoice, Money
from app.billing.domain.provider import (
    CheckoutHandoff,
    ProviderSubscription,
    WebhookEnvelope,
)
from app.billing.providers.razorpay import mapping, plans, signatures
from app.billing.providers.razorpay.config import RazorpaySettings, load_settings

logger = logging.getLogger("app.billing.razorpay")


#: Declared, never inferred from the provider's name.
#:
#: `supports_gateway_reactivation=False` is the important one: Razorpay's
#: documentation is explicit that "once cancelled, a Subscription cannot be
#: restarted". Encoding it here means the domain asks a capability instead of
#: someone remembering a rule, and a resubscribe correctly creates a NEW
#: subscription rather than failing at the API after the customer has committed.
RAZORPAY_CAPABILITIES = ProviderCapabilities(
    supports_pause=True,                    # only from `active`
    supports_resume=True,                   # only from `paused`
    supports_proration=False,               # no Stripe-style proration
    supports_customer_portal=False,         # no hosted portal — we build that surface
    supports_plan_change=True,              # via subscription update
    supports_partial_refund=True,
    supports_gateway_reactivation=False,    # cancelled is TERMINAL
    requires_total_count=True,              # no unbounded subscription
    supports_immediate_plan_change=False,   # changes schedule at cycle end
)


class RazorpayProvider:
    """Razorpay Subscriptions, behind the `BillingProvider` port."""

    id = BillingProviderId.razorpay
    capabilities = RAZORPAY_CAPABILITIES

    def __init__(self, settings: Optional[RazorpaySettings] = None, client: Any = None) -> None:
        """`client` is injectable so every test runs against a stub.

        Not a convenience: it is what makes the adapter testable without a
        network, credentials, or the SDK installed.
        """
        self._settings = settings
        self._injected_client = client

    # ── plumbing ────────────────────────────────────────────────────────────

    @property
    def settings(self) -> RazorpaySettings:
        if self._settings is None:
            self._settings = load_settings()
        return self._settings

    def _client(self):
        if self._injected_client is not None:
            return self._injected_client
        try:
            import razorpay  # imported lazily: see the module docstring
        except ImportError as exc:  # pragma: no cover
            raise ProviderError("razorpay", "the razorpay SDK is not installed") from exc
        client = razorpay.Client(auth=(self.settings.key_id, self.settings.key_secret))
        self._injected_client = client
        return client

    @property
    def is_test_mode(self) -> bool:
        return self.settings.is_test_mode

    # ── BillingProvider ─────────────────────────────────────────────────────

    def ensure_customer(self, organization_id: str, email: str, name: str = "") -> str:
        """Find or create the gateway customer.

        `fail_existing=0` makes Razorpay return the existing customer instead of
        erroring when the email is already known — which is what makes this
        idempotent. Without it a retried signup raises, and a customer who
        double-clicked gets an error instead of a subscription.
        """
        try:
            customer = self._client().customer.create({
                "name": name or organization_id,
                "email": email,
                "fail_existing": 0,
                "notes": {"organization_id": organization_id},
            })
        except Exception as exc:  # noqa: BLE001 - translate every SDK failure
            raise ProviderError("razorpay", f"customer create failed: {exc}") from exc

        customer_id = (customer or {}).get("id")
        if not customer_id:
            raise ProviderError("razorpay", "customer create returned no id")
        return customer_id

    def start_subscription(self, organization_id: str, plan: str, currency: str) -> CheckoutHandoff:
        """Create a subscription in `created` and hand off to Checkout.

        The subscription is NOT active yet. The customer still has to authorize
        a mandate, which is a real transaction — `pending_activation` covers
        that gap and grants nothing.
        """
        if currency.upper() != "INR":
            # V1 sells in INR only. Refusing here is better than creating a
            # subscription the gateway will price in a currency we did not
            # advertise.
            raise ProviderError("razorpay", f"currency {currency!r} is not supported in V1")

        binding = plans.binding_for(plan)
        try:
            subscription = self._client().subscription.create({
                "plan_id": binding.razorpay_plan_id,
                # Mandatory at Razorpay — there is no unbounded subscription.
                "total_count": plans.SUBSCRIPTION_CYCLES,
                "customer_notify": 1,
                "quantity": 1,
                "notes": {"organization_id": organization_id, "plan": plan},
            })
        except Exception as exc:  # noqa: BLE001
            raise ProviderError("razorpay", f"subscription create failed: {exc}") from exc

        subscription_id = (subscription or {}).get("id")
        if not subscription_id:
            raise ProviderError("razorpay", "subscription create returned no id")

        return CheckoutHandoff(
            provider=self.id,
            kind="modal",                       # Razorpay Checkout is a JS modal
            subscription_id=subscription_id,
            public_key=self.settings.key_id,    # publishable; the secret never leaves the server
            amount=binding.amount,
        )

    def fetch_subscription(self, provider_subscription_id: str) -> ProviderSubscription:
        """Read current truth from the gateway.

        Called after every webhook rather than trusting the event payload:
        Razorpay does not guarantee ordering, redelivery is normal, and the
        payload is a snapshot at emit time.
        """
        try:
            raw = self._client().subscription.fetch(provider_subscription_id)
        except Exception as exc:  # noqa: BLE001
            raise ProviderError("razorpay", f"subscription fetch failed: {exc}") from exc
        return self._to_provider_subscription(raw)

    def cancel_subscription(self, provider_subscription_id: str,
                            at_period_end: bool = True) -> ProviderSubscription:
        """Cancel at the gateway.

        `cancel_at_cycle_end` is Razorpay's flag and takes 1/0, not a bool.
        """
        try:
            raw = self._client().subscription.cancel(
                provider_subscription_id,
                {"cancel_at_cycle_end": 1 if at_period_end else 0},
            )
        except Exception as exc:  # noqa: BLE001
            raise ProviderError("razorpay", f"subscription cancel failed: {exc}") from exc
        return self._to_provider_subscription(raw)

    def reactivate_subscription(self, provider_subscription_id: str) -> ProviderSubscription:
        """Deliberately unsupported.

        A cancelled Razorpay subscription is terminal — it cannot be restarted.
        Resubscribing must create a NEW subscription via `start_subscription`.
        This method exists only so the attempt fails here, with an explanation,
        rather than as an opaque API error after a customer has already decided
        to come back.
        """
        self.capabilities.require("supports_gateway_reactivation")
        raise ProviderError(  # pragma: no cover - unreachable; require() raises
            "razorpay", "unreachable: reactivation is not supported",
        )

    def verify_webhook(self, raw_body: bytes, headers: Mapping[str, str]) -> WebhookEnvelope:
        """Verify the signature and build an envelope. Never processes anything."""
        import json

        verified = signatures.verify_webhook_signature(
            raw_body, headers, self.settings.webhook_secret
        )
        try:
            payload = json.loads(raw_body.decode("utf-8")) if raw_body else {}
        except (ValueError, UnicodeDecodeError) as exc:
            raise ProviderError("razorpay", f"unparseable webhook body: {exc}") from exc

        # The event id is a HEADER. The subscription webhook envelope carries no
        # event id of its own, and `(provider, event_id)` is the idempotency key
        # for `billing_events` — reading it from the wrong place would make every
        # redelivery look like a new event.
        event_id = signatures.extract_event_id(headers)
        entity = mapping.subscription_entity(payload) or {}
        livemode = not self.settings.is_test_mode

        return WebhookEnvelope(
            provider=self.id,
            event_id=event_id,
            event_type=payload.get("event", ""),
            payload=payload,
            verified=verified,
            livemode=livemode,
        )

    def verify_client_callback(self, payload: Mapping[str, str]) -> bool:
        """Verify the Checkout callback. Grants nothing — see `signatures.py`."""
        return signatures.verify_subscription_payment_signature(
            payment_id=payload.get("razorpay_payment_id", ""),
            subscription_id=payload.get("razorpay_subscription_id", ""),
            signature=payload.get("razorpay_signature", ""),
            key_secret=self.settings.key_secret,
        )

    def list_invoices(self, provider_customer_id: str, limit: int = 20) -> list[Invoice]:
        """Invoices from the gateway.

        We list theirs rather than rendering our own: their document is the one
        a customer's finance team will recognise, and reproducing it would
        create two versions of a statutory record.
        """
        try:
            response = self._client().invoice.all({
                "customer_id": provider_customer_id, "count": limit,
            })
        except Exception as exc:  # noqa: BLE001
            raise ProviderError("razorpay", f"invoice list failed: {exc}") from exc
        return [self._to_invoice(item) for item in (response or {}).get("items", [])]

    # ── translation ─────────────────────────────────────────────────────────

    def _to_provider_subscription(self, raw: dict) -> ProviderSubscription:
        raw = raw or {}
        status = raw.get("status", "")
        try:
            state = mapping.to_billing_state(status)
        except KeyError as exc:
            # An unknown status is never guessed at. Failing the event pages us
            # instead of silently granting or revoking access.
            raise ProviderError("razorpay", str(exc)) from exc

        plan_id = raw.get("plan_id", "")
        plan = plans.plan_for_razorpay_id(plan_id) if plan_id else ""

        if mapping.is_externally_paused(status):
            # Informational, per the approved decision: a pause is not a
            # payment failure and must not enter dunning. V1 exposes no pause
            # API, so this can only have come from the dashboard.
            logger.info(
                "razorpay subscription %s is PAUSED at the gateway; access retained, "
                "no dunning started", raw.get("id"),
            )

        return ProviderSubscription(
            provider=self.id,
            provider_subscription_id=raw.get("id", ""),
            provider_customer_id=raw.get("customer_id", ""),
            plan=plan,
            state=state,
            current_period_start=mapping.to_datetime(raw.get("current_start")),
            current_period_end=mapping.to_datetime(raw.get("current_end")),
            cancel_at_period_end=bool(raw.get("cancel_at_cycle_end") or raw.get("has_scheduled_changes")),
            raw=raw,
        )

    def _to_invoice(self, raw: dict) -> Invoice:
        raw = raw or {}
        currency = (raw.get("currency") or "INR").upper()
        total = Money(int(raw.get("amount") or 0), currency)
        tax = Money(int(raw.get("tax_amount") or 0), currency)
        # GST-inclusive: the advertised price IS the total, so net is whatever
        # is left after the tax component — never total plus tax.
        net = Money(total.minor_units - tax.minor_units, currency)
        return Invoice(
            organization_id=(raw.get("notes") or {}).get("organization_id", ""),
            provider=self.id.value,
            provider_invoice_id=raw.get("id", ""),
            plan=(raw.get("notes") or {}).get("plan", ""),
            total=total,
            tax=tax,
            net=net,
            status=raw.get("status", "issued"),
            issued_at=mapping.to_datetime(raw.get("issued_at")),
            paid_at=mapping.to_datetime(raw.get("paid_at")),
            invoice_url=raw.get("short_url"),
        )
