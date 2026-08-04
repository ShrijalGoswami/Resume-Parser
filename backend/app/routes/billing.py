"""
Billing routes — checkout, callback verification, cancellation, and the webhook.

Thin on purpose. Every rule lives in `app/billing/service.py`; these handlers
translate HTTP to it and back.

TWO DIFFERENT SECURITY MODELS IN ONE FILE
-----------------------------------------
`/billing/subscriptions` is authenticated, owner-only, organization-scoped —
the normal product posture.

`/billing/webhook/razorpay` is **unauthenticated by necessity**. Razorpay has no
session and cannot carry a bearer token; its identity is the HMAC signature over
the raw body, verified inside the adapter. That is the only thing standing
between this route and anyone on the internet, which is why the handler refuses
to do anything at all with an envelope whose `verified` is false, and why the
raw bytes must reach the verifier untouched.
"""
from __future__ import annotations

import logging
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, Field

from app.billing.domain.errors import BillingError, ProviderError
from app.billing.service import SELLABLE_PLANS, BillingService, CheckoutRefused
from app.enterprise.context import OrgContext
from app.enterprise.deps import OrgContextDep, require_permission
from app.enterprise.rbac import Permission
from app.enterprise.repositories import AuditRepository

logger = logging.getLogger("app.routes.billing")

router = APIRouter(prefix="/billing", tags=["Billing"])

#: Owner-only. `ORG_MANAGE` is already reserved to the owner role — spending the
#: organization's money is the same class of act as disposing of the account.
RequireOrgManage = Depends(require_permission(Permission.ORG_MANAGE))


def get_billing_service() -> BillingService:
    """Injectable so tests never construct a real gateway client."""
    return BillingService()


BillingServiceDep = Annotated[BillingService, Depends(get_billing_service)]


# ── request/response models ─────────────────────────────────────────────────


class CheckoutRequest(BaseModel):
    plan: str = Field(..., description=f"One of: {', '.join(SELLABLE_PLANS)}")
    currency: str = Field("INR", description="V1 settles INR only.")


class CheckoutResponse(BaseModel):
    """What the browser needs to open Razorpay Checkout.

    `public_key` is the publishable key id — safe in a response body. The key
    secret never leaves the server, and nothing here is sufficient to charge
    anyone.
    """

    provider: str
    kind: str
    subscription_id: Optional[str] = None
    redirect_url: Optional[str] = None
    public_key: Optional[str] = None
    amount_minor: Optional[int] = None
    currency: Optional[str] = None


class CallbackResponse(BaseModel):
    verified: bool
    #: Always false today, and the field exists to say so out loud. A verified
    #: callback means the customer finished the flow — it does NOT mean their
    #: plan changed. Only the webhook does that.
    plan_active: bool = False
    message: str


class CancelRequest(BaseModel):
    at_period_end: bool = True


class SubscriptionStateResponse(BaseModel):
    plan: str
    state: str
    cancel_at_period_end: bool
    current_period_end: Optional[str] = None


def _audit(ctx: OrgContext, action: str, **metadata) -> None:
    AuditRepository(ctx.organization_id).record(
        user_id=ctx.recruiter.id,
        user_email=ctx.recruiter.email,
        action=action,
        resource_type="billing",
        workspace_id=ctx.workspace_id,
        metadata=metadata,
    )


# ── checkout ────────────────────────────────────────────────────────────────


@router.post(
    "/subscriptions",
    response_model=CheckoutResponse,
    dependencies=[RequireOrgManage],
)
async def create_subscription(
    body: CheckoutRequest,
    ctx: OrgContextDep,
    service: BillingServiceDep,
):
    """Start a subscription and hand the browser to Checkout.

    Grants nothing. The returned handoff opens a modal in which the customer
    authorizes a mandate; the organization sits in `pending_activation` until a
    webhook says otherwise.
    """
    try:
        handoff = service.start_checkout(
            organization_id=ctx.organization_id,
            plan=body.plan,
            email=ctx.recruiter.email,
            organization_name=ctx.organization_name,
            currency=body.currency,
        )
    except CheckoutRefused as exc:
        # 409, not 400: the request is well-formed and the caller is authorized.
        # What is wrong is the organization's current state — already on the
        # plan, founding, or a currency we cannot settle.
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=exc.reason)
    except ProviderError as exc:
        logger.error("checkout failed for org %s: %s", ctx.organization_id, exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The payment provider could not start a subscription. "
                   "Nothing was charged. Please try again.",
        )

    _audit(ctx, "billing.checkout_started", plan=body.plan,
           subscription_id=handoff.subscription_id)

    return CheckoutResponse(
        provider=handoff.provider.value,
        kind=handoff.kind,
        subscription_id=handoff.subscription_id,
        redirect_url=handoff.redirect_url,
        public_key=handoff.public_key,
        amount_minor=handoff.amount.minor_units if handoff.amount else None,
        currency=handoff.amount.currency if handoff.amount else None,
    )


@router.post(
    "/subscriptions/verify",
    response_model=CallbackResponse,
    dependencies=[RequireOrgManage],
)
async def verify_callback(
    body: dict[str, str],
    ctx: OrgContextDep,
    service: BillingServiceDep,
):
    """Verify the gateway's browser callback so the UI can stop spinning.

    **This endpoint grants nothing and is not a security boundary for access.**
    It answers one question — did this customer really complete the flow — so
    the interface can show a confirmation instead of a spinner. The plan changes
    when the webhook arrives, which may be before or after this call.

    It is still authenticated and signature-checked, because an unverified
    "success" would let the UI tell a customer they had subscribed when they had
    not.

    THE BODY IS AN OPAQUE MAP, ON PURPOSE. It was briefly a typed model naming
    the gateway's own callback fields, and the architecture guard rejected it —
    correctly. Those field names are one gateway's vocabulary, and a route that
    spells them is a route that has to change when a second gateway arrives.
    The adapter already knows them (`verify_client_callback`), so the payload
    passes through untouched and this layer stays provider-agnostic.
    """
    verified = service.verify_callback(body)
    if verified:
        _audit(ctx, "billing.checkout_completed")
    return CallbackResponse(
        verified=verified,
        plan_active=False,
        message=(
            "Payment authorized. Your plan will be active within a few moments."
            if verified
            else "We could not verify that payment. If you were charged, contact us."
        ),
    )


@router.post(
    "/subscriptions/cancel",
    response_model=SubscriptionStateResponse,
    dependencies=[RequireOrgManage],
)
async def cancel_subscription(
    body: CancelRequest,
    ctx: OrgContextDep,
    service: BillingServiceDep,
):
    """Cancel at the gateway.

    POST rather than DELETE: with `at_period_end` this does not delete anything
    — the subscription keeps running until the period the customer paid for
    actually ends.
    """
    try:
        updated = service.cancel(
            organization_id=ctx.organization_id, at_period_end=body.at_period_end
        )
    except CheckoutRefused as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=exc.reason)
    except ProviderError as exc:
        logger.error("cancel failed for org %s: %s", ctx.organization_id, exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The payment provider could not cancel the subscription. "
                   "Nothing has changed. Please try again.",
        )

    _audit(ctx, "billing.cancellation_requested",
           at_period_end=body.at_period_end)

    return SubscriptionStateResponse(
        plan=updated.plan,
        state=updated.state.value,
        cancel_at_period_end=updated.cancel_at_period_end,
        current_period_end=(
            updated.current_period_end.isoformat()
            if updated.current_period_end else None
        ),
    )


# ── webhook ─────────────────────────────────────────────────────────────────


@router.post("/webhook/razorpay", include_in_schema=False)
async def razorpay_webhook(
    request: Request,
    response: Response,
    service: BillingServiceDep,
):
    """Receive a Razorpay webhook.

    UNAUTHENTICATED, and it has to be — Razorpay carries no session. Its
    identity is the HMAC signature over the raw body, and everything downstream
    refuses to act on an envelope that fails it.

    **`await request.body()` is load-bearing.** The signature is computed over
    the exact bytes Razorpay sent. Any middleware that parses and re-serialises
    JSON before this point changes them — key order, whitespace, unicode
    escaping — and the failure surfaces as "invalid signature", which sends you
    hunting for a credential problem that does not exist. Read raw, verify raw,
    parse afterwards.

    `include_in_schema=False`: this is not part of the product's API and
    publishing it in the OpenAPI document would invite calls to it.

    STATUS CODES ARE THE RETRY PROTOCOL. Razorpay redelivers until it gets a
    2xx, so:
      200 — recorded, and either processed, ignored or a duplicate. Done.
      400 — signature failed. Terminal on purpose: a forgery must not be
            retried into existence.
      500 — something transient broke. Please redeliver.
    """
    raw_body = await request.body()
    headers = {k.lower(): v for k, v in request.headers.items()}

    try:
        result = service.handle_webhook(raw_body, headers)
    except ProviderError as exc:
        # Signature failure, or an unparseable body. Both are terminal: no
        # amount of retrying makes a forged or malformed request valid.
        logger.warning("rejected razorpay webhook: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="invalid webhook"
        )
    except BillingError as exc:
        # A domain refusal — e.g. an event aimed at a founding organization.
        # Recorded already; retrying will be refused identically, so this must
        # NOT be a 5xx or the gateway will loop.
        logger.error("refused razorpay webhook: %s", exc)
        return {"received": True, "handled": False, "status": "refused"}
    except Exception:
        # Transient. Ask for redelivery — that is the only recovery mechanism
        # this integration has.
        logger.exception("razorpay webhook processing failed")
        response.status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
        return {"received": True, "handled": False, "status": "retry"}

    return result
