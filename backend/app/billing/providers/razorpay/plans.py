"""
Razorpay plan bindings.

PLANS ARE IMMUTABLE AT RAZORPAY
-------------------------------
"Once a Plan is created, you cannot edit or delete it." A price change is
therefore a NEW plan object and a rebind here — never an edit. That is a
constraint worth knowing before someone tries to "just update the amount".

STRATEGY: BIND, DO NOT CREATE AT RUNTIME
----------------------------------------
Plans are created once — from the dashboard or a one-off bootstrap — and their
ids are supplied through the environment. The application binds to them; it
never creates one on the fly.

Creating plans lazily would be worse in a specific way: a typo, a race, or a
retried request produces a SECOND plan with the same intent and a different id,
and half the customers end up on a plan nobody knows exists. Binding fails
loudly at boot instead, which is the moment we can still fix it.

    RAZORPAY_PLAN_PLUS_INR   plan_xxxxxxxxxxxxxx
    RAZORPAY_PLAN_PRO_INR    plan_xxxxxxxxxxxxxx

THE AMOUNT IS DUPLICATED, ON PURPOSE
------------------------------------
`lib/pricing.ts` is what the customer is SHOWN; the Razorpay plan is what they
are CHARGED. Two systems that can drift. `verify_bindings()` asserts they agree
and is meant to run at boot, so a mismatch fails a deploy rather than a
customer's card.
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Optional

from app.billing.domain.errors import ProviderError, UnknownPlanBindingError
from app.billing.domain.models import Money

#: Billing cycles requested when creating a subscription.
#:
#: Razorpay requires `total_count` — there is no unbounded subscription. 120
#: monthly cycles is ten years; a customer reaching it is renewed by the
#: reconciler (`subscription.completed` maps to `active`, never to an expiry).
#: A customer must never lose access because a counter we chose ran out.
SUBSCRIPTION_CYCLES = 120

#: Environment variable per plan, per currency. V1 sells in INR only.
PLAN_ENV_VARS: dict[str, str] = {
    "trial": "RAZORPAY_PLAN_TRIAL_INR",
    "trial_interview": "RAZORPAY_PLAN_TRIAL_INTERVIEW_INR",
    "plus": "RAZORPAY_PLAN_PLUS_INR",
    "pro": "RAZORPAY_PLAN_PRO_INR",
}

#: What the pricing page publishes, in minor units. The single source of truth
#: for the customer-facing figure is `frontend/lib/pricing.ts`;
#: this is the copy the boot check compares the gateway against.
#: GST-INCLUSIVE: the advertised price IS the amount charged.
PUBLISHED_PRICE: dict[str, Money] = {
    "trial": Money(9_900, "INR"),             # ₹99, one-time
    "trial_interview": Money(14_900, "INR"),  # ₹149, one-time
    "plus": Money(99_900, "INR"),    # ₹999
    "pro": Money(249_900, "INR"),    # ₹2,499
}

#: Billing cycles per plan. The paid trials are ONE-TIME purchases expressed in
#: the only vocabulary Razorpay Subscriptions has: a single-cycle subscription.
#: One cycle charges once and then reports `subscription.completed`, which maps
#: to `active` — the customer keeps the trial's (lifetime-windowed) credits and
#: is never charged again. Everything else runs the standard 120 cycles.
PLAN_CYCLES: dict[str, int] = {
    "trial": 1,
    "trial_interview": 1,
}


def cycles_for(plan: str) -> int:
    return PLAN_CYCLES.get(plan, SUBSCRIPTION_CYCLES)


@dataclass(frozen=True)
class PlanBinding:
    plan: str
    razorpay_plan_id: str
    amount: Money


def binding_for(plan: str) -> PlanBinding:
    """The Razorpay plan bound to one of our catalog plans.

    A missing binding is a hard error with no fallback. The tempting default —
    treat an unbound plan as Free — silently downgrades a paying customer, and
    refusing is the kinder failure because it pages us instead of them.
    """
    env_var = PLAN_ENV_VARS.get(plan)
    if env_var is None:
        raise UnknownPlanBindingError(
            "razorpay",
            f"plan {plan!r} is not sold through Razorpay "
            f"(sellable: {sorted(PLAN_ENV_VARS)})",
        )
    plan_id = os.environ.get(env_var, "").strip()
    if not plan_id:
        raise UnknownPlanBindingError(
            "razorpay", f"{env_var} is not set — cannot bind plan {plan!r}"
        )
    return PlanBinding(plan=plan, razorpay_plan_id=plan_id, amount=PUBLISHED_PRICE[plan])


def plan_for_razorpay_id(razorpay_plan_id: str) -> str:
    """Reverse lookup, for incoming webhooks.

    An unrecognised plan id means someone created a plan in the dashboard that
    the code does not know about. Refusing to process the event is deliberate:
    a webhook naming an unknown plan must not be allowed to change anybody's
    entitlement.
    """
    for plan, env_var in PLAN_ENV_VARS.items():
        if os.environ.get(env_var, "").strip() == razorpay_plan_id:
            return plan
    raise UnknownPlanBindingError(
        "razorpay",
        f"no plan bound to {razorpay_plan_id!r}; refusing to guess",
    )


def configured_plans() -> dict[str, str]:
    """Bindings currently present in the environment. Never raises."""
    return {
        plan: os.environ[env_var].strip()
        for plan, env_var in PLAN_ENV_VARS.items()
        if os.environ.get(env_var, "").strip()
    }


def verify_bindings(fetch_plan) -> list[str]:
    """Assert every bound Razorpay plan charges what the page advertises.

    `fetch_plan(plan_id) -> dict` is injected so this is testable without a
    network. Returns a list of problems; empty means the gateway and the
    pricing page agree.

    Intended for boot. A mismatch between what a customer is shown and what
    they are charged is the single worst defect this integration can have, and
    it should fail a deploy rather than a card.
    """
    problems: list[str] = []
    for plan, plan_id in configured_plans().items():
        expected = PUBLISHED_PRICE[plan]
        try:
            remote = fetch_plan(plan_id) or {}
        except Exception as exc:  # noqa: BLE001 - report, do not crash boot
            problems.append(f"{plan}: could not fetch {plan_id}: {exc}")
            continue

        item = remote.get("item") or {}
        amount = item.get("amount")
        currency = (item.get("currency") or "").upper()
        if amount is None:
            problems.append(f"{plan}: plan {plan_id} returned no amount")
            continue
        if int(amount) != expected.minor_units or currency != expected.currency:
            problems.append(
                f"{plan}: gateway charges {currency} {amount} but the page "
                f"advertises {expected.currency} {expected.minor_units} "
                f"(plan {plan_id})"
            )
    return problems
