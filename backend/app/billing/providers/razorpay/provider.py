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

#: Razorpay's sentinel for "return the existing customer instead of erroring".
#:
#: A STRING, per the API reference. The SDK serialises the request body with
#: `json.dumps()` and no coercion, so an integer `0` reaches the API as JSON `0`
#: — not the documented value — and the endpoint reverts to its default of
#: refusing. That is a one-character defect that only ever fires for a returning
#: customer, which is why it survived to production.
FAIL_EXISTING_REUSE = "0"

#: How many customers to scan when resolving one by email. Razorpay has no
#: filter-by-email parameter on the list endpoint, so this is a bounded scan of
#: the most recent records rather than a query.
CUSTOMER_PAGE_SIZE = 100


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
        """Find or create the gateway customer. Idempotent, twice over.

        RAZORPAY KEYS CUSTOMER IDENTITY ON EMAIL, not on anything we choose. So
        the second organization created by the same person — a re-signup, a
        second workspace, a retry after a half-finished checkout — collides with
        a customer that already exists, and "create" is the wrong verb for what
        we actually want.

        WHY `fail_existing` IS A STRING
        -------------------------------
        `"0"` asks Razorpay to return the existing customer rather than erroring.
        The API reference types it as a STRING, and the SDK sends the body
        through `json.dumps()` verbatim (`client._update_request`) — so the
        integer `0` this used to pass went over the wire as JSON `0`, did not
        match the documented value, and the endpoint fell back to its default of
        erroring. The observed failure was exactly that:

            [razorpay] customer create failed: Customer already exists for the merchant

        THE FALLBACK IS NOT BELT-AND-BRACES, IT IS THE CONTRACT
        ------------------------------------------------------
        Correcting the type is necessary and not sufficient. `fail_existing`
        governs one gateway's behaviour on one endpoint; if it changes, or if a
        collision arrives by a route it does not cover, checkout breaks again
        for the same customers and in the same invisible way. So a failed create
        is followed by a lookup, and an existing customer is reused. The
        guarantee this method offers its caller — the same organization and
        email always resolve to the same customer id — is then true because THIS
        CODE makes it true, not because a flag held.

        TENANT SAFETY: NOTHING REMOTE IS EVER MUTATED
        ---------------------------------------------
        A found customer is read and its id returned. `customer.edit` is never
        called, so its `notes` — which may name a different organization, or a
        deleted one — are left exactly as they are. That is safe because webhook
        attribution never reads them: an event resolves through the
        SUBSCRIPTION's `notes.organization_id` and the unique index on
        `subscriptions.billing_subscription_id`, both of which we write per
        subscription. Two organizations sharing a payer identity therefore
        cannot mis-attribute each other's events, and neither can silently take
        the other's customer record away.
        """
        payload = {
            "name": name or organization_id,
            "email": email,
            # A STRING. See above — the SDK json-encodes this verbatim.
            "fail_existing": FAIL_EXISTING_REUSE,
            "notes": {"organization_id": organization_id},
        }
        try:
            customer = self._client().customer.create(payload)
        except Exception as exc:  # noqa: BLE001 - translate every SDK failure
            # A create can fail because the customer exists, or because the
            # gateway is unwell. Only the first is recoverable, and the only
            # honest way to tell them apart is to go and look: matching on the
            # error string alone would break the moment Razorpay rewords it.
            existing_id = self._find_customer_id_by_email(email)
            if existing_id:
                logger.info(
                    "razorpay customer already existed for this email; reusing %s "
                    "for organization %s (remote record left untouched)",
                    existing_id, organization_id,
                )
                return existing_id
            raise ProviderError("razorpay", f"customer create failed: {exc}") from exc

        customer_id = (customer or {}).get("id")
        if not customer_id:
            raise ProviderError("razorpay", "customer create returned no id")
        return customer_id

    def _find_customer_id_by_email(self, email: str) -> Optional[str]:
        """The customer Razorpay already holds for this email, if any.

        Returns None rather than raising: this runs on the recovery path of a
        failure that has already happened, and a lookup that throws would
        replace a useful error ("customer create failed: …") with a useless one
        about listing.

        Compared case-insensitively because an address is not case-sensitive in
        the half that matters, and a customer who signs up as `Sam@…` after
        `sam@…` is the same person to Razorpay's own uniqueness check.
        """
        if not email:
            return None
        wanted = email.strip().lower()
        try:
            response = self._client().customer.all({"count": CUSTOMER_PAGE_SIZE})
        except Exception as exc:  # noqa: BLE001 - diagnostic only, never fatal
            logger.warning("could not list razorpay customers to resolve %r: %s", wanted, exc)
            return None

        for item in (response or {}).get("items", []):
            if (item.get("email") or "").strip().lower() == wanted:
                notes = item.get("notes") or {}
                owner = notes.get("organization_id")
                if owner:
                    # Informational, and deliberately not a refusal. The record
                    # is not reassigned and its notes are not rewritten; only
                    # its id is borrowed, and attribution does not flow through
                    # it. Logged so "why do two organizations share a customer?"
                    # has an answer in the record rather than in someone's memory.
                    logger.warning(
                        "razorpay customer %s is annotated for organization %s; "
                        "reusing it by email without modifying it",
                        item.get("id"), owner,
                    )
                return item.get("id")
        return None

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
                # One cycle for the one-time trials, 120 for everything else.
                "total_count": plans.cycles_for(plan),
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

    def fetch_scheduled_change(self, provider_subscription_id: str) -> Optional[dict]:
        """The plan change already queued against this subscription, if any.

        `GET /v1/subscriptions/{id}/retrieve_scheduled_changes` — a READ, and the
        thing that makes scheduling idempotent. Razorpay holds at most one
        pending update per subscription, so asking before writing is what stops
        a customer who clicks twice from queueing two.

        Returns None when there is nothing scheduled. Razorpay answers a
        subscription with no pending update by erroring rather than returning an
        empty object, so a failure here is NOT treated as fatal — it means
        "nothing scheduled, or we could not tell", and the caller proceeds to
        schedule. Scheduling the same plan twice is harmless at the gateway
        (the second replaces the first); failing a customer's upgrade because a
        diagnostic read blipped would not be.
        """
        try:
            pending = self._client().subscription.pending_update(provider_subscription_id)
        except Exception as exc:  # noqa: BLE001 - "none scheduled" arrives as an error
            logger.info(
                "no scheduled change readable for %s (%s)", provider_subscription_id, exc
            )
            return None
        if not pending or not (pending.get("plan_id") or pending.get("id")):
            return None
        return pending

    def change_plan(
        self,
        provider_subscription_id: str,
        plan: str,
        *,
        at_cycle_end: bool = True,
    ) -> ProviderSubscription:
        """Move a LIVE subscription to a different plan, at cycle end.

        `PATCH /v1/subscriptions/{id}` via the SDK's `subscription.edit`. The
        existing subscription id is reused, so the customer, the mandate and the
        payment relationship are all preserved — this is not a second
        subscription and there is no second authorization.

        SCHEDULED, NOT IMMEDIATE, AND THAT IS A PRODUCT DECISION.
        `schedule_change_at="cycle_end"` means the customer keeps the plan they
        have paid for until the period they paid for ends, and is billed the new
        amount at the next renewal. **Nothing is charged today.** The
        alternative — `"now"` — raises a proration question this product has not
        answered (`BILLING_ARCHITECTURE.md` §17 Q4), and charging ₹2,499 while
        silently forfeiting the unused remainder of a ₹999 month is the kind of
        surprise that produces a chargeback rather than an upgrade.

        THE RETURNED SUBSCRIPTION IS STILL ON THE OLD PLAN, and that is correct.
        Razorpay reports the change as a PENDING update: `plan_id` still names
        Plus and `has_scheduled_changes` becomes true. So the caller writes no
        plan change today; `subscription.updated` at the cycle boundary is what
        eventually moves it, through the ordinary reconciliation path.

        Parameter names are Razorpay's documented Update Subscription contract.
        The SDK imposes none of its own — `client._update_request` json-encodes
        whatever dict it is handed — so these come from the API reference rather
        than from anything the SDK would validate.
        """
        self.capabilities.require("supports_plan_change")
        binding = plans.binding_for(plan)
        try:
            raw = self._client().subscription.edit(provider_subscription_id, {
                "plan_id": binding.razorpay_plan_id,
                # "cycle_end" defers to the end of the paid period. "now" would
                # be an immediate change and is deliberately not used.
                "schedule_change_at": "cycle_end" if at_cycle_end else "now",
                "customer_notify": 1,
            })
        except Exception as exc:  # noqa: BLE001
            raise ProviderError("razorpay", f"plan change failed: {exc}") from exc
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
            # `cancel_at_cycle_end` ONLY.
            #
            # This used to also treat `has_scheduled_changes` as a cancellation,
            # which was harmless while the only schedulable thing WAS a
            # cancellation. Scheduling a Plus -> Pro upgrade sets that same flag,
            # so the old reading would have told a customer who just upgraded
            # that their access ends on the renewal date — Settings renders the
            # period as "Access until" rather than "Renews" off this exact
            # field. An upgrade must never be displayed as a cancellation.
            cancel_at_period_end=bool(raw.get("cancel_at_cycle_end")),
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
