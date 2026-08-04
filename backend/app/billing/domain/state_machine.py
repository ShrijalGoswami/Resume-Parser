"""
The subscription state machine.

Every legal transition is listed. Anything not listed raises
`IllegalTransitionError` — loudly, with both states named.

Why raise instead of ignore
---------------------------
The tempting alternative is to treat an unknown transition as a no-op and stay
put. That hides two different defects: a gateway sending something we did not
anticipate, and our own logic being wrong. Both end with a customer's access
decided by an accident nobody saw. A billing system that fails silently fails
in the customer's disfavour roughly half the time, and those are the halves
that cost accounts.

The rule the table encodes
--------------------------
**Failure states retain access.** `payment_failed` and `grace` both keep the
paid plan working. Dunning is a billing conversation, not a reason to lock a
hiring team out mid-week. Access is only withdrawn when the grace window
actually elapses (`grace -> suspended`), which is a deliberate, dated, single
edge — easy to find, easy to audit, easy to argue about.
"""
from __future__ import annotations

from dataclasses import replace
from datetime import datetime, timedelta, timezone
from typing import Iterable, Optional

from app.billing.domain.errors import IllegalTransitionError
from app.billing.domain.models import BillingMode, BillingState, Subscription

#: How long an organization keeps full access after a failed charge.
#: Approved 1 Aug 2026. `docs/BILLING_ARCHITECTURE.md` §9.
GRACE_PERIOD_DAYS = 7


#: Every legal edge. Read as: from -> {to, …}.
#:
#: Absences are as deliberate as the entries. There is no `suspended -> active`:
#: a suspended organization that pays again goes through activation, so a
#: mandate is re-established rather than assumed. There is no
#: `payment_failed -> suspended`: access is never withdrawn without the grace
#: window that was promised.
TRANSITIONS: dict[BillingState, frozenset[BillingState]] = {
    BillingState.free: frozenset({
        BillingState.pending_activation,  # checkout started
        BillingState.trialing,
        BillingState.active,              # manual (Enterprise) or instant grant
    }),
    BillingState.pending_activation: frozenset({
        BillingState.active,              # mandate authorized, first charge settled
        BillingState.trialing,
        BillingState.free,                # abandoned checkout
        BillingState.cancelled,
    }),
    BillingState.trialing: frozenset({
        BillingState.active,              # trial converted
        BillingState.payment_failed,      # conversion charge failed
        BillingState.cancelled,
        BillingState.free,                # trial lapsed without conversion
    }),
    BillingState.active: frozenset({
        BillingState.payment_failed,
        BillingState.cancelled,
        BillingState.active,              # renewal, plan change — see below
    }),
    BillingState.payment_failed: frozenset({
        BillingState.active,              # a retry succeeded
        BillingState.grace,               # gateway retries exhausted
        BillingState.cancelled,           # customer left mid-dunning
    }),
    BillingState.grace: frozenset({
        BillingState.active,              # recovered inside the window
        BillingState.suspended,           # window elapsed — the ONLY path to losing access
        BillingState.cancelled,
    }),
    BillingState.suspended: frozenset({
        BillingState.cancelled,           # closed out
        BillingState.pending_activation,  # resubscribing: re-authorize, never assume
    }),
    BillingState.cancelled: frozenset({
        BillingState.pending_activation,  # resubscribe through checkout
        BillingState.active,              # manual (Enterprise) reactivation
        BillingState.free,
    }),
}

#: `active -> active` is legal and is not a no-op: renewals and plan changes
#: both land here. It is listed explicitly so that "did we mean to allow this?"
#: has an answer in the table rather than in a reviewer's memory.
SELF_TRANSITIONS = frozenset({BillingState.active})


def can_transition(current: BillingState, target: BillingState) -> bool:
    return target in TRANSITIONS.get(current, frozenset())


def legal_targets(current: BillingState) -> frozenset[BillingState]:
    return TRANSITIONS.get(current, frozenset())


def assert_transition(current: BillingState, target: BillingState, reason: str = "") -> None:
    """Raise unless the edge exists. The guard every mutation goes through."""
    if not can_transition(current, target):
        raise IllegalTransitionError(current.value, target.value, reason)


def _now(at: Optional[datetime] = None) -> datetime:
    return at or datetime.now(timezone.utc)


def transition(
    subscription: Subscription,
    target: BillingState,
    *,
    at: Optional[datetime] = None,
    reason: str = "",
    **changes,
) -> Subscription:
    """Move a subscription, applying the side effects that belong to the edge.

    Returns a new `Subscription`; the input is never mutated, so a rejected
    transition cannot leave a half-updated object behind.

    The side effects are part of the transition rather than the caller's
    responsibility, because they are what makes the state meaningful — a
    `grace` with no `grace_period_ends_at` is a countdown with no deadline, and
    an `active` that keeps a stale `payment_failed_at` will re-enter dunning on
    the next sweep.
    """
    assert_transition(subscription.state, target, reason)
    now = _now(at)
    effects: dict = {}

    if target is BillingState.payment_failed:
        # Record when it failed and open the grace window from that moment. The
        # window is stored, not computed later, so every surface that asks
        # "how long do they have?" gets the same answer.
        effects["payment_failed_at"] = subscription.payment_failed_at or now
        effects["grace_period_ends_at"] = (
            subscription.grace_period_ends_at
            or now + timedelta(days=GRACE_PERIOD_DAYS)
        )

    elif target is BillingState.grace:
        # Retries exhausted. The deadline set at failure time stands — reaching
        # `grace` must not silently extend it, or a customer's access would
        # depend on how long the gateway happened to retry.
        effects["payment_failed_at"] = subscription.payment_failed_at or now
        effects["grace_period_ends_at"] = (
            subscription.grace_period_ends_at
            or now + timedelta(days=GRACE_PERIOD_DAYS)
        )

    elif target is BillingState.active:
        # Recovery clears the dunning marks. Leaving them set would re-trigger
        # the sweep and suspend an organization that has already paid.
        effects["payment_failed_at"] = None
        effects["grace_period_ends_at"] = None

    elif target in (BillingState.suspended, BillingState.cancelled, BillingState.free):
        effects["cancel_at_period_end"] = False
        if target is not BillingState.suspended:
            # A cancellation is not a payment failure. Clearing these keeps the
            # two distinguishable in the row: a suspended subscription still
            # carries the failure that caused it.
            effects["payment_failed_at"] = None
            effects["grace_period_ends_at"] = None

    effects.update(changes)
    # A plan change is what the client compares against a 402 to detect a stale
    # cached context, so every transition bumps it.
    effects["plan_version"] = subscription.plan_version + 1
    return replace(subscription, state=target, **effects)


# ── Named operations ────────────────────────────────────────────────────────
# Thin wrappers so call sites read as events rather than as state assignments.
# `activate(sub)` says what happened; `transition(sub, BillingState.active)`
# says what was written.


def start_checkout(subscription: Subscription, *, at: Optional[datetime] = None) -> Subscription:
    return transition(subscription, BillingState.pending_activation, at=at,
                      reason="checkout started")


def activate(
    subscription: Subscription,
    *,
    plan: Optional[str] = None,
    period_start: Optional[datetime] = None,
    period_end: Optional[datetime] = None,
    at: Optional[datetime] = None,
) -> Subscription:
    changes: dict = {}
    if plan is not None:
        changes["plan"] = plan
    if period_start is not None:
        changes["current_period_start"] = period_start
    if period_end is not None:
        changes["current_period_end"] = period_end
    return transition(subscription, BillingState.active, at=at,
                      reason="activated", **changes)


def record_payment_failure(subscription: Subscription, *,
                           at: Optional[datetime] = None) -> Subscription:
    return transition(subscription, BillingState.payment_failed, at=at,
                      reason="charge failed")


def enter_grace(subscription: Subscription, *, at: Optional[datetime] = None) -> Subscription:
    return transition(subscription, BillingState.grace, at=at,
                      reason="gateway retries exhausted")


def suspend(subscription: Subscription, *, at: Optional[datetime] = None) -> Subscription:
    """Withdraw access. The only edge that does, and only from `grace`."""
    return transition(subscription, BillingState.suspended, at=at,
                      reason="grace period elapsed")


def cancel(subscription: Subscription, *, at_period_end: bool = True,
           at: Optional[datetime] = None) -> Subscription:
    """Cancel.

    `at_period_end` does NOT change state — the customer paid for this period
    and keeps it. It sets a flag; the state moves only when the period actually
    ends. Ending access early would be taking away something already bought.
    """
    if at_period_end:
        return replace(
            subscription,
            cancel_at_period_end=True,
            plan_version=subscription.plan_version + 1,
        )
    return transition(subscription, BillingState.cancelled, at=at, reason="cancelled immediately")


def reactivate(subscription: Subscription, *, plan: Optional[str] = None,
               at: Optional[datetime] = None) -> Subscription:
    """Bring a cancelled subscription back.

    From `cancelled` this may go straight to `active` — that is the manual
    (Enterprise) path. From `suspended` the machine routes through
    `pending_activation` instead, because a suspension means a mandate stopped
    working and assuming it works again would charge nobody.
    """
    if subscription.state is BillingState.suspended:
        return transition(subscription, BillingState.pending_activation, at=at,
                          reason="resubscribing after suspension")
    changes = {"plan": plan} if plan else {}
    return transition(subscription, BillingState.active, at=at,
                      reason="reactivated", **changes)


# ── Manual (Enterprise) ─────────────────────────────────────────────────────


def manual_activate(
    subscription: Subscription,
    *,
    plan: str,
    activated_by: Optional[str] = None,
    at: Optional[datetime] = None,
) -> Subscription:
    """Activate an Enterprise plan with no gateway behind it.

    Enterprise never touches Razorpay: it is quoted, contracted and invoiced
    offline. This is the same state machine — the edge into `active` is checked
    exactly as it is for a gateway subscription — with `billing_mode = manual`
    and no provider ids.

    Attribution is required by `subscriptions_manual_attribution_chk`, because
    an Enterprise plan that appeared with no gateway record and no name attached
    is indistinguishable from a mistake.
    """
    return transition(
        subscription,
        BillingState.active,
        at=at,
        reason="manual activation",
        plan=plan,
        billing_mode=BillingMode.manual,
        provider=None,
        provider_customer_id=None,
        provider_subscription_id=None,
    )


def manual_deactivate(subscription: Subscription, *,
                      at: Optional[datetime] = None) -> Subscription:
    """End a manual Enterprise plan — contract lapsed or not renewed."""
    return transition(subscription, BillingState.cancelled, at=at,
                      reason="manual deactivation", billing_mode=BillingMode.none)


# ── Grace sweep ─────────────────────────────────────────────────────────────


def is_grace_expired(subscription: Subscription, *, at: Optional[datetime] = None) -> bool:
    if subscription.state not in (BillingState.payment_failed, BillingState.grace):
        return False
    if subscription.grace_period_ends_at is None:
        return False
    return _now(at) >= subscription.grace_period_ends_at


def due_for_suspension(subscriptions: Iterable[Subscription], *,
                       at: Optional[datetime] = None) -> list[Subscription]:
    """Subscriptions whose grace window has elapsed.

    The sweep this feeds is the only thing that withdraws access, so it is a
    pure query: it selects, and the caller decides. A function that both found
    and suspended would make "what would this do?" unanswerable without running
    it against production.
    """
    return [s for s in subscriptions if is_grace_expired(s, at=at)]


def expire_grace(subscription: Subscription, *, at: Optional[datetime] = None) -> Subscription:
    """Withdraw access from a subscription whose window has elapsed.

    Handles a case the transition table deliberately does not shortcut. The
    grace window opens at `payment_failed`, but `grace` means something more
    specific — the gateway has stopped retrying. A subscription can therefore
    reach its deadline while still in `payment_failed`, if the window runs out
    before the retries do.

    Rather than adding a `payment_failed -> suspended` edge, which would let
    access be withdrawn without ever passing through the state that represents
    the final warning, this walks the two legal edges in order. The invariant
    stays intact: **`grace -> suspended` is the only way to lose access**, and
    every suspension has a `grace` in its history.
    """
    if not is_grace_expired(subscription, at=at):
        raise IllegalTransitionError(
            subscription.state.value, BillingState.suspended.value,
            "grace period has not elapsed",
        )
    current = subscription
    if current.state is BillingState.payment_failed:
        current = enter_grace(current, at=at)
    return suspend(current, at=at)
