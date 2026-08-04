"""
The grace sweep — the only thing in this product that withdraws paid access.

BILL-2. `state_machine.due_for_suspension()` and `expire_grace()` have existed
and been correct since Step 2, and nothing called them, so no organization was
ever suspended for non-payment and the grace period was effectively unbounded.

WHAT THIS IS ALLOWED TO DO, EXACTLY
-----------------------------------
Suspend an organization when **both** are true:

    billing_state == grace          the gateway has stopped retrying
    grace_period_ends_at <= now     the window we promised has elapsed

And nothing else. In particular it will not touch `active`, `payment_failed`,
`free`, `pending_activation`, `trialing`, `cancelled` or `suspended`.

`payment_failed` is the one worth explaining, because the state machine's own
`expire_grace()` would have handled it: a subscription can reach its deadline
while still in `payment_failed` if the window runs out before the gateway's
retries do. `expire_grace()` walks it through `grace` first and then suspends.

**This sweep deliberately does not.** `payment_failed` means the gateway is
still trying to take the money. Withdrawing access while a charge might still
succeed is us overruling the gateway on our own clock, and the standing rule is
to fail toward the customer keeping access. Such a subscription is reported as a
finding instead of being acted on — see `SweepResult.stalled`.

WHY IT NEEDS MIGRATION 0027
---------------------------
Before it, `payment_failed` and `grace` were the same persisted row. A sweep
running on that schema could not tell "the gateway gave up" from "the gateway is
still trying", and would have suspended both. It refuses to run rather than
guess.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional

from app.billing.domain import state_machine as machine
from app.billing.domain.models import BillingMode, BillingState, Subscription
from app.billing.repository import BillingRepository

logger = logging.getLogger("app.billing.grace")

#: `billing_state` values this sweep will act on. Exactly one, and it is a
#: frozenset rather than an `== grace` so that widening it is a visible,
#: reviewable edit rather than a character.
SUSPENDABLE_STATES = frozenset({BillingState.grace})


@dataclass(frozen=True)
class Skipped:
    """A candidate the sweep declined to suspend, and why.

    Kept rather than discarded: "we found nothing" and "we found four and
    refused all of them" are completely different operational situations, and a
    sweep that reports only its actions cannot tell them apart.
    """

    organization_id: str
    reason: str


@dataclass
class SweepResult:
    suspended: list[str] = field(default_factory=list)
    skipped: list[Skipped] = field(default_factory=list)
    #: Subscriptions past their deadline that this sweep may not act on —
    #: `payment_failed` whose window elapsed while the gateway was still
    #: retrying. Not an error; a thing a human should look at.
    stalled: list[str] = field(default_factory=list)
    dry_run: bool = True
    ran_at: Optional[datetime] = None

    @property
    def considered(self) -> int:
        return len(self.suspended) + len(self.skipped)

    def summary(self) -> str:
        verb = "would suspend" if self.dry_run else "suspended"
        parts = [f"{verb} {len(self.suspended)}"]
        if self.skipped:
            parts.append(f"skipped {len(self.skipped)}")
        if self.stalled:
            parts.append(f"{len(self.stalled)} stalled in payment_failed")
        return " · ".join(parts)


class GraceSweepUnavailable(RuntimeError):
    """The sweep cannot run safely on this schema."""


class GraceSweep:
    """Finds and suspends organizations whose grace period has elapsed.

    DRY RUN BY DEFAULT, everywhere. `run()` reports and changes nothing unless
    `apply=True` is passed explicitly. This follows
    `restore_founding_subscriptions.py`: an operation that alters a customer's
    access should never happen because someone forgot a flag.
    """

    def __init__(
        self,
        repository: Optional[BillingRepository] = None,
        *,
        audit=None,
    ) -> None:
        self._repo = repository
        #: Injectable so tests assert on audit calls without a database.
        #: Defaults to the real `AuditRepository`, constructed per organization
        #: because it is org-scoped.
        self._audit_factory = audit

    @property
    def repo(self) -> BillingRepository:
        if self._repo is None:
            self._repo = BillingRepository()
        return self._repo

    def _audit_for(self, organization_id: str):
        if self._audit_factory is not None:
            return self._audit_factory(organization_id)
        from app.enterprise.repositories import AuditRepository

        return AuditRepository(organization_id)

    # ── the sweep ───────────────────────────────────────────────────────────

    def run(self, *, apply: bool = False, at: Optional[datetime] = None) -> SweepResult:
        """Find expired grace periods and, with `apply=True`, suspend them.

        Safe to run any number of times. Idempotence comes from the state
        itself: a suspended organization is no longer in `grace`, so the next
        run does not select it, and the conditional write means even a
        simultaneous second run cannot suspend it twice.
        """
        now = at or datetime.now(timezone.utc)
        result = SweepResult(dry_run=not apply, ran_at=now)

        self._require_state_column()

        candidates = self.repo.find_expired_grace(now)
        logger.info("grace sweep: %d candidate(s) at %s", len(candidates), now.isoformat())

        for subscription in candidates:
            refusal = self._refuse(subscription, now)
            if refusal is not None:
                result.skipped.append(Skipped(subscription.organization_id, refusal))
                logger.warning(
                    "grace sweep: refusing to suspend %s — %s",
                    subscription.organization_id, refusal,
                )
                continue

            if not apply:
                result.suspended.append(subscription.organization_id)
                continue

            if self._suspend(subscription, now):
                result.suspended.append(subscription.organization_id)
            else:
                # The row moved between the read and the write — almost always a
                # customer who paid in the interval. Not an error.
                result.skipped.append(
                    Skipped(subscription.organization_id, "no longer in grace when written")
                )
                logger.info(
                    "grace sweep: %s left grace before the write; leaving it alone",
                    subscription.organization_id,
                )

        result.stalled = self._find_stalled(now)
        logger.info("grace sweep complete: %s", result.summary())
        return result

    def _require_state_column(self) -> None:
        """Refuse to run without migration 0027.

        Not a warning. On the old schema `payment_failed` and `grace` are the
        same row, so a sweep would suspend organizations whose gateway is still
        trying to charge them — the exact opposite of what it is for.
        """
        import app.billing.repository as repository_module

        if repository_module._state_column_available is False:
            raise GraceSweepUnavailable(
                "subscriptions.billing_state is missing (migration 0027). "
                "Refusing to sweep: without it, payment_failed and grace are "
                "indistinguishable and this would suspend customers whose "
                "payments are still being retried."
            )

    # ── the refusals ────────────────────────────────────────────────────────

    def _refuse(self, subscription: Subscription, now: datetime) -> Optional[str]:
        """Why this subscription must not be suspended, or None to proceed.

        Every condition the SQL filter already applied is checked again here.
        That redundancy is deliberate: the query is an optimization, and this is
        the decision. If the two ever disagree, the answer that withholds a
        suspension is the one that wins.
        """
        if subscription.is_founding:
            # Rule 13. Grandfathered organizations are never billed, so they can
            # never be in arrears.
            return "founding organizations are never billed"

        if subscription.billing_mode is BillingMode.manual:
            # Enterprise is quoted, contracted and invoiced offline. A late
            # transfer is a conversation with a named contact, not an automatic
            # cut-off of a signed customer.
            return "manual (Enterprise) billing is settled offline"

        if subscription.state not in SUSPENDABLE_STATES:
            return f"state is {subscription.state.value}, not grace"

        if subscription.grace_period_ends_at is None:
            # `subscriptions_grace_requires_failure_chk` should make this
            # impossible, but a grace state with no deadline is a countdown with
            # no end and must never resolve to "expired".
            return "no grace deadline recorded"

        if subscription.grace_period_ends_at > now:
            return "grace period has not elapsed"

        return None

    def _find_stalled(self, now: datetime) -> list[str]:
        """Subscriptions past their deadline that this sweep will not touch.

        `payment_failed` with an elapsed window: the promised grace period is
        over but the gateway has not told us it stopped retrying. Reported so a
        human can look, never acted on — see the module docstring.
        """
        try:
            stalled = self.repo.find_expired_grace_stalled(now)
        except Exception as exc:  # noqa: BLE001 - reporting must not fail a sweep
            logger.warning("grace sweep: could not check for stalled dunning: %s", exc)
            return []
        for subscription in stalled:
            logger.warning(
                "grace sweep: %s is past its grace deadline but still in "
                "payment_failed — the gateway has not reported retries "
                "exhausted. NOT suspending; investigate.",
                subscription.organization_id,
            )
        return [s.organization_id for s in stalled]

    # ── the act ─────────────────────────────────────────────────────────────

    def _suspend(self, subscription: Subscription, now: datetime) -> bool:
        """Withdraw access, then record why.

        The state machine produces the new subscription — `grace -> suspended`
        is checked there like every other edge, so this cannot invent a
        transition the machine forbids.
        """
        suspended = machine.suspend(subscription, at=now)
        written = self.repo.suspend_if_still_in_grace(suspended)
        if not written:
            return False

        self._record(subscription, suspended, now)
        logger.warning(
            "SUSPENDED %s: grace period ended %s (plan %s)",
            subscription.organization_id,
            subscription.grace_period_ends_at.isoformat()
            if subscription.grace_period_ends_at else "unknown",
            subscription.plan,
        )
        return True

    def _record(self, before: Subscription, after: Subscription, now: datetime) -> None:
        """Audit the suspension. Best-effort, like every other audit write.

        A failed audit must not roll back a suspension that has already been
        written, and must not raise into the sweep — but it is logged at ERROR
        rather than swallowed quietly, because a withdrawal of access with no
        record is the one audit gap that matters most here.
        """
        try:
            self._audit_for(before.organization_id).record(
                # No user: this is the system acting on a schedule, and
                # attributing it to a person would be a small lie in the one
                # record that exists to say who did what.
                user_id=None,
                user_email=None,
                action="billing.subscription_suspended",
                resource_type="billing",
                resource_id=before.provider_subscription_id or "",
                metadata={
                    "reason": "grace_period_elapsed",
                    "plan": before.plan,
                    "state_before": before.state.value,
                    "state_after": after.state.value,
                    "payment_failed_at": (
                        before.payment_failed_at.isoformat()
                        if before.payment_failed_at else None
                    ),
                    "grace_period_ends_at": (
                        before.grace_period_ends_at.isoformat()
                        if before.grace_period_ends_at else None
                    ),
                    "swept_at": now.isoformat(),
                    "actor": "grace_sweep",
                },
            )
        except Exception as exc:  # noqa: BLE001
            logger.error(
                "SUSPENDED %s but could not write the audit record: %s",
                before.organization_id, exc,
            )


__all__ = [
    "GraceSweep",
    "GraceSweepUnavailable",
    "Skipped",
    "SUSPENDABLE_STATES",
    "SweepResult",
]
