"""
Billing persistence.

The only module that reads or writes the billing tables. Everything above it
deals in domain objects; this translates them to and from rows.

WHY THIS IS NOT `enterprise/repositories.py`
--------------------------------------------
`OrgRepository.update_subscription()` already writes `subscriptions` — it takes
a plan name and sets `status='active'`. That is the *operator* path (a support
ticket, `scripts/set_org_plan.py`), and it deliberately knows nothing about
gateways, grace windows or state machines.

Billing is a different writer with different rules: it must go through the state
machine, it must never touch `plan_ruleset`, and it must be able to write rows
no operator ever would (`pending_activation`, an open grace window). Sharing one
repository would mean one of the two paths quietly acquiring the other's
concerns.

SERVICE ROLE ONLY
-----------------
Migration 0016 revoked insert/update/delete on `subscriptions` from
`authenticated` and `anon`, and 0022 added no client write path. Every write
here goes through the service client. A webhook has no user to act as.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Optional

from app.billing.domain.models import (
    BillingEvent,
    BillingMode,
    BillingProviderId,
    BillingState,
    BillingStatus,
    Payment,
    Subscription,
)
from app.db.supabase_client import get_service_client

logger = logging.getLogger("app.billing.repository")

#: Columns the domain round-trips. Named explicitly rather than `select("*")`
#: so a column added later cannot silently change what this reads.
_LEGACY_SUBSCRIPTION_COLUMNS = (
    "organization_id,plan,status,plan_ruleset,plan_version,"
    "billing_provider,billing_mode,billing_customer_id,billing_subscription_id,"
    "current_period_start,current_period_end,cancel_at_period_end,"
    "trial_ends_at,payment_failed_at,grace_period_ends_at"
)

#: The same, plus the state enrichment added by migration 0027.
_SUBSCRIPTION_COLUMNS = _LEGACY_SUBSCRIPTION_COLUMNS + ",billing_state"

#: Whether `subscriptions.billing_state` exists in the database.
#:
#: THIS EXISTS BECAUSE CODE AND SCHEMA DEPLOY SEPARATELY. Migration 0027 is
#: applied by hand in the Supabase SQL editor — there is no CLI and no
#: SQL-exec RPC in this project — so there is a window where this code is
#: running against a database that does not have the column yet.
#:
#: Without this, that window is an outage: every `select` naming a missing
#: column fails, so billing would stop reading subscriptions entirely rather
#: than degrade to the behaviour it had yesterday. `None` means "not yet
#: determined"; it is probed once, on first use.
_state_column_available: Optional[bool] = None

#: Postgres SQLSTATE for "column does not exist".
_UNDEFINED_COLUMN = "42703"


def _rows(resp: Any) -> list[dict]:
    data = getattr(resp, "data", None)
    return data if isinstance(data, list) else ([] if data is None else [data])


def _dt(value: Any) -> Optional[datetime]:
    """Parse a Postgres timestamptz into an aware datetime.

    Aware, always. A naive datetime compared against `grace_period_ends_at`
    would suspend an account early or late depending on the server's timezone,
    which is the kind of bug that only shows up in production and only for some
    customers.
    """
    if not value:
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    text = str(value).replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(text)
    except ValueError:
        logger.warning("unparseable timestamp from the database: %r", value)
        return None
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def _iso(value: Optional[datetime]) -> Optional[str]:
    return value.isoformat() if value else None


def _state_from_row(row: dict) -> BillingState:
    """Recover the machine's state from a row.

    `billing_state` (migration 0027) carries the answer directly. Everything
    below it is the pre-0027 fallback, kept because rows written before the
    migration still exist and because `status` has writers that know nothing
    about the state machine.

    THE PROJECTION IS LOSSY, which is why the enrichment exists. `BillingState`
    has eight values; `subscriptions.status` has five:

        past_due  -> payment_failed | grace
        canceled  -> free | suspended | cancelled

    The original code tried to invert that from the other columns and could not.
    `grace_period_ends_at` is set for BOTH `payment_failed` and `grace` — the
    window opens at failure time, deliberately — so every dunning row read back
    as `grace`, and the "gateway has stopped retrying" transition was never
    recorded at all.

    THE ENRICHMENT MAY NEVER OVERRIDE `status`. It is written only by billing;
    `status` is also written by the operator path, which sets a plan and a
    status without touching `billing_state`. A support ticket moving an
    organization to `active` therefore leaves a stale enrichment behind, and
    trusting it would resurrect a cancelled subscription. So the two must agree,
    and `status` wins when they do not.
    """
    status = (row.get("status") or "").strip()

    stored = (row.get("billing_state") or "").strip()
    if stored:
        try:
            state = BillingState(stored)
        except ValueError:
            # A value the domain does not know — a hand-edited row, or a state
            # added to the database ahead of the code. Never guessed at; fall
            # through to deriving from `status`, which is CHECK-pinned.
            logger.warning(
                "unknown subscriptions.billing_state %r for org %s; "
                "deriving from status instead",
                stored, row.get("organization_id"),
            )
        else:
            if state.to_status().value == status:
                return state
            # Coherent-or-ignored. This is the operator-write case and it is
            # expected, not exceptional — logged at INFO so it is visible
            # without crying wolf.
            logger.info(
                "subscriptions.billing_state %r does not project onto status "
                "%r for org %s; status wins (an operator likely changed the "
                "plan directly)",
                stored, status, row.get("organization_id"),
            )
    failed_at = _dt(row.get("payment_failed_at"))
    grace_ends = _dt(row.get("grace_period_ends_at"))

    if status == BillingStatus.past_due.value:
        # LEGACY FALLBACK, and it is lossy — see `_state_from_row`. Reached only
        # for rows written before migration 0027, or where the enrichment
        # disagreed with `status`. `grace` is the safer of the two to guess:
        # both grant identical access, and treating a dunning row as further
        # along means the sweep considers it rather than overlooking it.
        return BillingState.grace if grace_ends else BillingState.payment_failed
    if status == BillingStatus.canceled.value:
        if failed_at:
            return BillingState.suspended
        # A row that never had a paid subscription and one that was cancelled
        # both persist as `canceled`. `billing_mode` separates them: a
        # cancellation leaves the gateway ids behind, a never-subscribed org has
        # none.
        return (
            BillingState.cancelled
            if row.get("billing_subscription_id")
            else BillingState.free
        )
    if status == BillingStatus.incomplete.value:
        return BillingState.pending_activation
    if status == BillingStatus.trialing.value:
        return BillingState.trialing
    if status == BillingStatus.active.value:
        return BillingState.active
    # An unrecognised status is never guessed into something that grants access.
    logger.warning("unknown subscriptions.status %r; treating as free", status)
    return BillingState.free


def _to_domain(row: dict) -> Subscription:
    provider_value = row.get("billing_provider")
    return Subscription(
        organization_id=str(row.get("organization_id") or ""),
        plan=(row.get("plan") or "free"),
        state=_state_from_row(row),
        plan_ruleset=(row.get("plan_ruleset") or "v1"),
        billing_mode=BillingMode(row.get("billing_mode") or "none"),
        provider=BillingProviderId(provider_value) if provider_value else None,
        provider_customer_id=row.get("billing_customer_id"),
        provider_subscription_id=row.get("billing_subscription_id"),
        current_period_start=_dt(row.get("current_period_start")),
        current_period_end=_dt(row.get("current_period_end")),
        cancel_at_period_end=bool(row.get("cancel_at_period_end")),
        trial_ends_at=_dt(row.get("trial_ends_at")),
        payment_failed_at=_dt(row.get("payment_failed_at")),
        grace_period_ends_at=_dt(row.get("grace_period_ends_at")),
        plan_version=int(row.get("plan_version") or 1),
    )


def _is_undefined_column(exc: Exception) -> bool:
    """Whether a query failed because a column does not exist yet."""
    text = f"{exc}".lower()
    return _UNDEFINED_COLUMN in text or "does not exist" in text


class BillingRepository:
    """Rows in, domain objects out."""

    def __init__(self, client: Any = None) -> None:
        #: Injectable so every test runs against a fake table API with no network.
        self._c = client if client is not None else get_service_client()

    def _t(self, name: str):
        return self._c.table(name)

    # ── migration 0027 tolerance ────────────────────────────────────────────

    def _columns(self) -> str:
        """The select list, minus anything the database does not have yet."""
        return (
            _LEGACY_SUBSCRIPTION_COLUMNS
            if _state_column_available is False
            else _SUBSCRIPTION_COLUMNS
        )

    def _select_subscriptions(self, column: str, value: str) -> list[dict]:
        """Read subscriptions, retrying once without the 0027 column.

        The retry is the whole point: code and schema deploy separately here, so
        this must not turn a not-yet-applied migration into a billing outage. It
        degrades to exactly the behaviour that existed before 0027 and says so
        once, loudly enough to be actioned.
        """
        global _state_column_available
        try:
            rows = _rows(
                self._t("subscriptions")
                .select(self._columns())
                .eq(column, value)
                .limit(1)
                .execute()
            )
        except Exception as exc:  # noqa: BLE001
            if _state_column_available is False or not _is_undefined_column(exc):
                raise
            _state_column_available = False
            logger.warning(
                "subscriptions.billing_state is missing — APPLY MIGRATION 0027. "
                "Billing states are being reconstructed from `status` until then, "
                "which cannot distinguish payment_failed from grace (BILL-1).",
            )
            rows = _rows(
                self._t("subscriptions")
                .select(_LEGACY_SUBSCRIPTION_COLUMNS)
                .eq(column, value)
                .limit(1)
                .execute()
            )
        else:
            if _state_column_available is None:
                _state_column_available = True
        return rows

    # ── subscriptions ───────────────────────────────────────────────────────

    def get_subscription(self, organization_id: str) -> Optional[Subscription]:
        rows = self._select_subscriptions("organization_id", organization_id)
        return _to_domain(rows[0]) if rows else None

    def find_by_provider_subscription(
        self, provider_subscription_id: str
    ) -> Optional[Subscription]:
        """Resolve an organization from a gateway subscription id.

        The webhook path's primary lookup. `idx_subscriptions_billing_subscription`
        is unique, so one gateway subscription can only ever belong to one
        organization — without that index a mis-resolved event could attach the
        same subscription to two orgs and both would look legitimate.
        """
        if not provider_subscription_id:
            return None
        rows = self._select_subscriptions(
            "billing_subscription_id", provider_subscription_id
        )
        return _to_domain(rows[0]) if rows else None

    def save_subscription(self, subscription: Subscription) -> None:
        """Persist a subscription the state machine has already produced.

        WRITE ORDER IS DELIBERATE, AND IT IS NOT ARBITRARY.

        `subscriptions` is written first, `organizations.plan` second, because
        `resolve_org_context` reads
        `sub_row.get("plan") or org_row.get("plan") or "free"` — the
        subscription wins. So if the process dies between the two writes,
        entitlement is already correct and only a denormalized copy is stale.

        The other order would leave an organization whose `organizations.plan`
        says Pro and whose entitlement says Free: the customer has paid and the
        product has not noticed. Failing toward the customer keeping access is
        the standing rule, and here it is just a matter of which statement runs
        first.

        `plan_ruleset` is NEVER written here. Grandfathering is a promise about
        what an account could always do, not a billing fact, and billing must
        not be able to revoke it — see the `Subscription` docstring and the
        `founding` guard in the service.
        """
        patch = {
            "organization_id": subscription.organization_id,
            "plan": subscription.plan,
            "status": subscription.state.to_status().value,
            # The enrichment: the full state, alongside the projection the rest
            # of the product reads. Written together and from the same object,
            # so the two cannot disagree by accident — only an operator writing
            # `status` alone can produce a mismatch, which the read guards for.
            "billing_state": subscription.state.value,
            "plan_version": subscription.plan_version,
            "billing_mode": subscription.billing_mode.value,
            "billing_provider": (
                subscription.provider.value if subscription.provider else None
            ),
            "billing_customer_id": subscription.provider_customer_id,
            "billing_subscription_id": subscription.provider_subscription_id,
            "current_period_start": _iso(subscription.current_period_start),
            "current_period_end": _iso(subscription.current_period_end),
            "cancel_at_period_end": subscription.cancel_at_period_end,
            "trial_ends_at": _iso(subscription.trial_ends_at),
            "payment_failed_at": _iso(subscription.payment_failed_at),
            "grace_period_ends_at": _iso(subscription.grace_period_ends_at),
        }
        global _state_column_available
        if _state_column_available is False:
            patch.pop("billing_state", None)

        try:
            self._t("subscriptions").upsert(
                patch, on_conflict="organization_id"
            ).execute()
        except Exception as exc:  # noqa: BLE001
            # Same deploy-order tolerance as the read path. A write is the more
            # important of the two to keep working: refusing to record an
            # activation because an enrichment column is missing would leave a
            # customer who has paid without their plan.
            if _state_column_available is False or not _is_undefined_column(exc):
                raise
            _state_column_available = False
            logger.warning(
                "subscriptions.billing_state is missing — APPLY MIGRATION 0027. "
                "Writing without it; payment_failed and grace will not be "
                "distinguishable on read until then (BILL-1).",
            )
            patch.pop("billing_state", None)
            self._t("subscriptions").upsert(
                patch, on_conflict="organization_id"
            ).execute()

        # The denormalized copy. Second, for the reason above.
        self._t("organizations").update({"plan": subscription.plan}).eq(
            "id", subscription.organization_id
        ).execute()

    # ── the grace sweep ─────────────────────────────────────────────────────

    def find_expired_grace(self, now: datetime, *, limit: int = 500) -> list[Subscription]:
        """Subscriptions whose grace window has elapsed and which may be suspended.

        FILTERED IN SQL, THEN CHECKED AGAIN IN PYTHON. The database predicate
        keeps the result set small; the domain re-checks every condition before
        anything is withdrawn (`grace.py`). Duplicated on purpose — this is the
        one query in the product whose output causes a customer to lose access,
        and a filter that silently stops matching is not a failure anyone would
        notice until the wrong organization was suspended.

        The exclusions are the same ones the sweep enforces:

        * `billing_state = 'grace'` — **only** grace. A subscription still in
          `payment_failed` has a gateway that is still retrying, and our own
          clock must not overrule that.
        * `plan_ruleset <> 'founding'` — never billed, never suspended.
        * `billing_mode <> 'manual'` — Enterprise is contracted offline; a
          missed transfer is a conversation, not an automatic cut-off.

        Requires migration 0027. Without `billing_state` there is no way to tell
        `grace` from `payment_failed`, and the sweep refuses to run at all rather
        than guess — see `GraceSweep.run`.
        """
        rows = _rows(
            self._t("subscriptions")
            .select(self._columns())
            .eq("billing_state", BillingState.grace.value)
            .neq("plan_ruleset", "founding")
            .neq("billing_mode", BillingMode.manual.value)
            .lte("grace_period_ends_at", _iso(now))
            .limit(limit)
            .execute()
        )
        return [_to_domain(row) for row in rows]

    def find_expired_grace_stalled(
        self, now: datetime, *, limit: int = 500
    ) -> list[Subscription]:
        """Past the deadline, but still `payment_failed` — reported, never swept.

        The gateway has not told us it stopped retrying, so the promised window
        has elapsed while a charge may still succeed. The sweep will not act on
        these (see `grace.py`); surfacing them is how a stuck dunning cycle
        becomes visible instead of becoming an unbounded free plan.
        """
        rows = _rows(
            self._t("subscriptions")
            .select(self._columns())
            .eq("billing_state", BillingState.payment_failed.value)
            .neq("plan_ruleset", "founding")
            .neq("billing_mode", BillingMode.manual.value)
            .lte("grace_period_ends_at", _iso(now))
            .limit(limit)
            .execute()
        )
        return [_to_domain(row) for row in rows]

    def suspend_if_still_in_grace(self, subscription: Subscription) -> bool:
        """Write a suspension, but only if the row is still where we found it.

        Returns True when this call is the one that suspended the organization.

        THE GUARD IS THE CONCURRENCY STORY. Two sweeps overlapping — a cron that
        fires twice, a retried invocation, two workers — would otherwise both
        read the same `grace` row and both write a suspension, producing two
        audit events for one act and two `plan_version` bumps.
        `.eq("billing_state", "grace")` in the update makes the second one match
        zero rows, so it is a no-op rather than a duplicate.

        It also closes a subtler race: a customer who pays in the seconds
        between the read and the write. The webhook moves them to `active`, this
        update no longer matches, and they keep the access they just paid for.
        Losing that race in the customer's favour is the only acceptable
        direction.
        """
        patch = {
            "status": subscription.state.to_status().value,
            "billing_state": subscription.state.value,
            "plan_version": subscription.plan_version,
            "cancel_at_period_end": subscription.cancel_at_period_end,
        }
        if _state_column_available is False:  # pragma: no cover - sweep refuses first
            patch.pop("billing_state", None)

        updated = _rows(
            self._t("subscriptions")
            .update(patch)
            .eq("organization_id", subscription.organization_id)
            .eq("billing_state", BillingState.grace.value)
            .execute()
        )
        return bool(updated)

    # ── billing_events ──────────────────────────────────────────────────────

    def record_event(self, event: BillingEvent) -> bool:
        """Insert a webhook record. Returns False if it was already there.

        **This is the idempotency mechanism**, and it is a database constraint
        rather than an application check on purpose: `(provider, event_id)` is
        the composite primary key of `billing_events`, so two concurrent
        deliveries of the same event cannot both win. Application-level memory
        does not survive a restart mid-redelivery, and redelivery is normal
        rather than exceptional.

        A duplicate is not an error. Razorpay retries until it gets a 2xx, and a
        retry of an event we already handled is the system working.
        """
        payload = {
            "provider": event.provider,
            "event_id": event.event_id,
            "event_type": event.event_type,
            "organization_id": event.organization_id,
            "payload": event.payload,
            "status": event.status,
            "received_at": _iso(event.received_at) or _iso(datetime.now(timezone.utc)),
            "attempts": event.attempts,
        }
        try:
            self._t("billing_events").insert(payload).execute()
            return True
        except Exception as exc:  # noqa: BLE001 - the SDK raises a generic error
            if _is_duplicate_key(exc):
                logger.info(
                    "billing event %s/%s already recorded — redelivery",
                    event.provider, event.event_id,
                )
                return False
            raise

    def get_event(self, provider: str, event_id: str) -> Optional[dict]:
        rows = _rows(
            self._t("billing_events")
            .select("provider,event_id,event_type,status,attempts,organization_id,error")
            .eq("provider", provider)
            .eq("event_id", event_id)
            .limit(1)
            .execute()
        )
        return rows[0] if rows else None

    def mark_event(
        self,
        provider: str,
        event_id: str,
        *,
        status: str,
        error: Optional[str] = None,
        organization_id: Optional[str] = None,
        attempts: Optional[int] = None,
    ) -> None:
        patch: dict[str, Any] = {"status": status, "error": error}
        if status == "processed":
            patch["processed_at"] = _iso(datetime.now(timezone.utc))
        if organization_id:
            patch["organization_id"] = organization_id
        if attempts is not None:
            patch["attempts"] = attempts
        self._t("billing_events").update(patch).eq("provider", provider).eq(
            "event_id", event_id
        ).execute()

    # ── billing_payments ────────────────────────────────────────────────────

    def record_payment(self, payment: Payment, *, raw: Optional[dict] = None) -> None:
        """One row per charge attempt.

        Best-effort by design: a payment record is evidence, and failing the
        webhook because the evidence would not write is the wrong trade — the
        subscription state is the thing that decides access, and it has already
        been persisted by the time this runs.
        """
        try:
            self._t("billing_payments").upsert(
                {
                    "organization_id": payment.organization_id,
                    "provider": payment.provider,
                    "provider_payment_id": payment.provider_payment_id,
                    "provider_subscription_id": payment.provider_subscription_id,
                    "provider_invoice_id": payment.provider_invoice_id,
                    "amount_minor": payment.amount.minor_units,
                    "currency": payment.amount.currency,
                    "status": payment.status,
                    "method": payment.method,
                    "captured_at": _iso(payment.captured_at),
                    "failed_at": _iso(payment.failed_at),
                    "failure_reason": payment.failure_reason,
                    "raw": raw or {},
                },
                on_conflict="provider,provider_payment_id",
            ).execute()
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "could not record payment %s: %s", payment.provider_payment_id, exc
            )


def _is_duplicate_key(exc: Exception) -> bool:
    """Whether a write failed because the row already existed.

    Matched on text because PostgREST surfaces the Postgres error through the
    SDK as a generic exception rather than a typed one. `23505` is the SQLSTATE
    for a unique violation and is the reliable part; the phrases are belt and
    braces for SDK versions that report only a message.
    """
    text = f"{exc}".lower()
    return (
        "23505" in text
        or "duplicate key" in text
        or "already exists" in text
    )


__all__ = ["BillingRepository", "_is_duplicate_key"]
