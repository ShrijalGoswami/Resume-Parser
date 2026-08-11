"""
Billing persistence — the row/domain boundary.

The interesting thing here is that **the projection is lossy**. `BillingState`
has eight values and `subscriptions.status` has five, because `payment_failed`
and `grace` both persist as `past_due`, and `suspended` and `cancelled` both
persist as `canceled`.

That is a deliberate design decision (two vocabularies, `models.py`), but it
means reading a row back is a reconstruction rather than a lookup, and a
reconstruction can be wrong in ways a write cannot. The dunning columns carry
the missing bit; these tests pin how.

Getting it wrong is not cosmetic. Reading a `grace` row back as
`payment_failed` would reopen its window on the next write, and the customer
would never be suspended at all.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from app.billing.domain.models import (
    BillingEvent,
    BillingMode,
    BillingProviderId,
    BillingState,
    Money,
    Payment,
    Subscription,
)
from app.billing.repository import BillingRepository, _is_duplicate_key

NOW = datetime(2026, 8, 4, 12, 0, tzinfo=timezone.utc)


# ── a table API that records what it was asked to do ────────────────────────


class FakeTable:
    def __init__(self, store, name):
        self.store, self.name = store, name
        self._filters = {}
        self._payload = None
        self._op = None

    def select(self, *_a, **_kw):
        self._op = "select"
        return self

    def insert(self, payload):
        self._op, self._payload = "insert", payload
        return self

    def upsert(self, payload, on_conflict=None):
        self._op, self._payload = "upsert", payload
        self._on_conflict = on_conflict
        return self

    def update(self, payload):
        self._op, self._payload = "update", payload
        return self

    def eq(self, col, val):
        self._filters[col] = val
        return self

    def limit(self, _n):
        return self

    def execute(self):
        rows = self.store.setdefault(self.name, [])
        if self._op == "select":
            matched = [
                r for r in rows
                if all(str(r.get(k)) == str(v) for k, v in self._filters.items())
            ]
            return type("R", (), {"data": matched})()
        if self._op == "insert":
            key = ("provider", "event_id")
            if self.name == "billing_events":
                for r in rows:
                    if all(r.get(k) == self._payload.get(k) for k in key):
                        raise RuntimeError(
                            'duplicate key value violates unique constraint '
                            '"billing_events_pkey" (SQLSTATE 23505)'
                        )
            rows.append(dict(self._payload))
            return type("R", (), {"data": [self._payload]})()
        if self._op == "upsert":
            rows.append(dict(self._payload))
            return type("R", (), {"data": [self._payload]})()
        if self._op == "update":
            for r in rows:
                if all(str(r.get(k)) == str(v) for k, v in self._filters.items()):
                    r.update(self._payload)
            return type("R", (), {"data": rows})()
        raise AssertionError("unknown op")


class FakeClient:
    def __init__(self):
        self.store: dict[str, list[dict]] = {}
        self.calls: list[str] = []

    def table(self, name):
        self.calls.append(name)
        return FakeTable(self.store, name)


@pytest.fixture
def repo():
    client = FakeClient()
    r = BillingRepository(client=client)
    r._client = client  # for assertions
    return r


def row(**kw):
    base = {
        "organization_id": "org_1", "plan": "plus", "status": "active",
        "plan_ruleset": "v1", "plan_version": 3, "billing_provider": "razorpay",
        "billing_mode": "provider", "billing_customer_id": "cust_1",
        "billing_subscription_id": "sub_1", "cancel_at_period_end": False,
    }
    base.update(kw)
    return base


# ── the lossy projection, read back ─────────────────────────────────────────


class TestStateReconstruction:
    def test_active_and_trialing_are_unambiguous(self, repo):
        repo._client.store["subscriptions"] = [row(status="active")]
        assert repo.get_subscription("org_1").state is BillingState.active
        repo._client.store["subscriptions"] = [row(status="trialing")]
        assert repo.get_subscription("org_1").state is BillingState.trialing

    def test_incomplete_is_pending_activation(self, repo):
        repo._client.store["subscriptions"] = [row(status="incomplete")]
        assert repo.get_subscription("org_1").state is BillingState.pending_activation

    # ── a free plan is not a running subscription ───────────────────────────
    #
    # `provision_default_org()` writes `(organization_id, plan)` and takes the
    # column defaults for everything else, so EVERY organization created by
    # signup carries `status='active'` with no `billing_state`. Read literally
    # that made a brand-new unbilled org look like a paying one — and `active`
    # has no legal edge to `pending_activation`, so no new customer could buy
    # anything. Reproduced on a clean database with a real signup, not theorised.
    #
    # The three tests after the first are the ones that matter on review: the
    # repair must not turn genuinely-active rows into free ones.

    def test_a_fresh_signup_row_reads_as_free(self, repo):
        """THE REGRESSION. Exactly what `provision_default_org()` produces."""
        from app.billing.domain import state_machine as machine

        repo._client.store["subscriptions"] = [
            row(
                plan="free",
                status="active",
                billing_state=None,
                billing_mode="none",
                billing_provider=None,
                billing_customer_id=None,
                billing_subscription_id=None,
            )
        ]
        subscription = repo.get_subscription("org_1")
        assert subscription.state is BillingState.free
        assert subscription.state.grants_paid_access is False
        assert machine.can_transition(subscription.state, BillingState.pending_activation)

    def test_an_operator_granted_enterprise_stays_active(self, repo):
        """`billing_mode='none'` is TRUE of a manually-granted Enterprise too.

        This is why the repair keys on the plan as well. Every organization in
        the deployment that found the bug was this shape, and demoting one to
        `free` would strip paid access from an account somebody negotiated.
        """
        repo._client.store["subscriptions"] = [
            row(
                plan="enterprise",
                status="active",
                billing_state=None,
                billing_mode="none",
                billing_provider=None,
                billing_subscription_id=None,
            )
        ]
        subscription = repo.get_subscription("org_1")
        assert subscription.state is BillingState.active
        assert subscription.state.grants_paid_access is True

    def test_a_free_row_carrying_a_gateway_subscription_stays_active(self, repo):
        """Belt and braces. A row holding a gateway subscription IS one.

        The plan slug lagging behind the gateway — mid-upgrade, or a webhook
        applied out of order — must never be read as "not billed", because that
        is the reading that cancels somebody who is paying.
        """
        repo._client.store["subscriptions"] = [
            row(
                plan="free",
                status="active",
                billing_state=None,
                billing_mode="provider",
                billing_provider="razorpay",
                billing_subscription_id="sub_LIVE",
            )
        ]
        assert repo.get_subscription("org_1").state is not BillingState.free
        assert repo.get_subscription("org_1").state is BillingState.active

    def test_a_paid_gateway_subscription_is_untouched(self, repo):
        """The ordinary paying customer. The default `row()` already is one."""
        repo._client.store["subscriptions"] = [row(plan="pro", status="active")]
        subscription = repo.get_subscription("org_1")
        assert subscription.state is BillingState.active
        assert subscription.is_gateway_billed is True

    # ── the scheduled change (migration 0029) ───────────────────────────────

    def test_a_scheduled_change_round_trips(self, repo):
        """It has to survive a reload — that is the entire reason it is stored.

        Held only in the browser tab that requested it, a refresh forgot it and
        Settings offered "Upgrade to Pro" to somebody who had already booked
        exactly that.
        """
        from datetime import datetime, timezone

        effective = datetime(2026, 9, 11, tzinfo=timezone.utc)
        repo._client.store["subscriptions"] = [
            row(plan="plus", status="active", billing_state="active",
                scheduled_plan="pro",
                scheduled_plan_effective_at=effective.isoformat())
        ]
        subscription = repo.get_subscription("org_1")

        assert subscription.plan == "plus", "the entitlement must not move"
        assert subscription.scheduled_plan == "pro"
        assert subscription.scheduled_plan_effective_at == effective
        assert subscription.has_scheduled_change is True

    def test_no_scheduled_change_reads_as_none(self, repo):
        repo._client.store["subscriptions"] = [row(plan="plus", status="active")]
        subscription = repo.get_subscription("org_1")
        assert subscription.scheduled_plan is None
        assert subscription.has_scheduled_change is False

    def test_a_scheduled_change_is_never_an_entitlement(self, repo):
        """The promise must not leak into anything that grants access.

        `plan` is what the entitlement resolver reads. A customer who has
        scheduled Pro has not bought Pro, and must keep receiving exactly Plus
        until the gateway says otherwise.
        """
        repo._client.store["subscriptions"] = [
            row(plan="plus", status="active", billing_state="active",
                scheduled_plan="pro")
        ]
        subscription = repo.get_subscription("org_1")
        assert subscription.plan == "plus"
        assert subscription.state is BillingState.active

    def test_an_explicit_free_enrichment_still_wins(self, repo):
        """The pre-existing path is unchanged: `billing_state='free'` with the
        `canceled` it projects onto is still read straight off the row."""
        repo._client.store["subscriptions"] = [
            row(
                plan="free",
                status="canceled",
                billing_state="free",
                billing_mode="none",
                billing_provider=None,
                billing_subscription_id=None,
            )
        ]
        assert repo.get_subscription("org_1").state is BillingState.free

    def test_past_due_without_an_open_window_is_payment_failed(self, repo):
        """A row shape the PRODUCTION PATH NEVER PRODUCES.

        Kept because it pins the branch, but read it with suspicion: the domain
        always opens the grace window at failure time, so a real
        `payment_failed` row carries `grace_period_ends_at` and takes the other
        branch. See the xfail below — this test passing is what made the defect
        invisible for a day.
        """
        repo._client.store["subscriptions"] = [
            row(status="past_due", payment_failed_at=NOW.isoformat())
        ]
        assert repo.get_subscription("org_1").state is BillingState.payment_failed

    def test_payment_failed_survives_the_real_domain_path(self, repo):
        """BILL-1, FIXED. Was `xfail(strict=True)` until migration 0027.

        Drives the actual domain transition instead of hand-building a row, so
        it exercises what production writes — which is how the defect hid: the
        older tests constructed rows with `grace_period_ends_at=None`, a shape
        the domain never produces, and so tested the reconstruction against
        itself rather than against reality.
        """
        from app.billing.domain import state_machine as machine

        active = Subscription(
            organization_id="org_1", plan="plus", state=BillingState.active,
            billing_mode=BillingMode.provider, provider=BillingProviderId.razorpay,
            provider_subscription_id="sub_1",
        )
        failed = machine.record_payment_failure(active)
        assert failed.state is BillingState.payment_failed  # the domain is right

        repo.save_subscription(failed)
        repo._client.store["subscriptions"] = [repo._client.store["subscriptions"][-1]]
        assert repo.get_subscription("org_1").state is BillingState.payment_failed

    def test_payment_failed_and_grace_are_distinguishable_after_a_round_trip(self, repo):
        """The pair the whole migration exists for.

        Both carry an open grace window and both persist as `past_due`, so
        before 0027 they were the same row. The difference matters: `grace`
        means the gateway has stopped retrying, and only `grace -> suspended`
        withdraws access.
        """
        from app.billing.domain import state_machine as machine

        def round_trip(sub):
            repo._client.store["subscriptions"] = []
            repo.save_subscription(sub)
            return repo.get_subscription("org_1").state

        active = Subscription(
            organization_id="org_1", plan="plus", state=BillingState.active,
        )
        failed = machine.record_payment_failure(active)
        graced = machine.enter_grace(failed)

        assert failed.grace_period_ends_at is not None
        assert graced.grace_period_ends_at is not None  # identical on this column
        assert round_trip(failed) is BillingState.payment_failed
        assert round_trip(graced) is BillingState.grace

    def test_both_dunning_states_grant_access_regardless_of_the_defect(self, repo):
        """The reassuring half, and the reason BILL-1 is not a P0.

        Whichever of the two the row reads back as, the customer keeps working.
        Dunning is a billing conversation, not a reason to lock a hiring team
        out mid-week — and that promise survives the misread intact.
        """
        from app.billing.domain import state_machine as machine

        active = Subscription(
            organization_id="org_1", plan="plus", state=BillingState.active,
        )
        repo.save_subscription(machine.record_payment_failure(active))
        repo._client.store["subscriptions"] = [repo._client.store["subscriptions"][-1]]
        read_back = repo.get_subscription("org_1")
        assert read_back.state.grants_paid_access is True
        assert read_back.state.to_status().value == "past_due"

    def test_past_due_with_an_open_window_is_grace(self, repo):
        """The distinction the whole dunning flow rests on: `grace` means the
        gateway has stopped retrying, and only it leads to suspension."""
        repo._client.store["subscriptions"] = [
            row(status="past_due", payment_failed_at=NOW.isoformat(),
                grace_period_ends_at=(NOW + timedelta(days=7)).isoformat())
        ]
        assert repo.get_subscription("org_1").state is BillingState.grace

    def test_canceled_with_a_failure_behind_it_is_suspended(self, repo):
        """A suspension still carries the failure that caused it; a customer who
        chose to leave does not."""
        repo._client.store["subscriptions"] = [
            row(status="canceled", payment_failed_at=NOW.isoformat())
        ]
        assert repo.get_subscription("org_1").state is BillingState.suspended

    def test_canceled_with_a_gateway_id_is_a_cancellation(self, repo):
        repo._client.store["subscriptions"] = [row(status="canceled")]
        assert repo.get_subscription("org_1").state is BillingState.cancelled

    def test_canceled_with_no_gateway_history_is_free(self, repo):
        """A never-subscribed organization and a cancelled one both persist as
        `canceled`; the gateway ids separate them."""
        repo._client.store["subscriptions"] = [
            row(status="canceled", billing_subscription_id=None, billing_mode="none")
        ]
        assert repo.get_subscription("org_1").state is BillingState.free

    def test_an_unknown_status_never_grants_access(self, repo):
        repo._client.store["subscriptions"] = [row(status="something_new")]
        state = repo.get_subscription("org_1").state
        assert state is BillingState.free
        assert state.grants_paid_access is False


class TestRoundTrip:
    @pytest.mark.parametrize("state", list(BillingState))
    def test_every_state_survives_a_save_and_a_read(self, repo, state):
        """ALL EIGHT. No exceptions, no "covered elsewhere".

        This was parameterised over six states, skipping `free` and `suspended`
        with a note that they were covered by the reconstruction tests. They
        were not — those tests hand-built rows. The two gaps were where BILL-1
        and the `free`/`cancelled` collision lived.

        A round trip is the only honest test of a lossy projection: write what
        the domain produces, read it back, demand the same value.
        """
        sub = Subscription(
            organization_id="org_1", plan="pro", state=state,
            billing_mode=BillingMode.provider, provider=BillingProviderId.razorpay,
            provider_customer_id="cust_1", provider_subscription_id="sub_1",
            payment_failed_at=NOW if state in (
                BillingState.payment_failed, BillingState.grace,
                BillingState.suspended) else None,
            grace_period_ends_at=(NOW + timedelta(days=7))
            if state in (BillingState.payment_failed, BillingState.grace) else None,
        )
        repo.save_subscription(sub)
        # The fake appends; the last write is the current row.
        repo._client.store["subscriptions"] = [repo._client.store["subscriptions"][-1]]
        assert repo.get_subscription("org_1").state is state

    def test_free_and_cancelled_stay_distinct(self, repo):
        """The second collision 0027 closes.

        Both persist as `canceled`. They were told apart by whether a gateway
        subscription id was present — which survives a `cancelled -> free`
        transition, so a freed organization read back as cancelled.
        """
        from app.billing.domain import state_machine as machine

        cancelled = Subscription(
            organization_id="org_1", plan="plus", state=BillingState.cancelled,
            provider_subscription_id="sub_1", billing_mode=BillingMode.provider,
            provider=BillingProviderId.razorpay,
        )
        freed = machine.transition(cancelled, BillingState.free)

        repo._client.store["subscriptions"] = []
        repo.save_subscription(freed)
        assert repo.get_subscription("org_1").state is BillingState.free

    def test_the_enrichment_is_written_alongside_the_projection(self, repo):
        repo.save_subscription(Subscription(
            organization_id="org_1", plan="pro", state=BillingState.grace,
            payment_failed_at=NOW,
        ))
        written = repo._client.store["subscriptions"][-1]
        assert written["status"] == "past_due"      # what the product reads
        assert written["billing_state"] == "grace"  # what billing recovers

    def test_timestamps_come_back_timezone_aware(self, repo):
        """A naive datetime compared against `grace_period_ends_at` would
        suspend an account early or late depending on the server's timezone."""
        repo._client.store["subscriptions"] = [
            row(status="past_due", payment_failed_at="2026-08-04T12:00:00+00:00",
                grace_period_ends_at="2026-08-11T12:00:00Z")
        ]
        sub = repo.get_subscription("org_1")
        assert sub.payment_failed_at.tzinfo is not None
        assert sub.grace_period_ends_at.tzinfo is not None

    def test_a_missing_subscription_reads_as_none(self, repo):
        assert repo.get_subscription("nobody") is None


class TestEnrichmentNeverOverridesStatus:
    """`billing_state` adds detail to `status`; it may never contradict it.

    `status` has two writers — billing, and the operator path
    (`OrgRepository.update_subscription`, `scripts/set_org_plan.py`) which sets
    a plan and a status without knowing the state machine exists. So a stale
    enrichment is expected, not exceptional, and trusting it would be worse than
    not having it: a support ticket moving an organization to `active` would
    resurrect whatever billing last wrote.
    """

    def test_a_coherent_enrichment_is_used(self, repo):
        repo._client.store["subscriptions"] = [
            row(status="past_due", billing_state="payment_failed",
                payment_failed_at=NOW.isoformat(),
                grace_period_ends_at=(NOW + timedelta(days=7)).isoformat())
        ]
        assert repo.get_subscription("org_1").state is BillingState.payment_failed

    def test_status_wins_when_the_enrichment_disagrees(self, repo):
        """The operator-write case: someone set status='active' directly and
        the stale billing_state still says the subscription was cancelled."""
        repo._client.store["subscriptions"] = [
            row(status="active", billing_state="cancelled")
        ]
        assert repo.get_subscription("org_1").state is BillingState.active

    def test_an_unknown_enrichment_value_is_ignored_not_crashed_on(self, repo):
        """A hand-edited row, or a state added to the database ahead of the
        code. Never guessed at."""
        repo._client.store["subscriptions"] = [
            row(status="active", billing_state="quantum_superposition")
        ]
        assert repo.get_subscription("org_1").state is BillingState.active

    def test_a_pre_migration_row_still_reads(self, repo):
        """Rows written before 0027 have no enrichment. They fall back to the
        old derivation, which is lossy but not broken."""
        repo._client.store["subscriptions"] = [row(status="active")]
        assert repo.get_subscription("org_1").state is BillingState.active

    def test_an_empty_enrichment_is_treated_as_absent(self, repo):
        repo._client.store["subscriptions"] = [row(status="trialing", billing_state="")]
        assert repo.get_subscription("org_1").state is BillingState.trialing


class TestMigrationNotYetApplied:
    """Code and schema deploy separately: migration 0027 is applied by hand in
    the Supabase SQL editor, so this code runs against a database without the
    column for a while. That window must degrade, not fail — refusing to record
    an activation because an enrichment column is missing would leave a customer
    who has paid without their plan.
    """

    @pytest.fixture(autouse=True)
    def _reset_probe(self):
        import app.billing.repository as module

        module._state_column_available = None
        yield
        module._state_column_available = None

    def _legacy_client(self):
        """A client that rejects any query naming `billing_state`."""
        class LegacyTable(FakeTable):
            def select(self, *cols, **kw):
                if cols and "billing_state" in cols[0]:
                    raise RuntimeError(
                        'column subscriptions.billing_state does not exist '
                        '(SQLSTATE 42703)'
                    )
                return super().select(*cols, **kw)

            def upsert(self, payload, on_conflict=None):
                if "billing_state" in payload:
                    raise RuntimeError(
                        'column "billing_state" of relation "subscriptions" '
                        'does not exist (SQLSTATE 42703)'
                    )
                return super().upsert(payload, on_conflict=on_conflict)

        class LegacyClient(FakeClient):
            def table(self, name):
                self.calls.append(name)
                return LegacyTable(self.store, name)

        return LegacyClient()

    def test_reads_fall_back_instead_of_failing(self, caplog):
        client = self._legacy_client()
        client.store["subscriptions"] = [row(status="active")]
        repo = BillingRepository(client=client)
        with caplog.at_level("WARNING"):
            sub = repo.get_subscription("org_1")
        assert sub.state is BillingState.active
        assert "MIGRATION 0027" in caplog.text

    def test_writes_fall_back_instead_of_failing(self, caplog):
        """The more important half. A customer's activation must land."""
        client = self._legacy_client()
        repo = BillingRepository(client=client)
        with caplog.at_level("WARNING"):
            repo.save_subscription(Subscription(
                organization_id="org_1", plan="pro", state=BillingState.active,
            ))
        written = client.store["subscriptions"][-1]
        assert written["status"] == "active"
        assert "billing_state" not in written
        assert "MIGRATION 0027" in caplog.text

    def test_the_probe_is_not_repeated_on_every_call(self):
        """Otherwise every read costs a failed round trip."""
        client = self._legacy_client()
        client.store["subscriptions"] = [row(status="active")]
        repo = BillingRepository(client=client)
        repo.get_subscription("org_1")
        before = len(client.calls)
        repo.get_subscription("org_1")
        # One table() call for the second read, not two (no failed attempt).
        assert len(client.calls) - before == 1

    def test_a_real_error_still_raises(self):
        """Only a missing column is tolerated. Swallowing everything would turn
        a broken database into silent wrong answers."""
        class Broken(FakeClient):
            def table(self, name):
                raise RuntimeError("connection refused")

        repo = BillingRepository(client=Broken())
        with pytest.raises(RuntimeError, match="connection refused"):
            repo.get_subscription("org_1")


class TestWriteOrder:
    def test_subscriptions_is_written_before_organizations(self, repo):
        """`resolve_org_context` reads `sub_row.plan or org_row.plan`, so the
        subscription wins. Writing it first means a crash between the two leaves
        entitlement CORRECT and only a denormalized copy stale — the other order
        leaves a customer who has paid and a product that has not noticed."""
        repo.save_subscription(Subscription(
            organization_id="org_1", plan="pro", state=BillingState.active,
        ))
        tables = [c for c in repo._client.calls if c in ("subscriptions", "organizations")]
        assert tables.index("subscriptions") < tables.index("organizations")

    def test_plan_ruleset_is_never_in_the_write(self, repo):
        """Grandfathering is not a billing fact and billing must not be able to
        revoke it."""
        repo.save_subscription(Subscription(
            organization_id="org_1", plan="pro", state=BillingState.active,
            plan_ruleset="founding",
        ))
        written = repo._client.store["subscriptions"][-1]
        assert "plan_ruleset" not in written

    def test_the_persisted_status_is_the_projection(self, repo):
        repo.save_subscription(Subscription(
            organization_id="org_1", plan="pro", state=BillingState.grace,
            payment_failed_at=NOW,
        ))
        assert repo._client.store["subscriptions"][-1]["status"] == "past_due"


# ── idempotency ─────────────────────────────────────────────────────────────


class TestEventIdempotency:
    def _event(self, event_id="evt_1"):
        return BillingEvent(
            provider="razorpay", event_id=event_id,
            event_type="subscription.activated", payload={"a": 1},
            organization_id="org_1", received_at=NOW,
        )

    def test_a_first_delivery_is_recorded(self, repo):
        assert repo.record_event(self._event()) is True

    def test_a_duplicate_returns_false_rather_than_raising(self, repo):
        """Razorpay retries until it gets a 2xx. A redelivery of an event we
        already handled is the system working, not an error."""
        repo.record_event(self._event())
        assert repo.record_event(self._event()) is False

    def test_distinct_event_ids_both_record(self, repo):
        assert repo.record_event(self._event("evt_1")) is True
        assert repo.record_event(self._event("evt_2")) is True

    def test_a_non_duplicate_write_error_still_raises(self, repo):
        """Swallowing every insert failure would turn a broken database into
        silent data loss."""
        class Exploding(FakeClient):
            def table(self, name):
                raise RuntimeError("connection refused")

        bad = BillingRepository(client=Exploding())
        with pytest.raises(RuntimeError, match="connection refused"):
            bad.record_event(self._event())

    def test_duplicate_detection_recognises_the_sqlstate(self):
        assert _is_duplicate_key(RuntimeError("... (SQLSTATE 23505)")) is True
        assert _is_duplicate_key(RuntimeError("duplicate key value")) is True
        assert _is_duplicate_key(RuntimeError("connection refused")) is False


class TestPaymentRecording:
    def test_a_payment_failure_never_breaks_the_webhook(self, repo):
        """The subscription state decides access and is already written by the
        time this runs; the payment row is evidence."""
        class Exploding(FakeClient):
            def table(self, name):
                raise RuntimeError("table gone")

        bad = BillingRepository(client=Exploding())
        # Must not raise.
        bad.record_payment(Payment(
            organization_id="org_1", provider="razorpay",
            provider_payment_id="pay_1", amount=Money(99_900, "INR"),
            status="captured",
        ))
