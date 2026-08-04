"""
The billing lifecycle.

Everything that turns a gateway event into a plan change lives here. The routes
above are thin; the adapter below is a translator; this is where the rules are.

THREE RULES THIS MODULE EXISTS TO ENFORCE
-----------------------------------------
1. **A webhook is a notification, not data.** Every handler re-fetches the
   subscription from the gateway API before deciding anything. Razorpay does not
   guarantee ordering, redelivery is normal, and the payload is a snapshot from
   emit time. One extra API call buys correctness that ordering logic would
   otherwise have to earn — and would earn wrongly.
2. **A browser callback grants nothing.** `verify_client_callback` confirms the
   customer finished the flow so the UI can say so. Only a webhook changes a
   plan. Treating the callback as authorization is the most common bug in this
   shape and it fails in both directions: a customer who closes the tab after
   paying never gets their plan, and anyone who can forge a redirect gets one
   free.
3. **Founding organizations are never billed.** Checkout refuses them and the
   webhook path never writes `plan_ruleset`. A grandfathered account that
   somehow acquired a gateway subscription is an integrity finding, not an
   instruction.
"""
from __future__ import annotations

import logging
from typing import Optional

from app.billing.domain import state_machine as machine
from app.billing.domain.errors import (
    BillingError,
    IllegalTransitionError,
    ProviderError,
)
from app.billing.domain.models import (
    BillingMode,
    BillingProviderId,
    BillingState,
    Money,
    Payment,
    Subscription,
)
from app.billing.domain.provider import (
    BillingProvider,
    CheckoutHandoff,
    ProviderSubscription,
    WebhookEnvelope,
)
from app.billing.repository import BillingRepository
from app.billing.providers.razorpay import events as rzp_events
from app.billing.providers.razorpay import mapping as rzp_mapping
from app.billing.providers.razorpay.provider import RazorpayProvider

logger = logging.getLogger("app.billing.service")

#: Plans that can be bought through a gateway.
#:
#: Enterprise is absent deliberately — it is quoted, contracted and invoiced
#: offline (`BillingMode.manual`), and Free is not a purchase. Deriving this
#: from the catalog would be wrong: the catalog says what a plan *includes*, not
#: whether it is sold self-serve.
SELLABLE_PLANS = ("plus", "pro")


class CheckoutRefused(BillingError):
    """Checkout may not start. Carries a reason a customer can act on."""

    def __init__(self, reason: str) -> None:
        super().__init__(reason)
        self.reason = reason


def get_provider() -> BillingProvider:
    """The configured gateway.

    A function rather than a module constant so tests can inject, and so
    importing this module does not require credentials. V1 has exactly one
    provider; a second is a reviewed addition, not a config lookup that silently
    picks a different gateway because an env var changed.
    """
    return RazorpayProvider()


class BillingService:
    """Checkout, webhooks, and the subscription lifecycle."""

    def __init__(
        self,
        provider: Optional[BillingProvider] = None,
        repository: Optional[BillingRepository] = None,
    ) -> None:
        self._provider = provider
        self._repo = repository

    @property
    def provider(self) -> BillingProvider:
        if self._provider is None:
            self._provider = get_provider()
        return self._provider

    @property
    def repo(self) -> BillingRepository:
        if self._repo is None:
            self._repo = BillingRepository()
        return self._repo

    # ── checkout ────────────────────────────────────────────────────────────

    def start_checkout(
        self,
        *,
        organization_id: str,
        plan: str,
        email: str,
        organization_name: str = "",
        currency: str = "INR",
    ) -> CheckoutHandoff:
        """Create a gateway subscription and hand the client off to Checkout.

        The subscription is created in a NOT-YET-AUTHORIZED state. The customer
        still has to authorize a mandate, which is a real transaction that can
        fail or be abandoned — `pending_activation` covers that gap and grants
        nothing. Access begins when the webhook says it does.
        """
        plan = (plan or "").strip().lower()
        if plan not in SELLABLE_PLANS:
            raise CheckoutRefused(
                f"{plan!r} is not sold self-serve "
                f"(available: {', '.join(SELLABLE_PLANS)})"
            )
        if currency.upper() != "INR":
            # The pricing page already routes non-INR visitors to sales, so
            # reaching here means the client was bypassed. Refuse rather than
            # create a subscription the gateway will price in a currency we did
            # not advertise.
            raise CheckoutRefused(
                f"payments in {currency.upper()} are not available yet — "
                "please contact us and we will set your account up directly"
            )

        current = self.repo.get_subscription(organization_id)

        if current and current.is_founding:
            # Rule 13. A founding organization already has every capability with
            # no limits; selling it a plan would take money for strictly less.
            raise CheckoutRefused(
                "this organization is on the founding plan and is not billed"
            )
        if current and current.plan == plan and current.grants_paid_access:
            raise CheckoutRefused(f"this organization is already on {plan}")

        # A PLAN CHANGE IS NOT A SECOND CHECKOUT, and treating it as one used to
        # raise `IllegalTransitionError` out of this method — an unhandled 500
        # for an existing Plus customer clicking "Upgrade to Pro", which both
        # the pricing page and Settings ▸ Billing offer them.
        #
        # `active -> pending_activation` is deliberately not a legal edge: an
        # organization with a working mandate is not re-authorizing one, it is
        # changing what it is billed. At Razorpay that is `subscription.update`,
        # it schedules at the cycle end (`supports_immediate_plan_change=False`),
        # and it needs its own state handling and its own tests.
        #
        # Until that exists, refuse in a way the customer can act on. A 409 with
        # a route is a worse experience than a working upgrade and a far better
        # one than a 500 — and every plan change goes through support today
        # anyway, so this describes what actually happens. See BILL-13.
        if current and current.grants_paid_access and current.is_gateway_billed:
            raise CheckoutRefused(
                f"this organization is already subscribed to {current.plan}. "
                "Changing plan isn't self-serve yet — contact us and we'll move "
                "you across, usually the same working day."
            )

        base = current or Subscription(
            organization_id=organization_id, plan="free", state=BillingState.free
        )

        customer_id = base.provider_customer_id or self.provider.ensure_customer(
            organization_id, email, organization_name
        )
        handoff = self.provider.start_subscription(organization_id, plan, currency)

        # Move to `pending_activation` and record the gateway ids BEFORE the
        # customer is handed off. If we recorded them after, a webhook arriving
        # while the modal is still open — which happens, mandates authorize
        # fast — could not be attributed to an organization, and
        # `find_by_provider_subscription` would return nothing.
        pending = self._to_pending(base, plan, customer_id, handoff.subscription_id)
        self.repo.save_subscription(pending)

        logger.info(
            "checkout started org=%s plan=%s subscription=%s",
            organization_id, plan, handoff.subscription_id,
        )
        return handoff

    def _to_pending(
        self,
        base: Subscription,
        plan: str,
        customer_id: str,
        subscription_id: Optional[str],
    ) -> Subscription:
        """Move to `pending_activation`, whatever the org was on before.

        `free -> pending_activation` is the ordinary path. `cancelled` and
        `suspended` also lead here, which is how resubscribing works: Razorpay
        cannot restart a cancelled subscription, so a returning customer gets a
        NEW gateway subscription and re-authorizes a mandate rather than us
        assuming the old one still works.

        `active -> pending_activation` is NOT a legal edge, and that is correct:
        an organization with a working subscription changing plan is a different
        operation, not a second checkout. `start_checkout` refuses that case
        before reaching here — it did not always, which is BILL-13.
        """
        changes = {
            "plan": plan,
            "billing_mode": BillingMode.provider,
            "provider": BillingProviderId.razorpay,
            "provider_customer_id": customer_id,
            "provider_subscription_id": subscription_id,
        }
        if base.state is BillingState.pending_activation:
            # Already mid-checkout — the customer abandoned the modal and came
            # back. `pending_activation -> pending_activation` is not in the
            # table (nothing has changed about their access), so update the ids
            # in place rather than forcing an illegal edge.
            from dataclasses import replace

            return replace(base, plan_version=base.plan_version + 1, **changes)
        return machine.transition(
            base,
            BillingState.pending_activation,
            reason="checkout started",
            **changes,
        )

    def verify_callback(self, payload: dict) -> bool:
        """Verify Razorpay's browser callback. **Grants nothing.**

        Returning True means "the customer completed the flow", so the UI can
        stop spinning and say so. The plan changes when the webhook arrives, and
        only then. See rule 2 in the module docstring.
        """
        return self.provider.verify_client_callback(payload)

    # ── cancellation ────────────────────────────────────────────────────────

    def cancel(self, *, organization_id: str, at_period_end: bool = True) -> Subscription:
        """Cancel at the gateway, then record it.

        `at_period_end=True` does not withdraw access: the customer paid for
        this period and keeps it. The state moves when the period actually ends
        and the gateway tells us so.

        The gateway is called FIRST. If it refuses, nothing local changed and
        the customer is still subscribed — which is the honest outcome. Writing
        our row first would leave us believing a subscription was cancelled
        while the gateway kept charging.
        """
        current = self.repo.get_subscription(organization_id)
        if current is None or not current.is_gateway_billed:
            raise CheckoutRefused("this organization has no gateway subscription")
        if current.is_founding:
            raise CheckoutRefused("founding organizations are not billed")
        if not current.provider_subscription_id:
            raise CheckoutRefused("no gateway subscription id on record")

        self.provider.cancel_subscription(
            current.provider_subscription_id, at_period_end=at_period_end
        )
        updated = machine.cancel(current, at_period_end=at_period_end)
        self.repo.save_subscription(updated)
        logger.info(
            "cancellation requested org=%s at_period_end=%s",
            organization_id, at_period_end,
        )
        return updated

    # ── webhooks ────────────────────────────────────────────────────────────

    def handle_webhook(self, raw_body: bytes, headers: dict) -> dict:
        """Verify, record, then process. In that order, always.

        Returns a small dict the route turns into a response body. Raises only
        when the gateway should retry.

        THE ORDER IS THE DESIGN:

        *Verify first* — an unverified body is a forgery attempt, not a customer
        with a bad network, and it must never reach storage looking genuine.

        *Record second* — the insert into `billing_events` IS the idempotency
        mechanism. `(provider, event_id)` is a composite primary key, so two
        concurrent deliveries cannot both proceed.

        *Process third* — and synchronously. See `_process` for why that is not
        the fire-and-forget the plan originally sketched.
        """
        envelope: WebhookEnvelope = self.provider.verify_webhook(raw_body, headers)
        if not envelope.verified:
            # Deliberately terminal. A forged webhook must not be retried into
            # existence, and must not be recorded as though it were real.
            raise ProviderError("razorpay", "webhook signature verification failed")

        event = rzp_events.to_billing_event(envelope)
        first_time = self.repo.record_event(event)

        if not first_time:
            existing = self.repo.get_event(event.provider, event.event_id) or {}
            if existing.get("status") in ("processed", "ignored"):
                # Already dealt with. This is the common redelivery case and it
                # is the system working, not an error.
                return {
                    "received": True,
                    "duplicate": True,
                    "status": existing.get("status"),
                }
            # Seen but NOT finished — a previous attempt failed partway. Fall
            # through and try again. Skipping here is the subtle bug that
            # "insert-then-ignore-duplicates" invites: the row exists, so every
            # retry looks like a duplicate, and an event that failed once is
            # never processed at all.
            logger.info(
                "reprocessing billing event %s (previous attempt did not finish)",
                event.event_id,
            )

        if event.status == "ignored":
            # Recorded, not acted on. `ignored` and `processed` stay distinct so
            # an investigation can tell "we chose not to" from "we did".
            logger.info(
                "billing event %s (%s) recorded and ignored: %s",
                event.event_id, event.event_type, rzp_events.describe(event.event_type),
            )
            return {"received": True, "handled": False, "status": "ignored"}

        return self._process(event.event_id, event.event_type, envelope.payload)

    def _process(self, event_id: str, event_type: str, payload: dict) -> dict:
        """Act on one handled event.

        SYNCHRONOUS, AND THAT IS A DEVIATION WORTH DEFENDING. The milestone plan
        said "return 200 fast, process asynchronously". Fire-and-forget breaks
        the only recovery mechanism this integration has: Razorpay retries a
        webhook until it receives a 2xx. If we 200 immediately and then fail in
        a background task, the gateway believes we succeeded, never retries, and
        the failure is invisible until a customer complains that they paid and
        got nothing.

        Processing inline costs one API round trip and keeps the retry
        semantics: a failure returns 5xx, Razorpay redelivers, and the
        not-yet-finished branch above picks it up. When a real job queue exists,
        this becomes an enqueue and the queue owns the retry — but a background
        task in the web process is not a queue.
        """
        subscription_id = rzp_events.subscription_id_from(payload)
        if not subscription_id:
            self.repo.mark_event(
                "razorpay", event_id, status="ignored",
                error="event carries no subscription id",
            )
            return {"received": True, "handled": False, "status": "ignored"}

        try:
            local = self._resolve_subscription(subscription_id, payload)
            if local is None:
                # Recorded but unattributable. Better kept than dropped: a
                # webhook we cannot map to an organization is exactly the thing
                # an operator needs to see, and `billing_events.organization_id`
                # is nullable for this reason.
                self.repo.mark_event(
                    "razorpay", event_id, status="failed",
                    error=f"no organization for subscription {subscription_id}",
                )
                logger.error(
                    "billing event %s references unknown subscription %s",
                    event_id, subscription_id,
                )
                return {"received": True, "handled": False, "status": "unattributed"}

            # RULE 1: the API is the truth, not the payload.
            remote = self.provider.fetch_subscription(subscription_id)
            updated = self._apply(local, remote, event_type=event_type)
            self._record_payment_if_any(updated.organization_id, payload)

            self.repo.mark_event(
                "razorpay", event_id, status="processed",
                organization_id=updated.organization_id,
            )
            return {
                "received": True,
                "handled": True,
                "status": "processed",
                "state": updated.state.value,
            }

        except IllegalTransitionError as exc:
            # The gateway asked for something the machine forbids. Recorded and
            # NOT retried — redelivering the same event will be refused
            # identically, so a 5xx here would loop forever. This needs a human.
            self.repo.mark_event(
                "razorpay", event_id, status="failed", error=str(exc)
            )
            logger.error("illegal transition from billing event %s: %s", event_id, exc)
            return {"received": True, "handled": False, "status": "rejected"}

        except Exception as exc:  # noqa: BLE001
            # Anything else — a gateway timeout, an unknown status, a database
            # blip — is potentially transient. Mark it and re-raise so the route
            # returns 5xx and Razorpay retries.
            self.repo.mark_event(
                "razorpay", event_id, status="failed", error=str(exc)
            )
            logger.exception("billing event %s failed", event_id)
            raise

    def _resolve_subscription(
        self, subscription_id: str, payload: dict
    ) -> Optional[Subscription]:
        """Find the organization this event belongs to.

        Two routes, in order of trustworthiness. The unique index on
        `billing_subscription_id` is the strong one — we wrote that id during
        checkout. The `notes.organization_id` fallback covers a subscription
        created outside this application (from the dashboard, or by a bootstrap
        script), which is rare but not impossible.
        """
        found = self.repo.find_by_provider_subscription(subscription_id)
        if found is not None:
            return found

        org_id = rzp_events.organization_id_from(payload)
        if not org_id:
            return None
        logger.warning(
            "subscription %s not on any row; falling back to notes.organization_id=%s",
            subscription_id, org_id,
        )
        return self.repo.get_subscription(org_id)

    def _apply(
        self,
        local: Subscription,
        remote: ProviderSubscription,
        *,
        event_type: str,
    ) -> Subscription:
        """Move the local subscription to match the gateway, through the machine.

        Never a direct assignment. Every change goes through a legal edge so an
        impossible sequence is refused loudly rather than written quietly.
        """
        if local.is_founding:
            # Rule 13, enforced on the ingress path as well as at checkout. A
            # founding org with a gateway subscription is an integrity finding —
            # `/health?check=billing` already reports it — and a webhook must
            # never be the thing that demotes a grandfathered customer.
            logger.error(
                "refusing to apply billing event to FOUNDING organization %s",
                local.organization_id,
            )
            raise BillingError(
                f"organization {local.organization_id} is founding and is not billed"
            )

        target = remote.state
        plan = remote.plan or local.plan

        if target is local.state and target is not BillingState.active:
            # Nothing changed. `active -> active` is excluded because it is a
            # real event — a renewal moves the period forward — and is the one
            # self-transition the machine allows.
            logger.info(
                "billing event %s left org %s in %s; no transition",
                event_type, local.organization_id, target.value,
            )
            return local

        updated = machine.transition(
            local,
            target,
            reason=f"gateway event {event_type}",
            plan=plan,
            current_period_start=remote.current_period_start,
            current_period_end=remote.current_period_end,
            cancel_at_period_end=remote.cancel_at_period_end,
            provider_customer_id=(
                remote.provider_customer_id or local.provider_customer_id
            ),
            provider_subscription_id=remote.provider_subscription_id,
            billing_mode=BillingMode.provider,
            provider=BillingProviderId.razorpay,
        )
        self.repo.save_subscription(updated)
        logger.info(
            "org %s %s -> %s (plan %s) via %s",
            local.organization_id, local.state.value, updated.state.value,
            updated.plan, event_type,
        )
        return updated

    def _record_payment_if_any(self, organization_id: str, payload: dict) -> None:
        """Store the charge that came with the event, if there was one.

        Evidence, not control flow. The subscription state has already been
        written by the time this runs, and a failure to record the payment must
        not fail the webhook — which is why the repository swallows its own
        errors.
        """
        entity = rzp_mapping.payment_entity(payload)
        if not entity or not entity.get("id"):
            return
        currency = (entity.get("currency") or "INR").upper()
        status = entity.get("status") or "created"
        captured = rzp_mapping.to_datetime(entity.get("created_at"))
        self.repo.record_payment(
            Payment(
                organization_id=organization_id,
                provider="razorpay",
                provider_payment_id=str(entity["id"]),
                amount=Money(int(entity.get("amount") or 0), currency),
                status=status,
                method=entity.get("method"),
                provider_subscription_id=rzp_events.subscription_id_from(payload),
                provider_invoice_id=entity.get("invoice_id"),
                captured_at=captured if status == "captured" else None,
                failed_at=captured if status == "failed" else None,
                failure_reason=entity.get("error_description"),
            ),
            raw=entity,
        )


__all__ = ["BillingService", "CheckoutRefused", "SELLABLE_PLANS", "get_provider"]
