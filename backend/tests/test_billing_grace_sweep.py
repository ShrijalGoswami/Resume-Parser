"""
The grace sweep — the only thing in this product that withdraws paid access.

Because of that, most of these tests are about what it **refuses** to do. A
sweep that suspends the right organizations but also one wrong one is worse than
no sweep: the customer who should not have been cut off is a support incident,
a refund, and a trust problem, while the ones who should have been cut off are
merely still using the product.

The cases that matter most, in order:

  * `TestNeverSuspends` — founding, manual Enterprise, and every state that is
    not `grace`
  * `test_a_customer_who_pays_during_the_sweep_keeps_access`
  * `TestIdempotence` — the same run twice, and two runs at once
  * `test_refuses_to_run_without_migration_0027`
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from app.billing.domain.models import (
    BillingMode,
    BillingProviderId,
    BillingState,
    Subscription,
)
from app.billing.grace import GraceSweep, GraceSweepUnavailable, SUSPENDABLE_STATES

NOW = datetime(2026, 8, 5, 12, 0, tzinfo=timezone.utc)
YESTERDAY = NOW - timedelta(days=1)
TOMORROW = NOW + timedelta(days=1)


class FakeRepo:
    """The billing repository, with the sweep's two queries and its write."""

    def __init__(self, subscriptions=None):
        self.subs: dict[str, Subscription] = {
            s.organization_id: s for s in (subscriptions or [])
        }
        self.writes: list[Subscription] = []
        #: Simulates the row changing between the read and the write.
        self.steal: set[str] = set()

    def _eligible(self, state, now):
        return [
            s for s in self.subs.values()
            if s.state is state
            and not s.is_founding
            and s.billing_mode is not BillingMode.manual
            and s.grace_period_ends_at is not None
            and s.grace_period_ends_at <= now
        ]

    def find_expired_grace(self, now, *, limit=500):
        return self._eligible(BillingState.grace, now)

    def find_expired_grace_stalled(self, now, *, limit=500):
        return self._eligible(BillingState.payment_failed, now)

    def suspend_if_still_in_grace(self, subscription):
        if subscription.organization_id in self.steal:
            return False          # someone else moved it first
        self.subs[subscription.organization_id] = subscription
        self.writes.append(subscription)
        return True


class FakeAudit:
    def __init__(self, sink, organization_id):
        self.sink, self.org = sink, organization_id

    def record(self, **kw):
        self.sink.append((self.org, kw))


def make_sweep(*subscriptions, audit_sink=None, state_column=True):
    import app.billing.repository as repository_module

    repository_module._state_column_available = state_column
    repo = FakeRepo(subscriptions)
    sink = audit_sink if audit_sink is not None else []
    sweep = GraceSweep(
        repository=repo, audit=lambda org: FakeAudit(sink, org),
    )
    return sweep, repo, sink


@pytest.fixture(autouse=True)
def _reset_column_probe():
    import app.billing.repository as repository_module

    yield
    repository_module._state_column_available = None


def sub(state=BillingState.grace, *, org="org_1", ends=YESTERDAY, **kw):
    kw.setdefault("billing_mode", BillingMode.provider)
    kw.setdefault("provider", BillingProviderId.razorpay)
    kw.setdefault("provider_subscription_id", f"sub_{org}")
    return Subscription(
        organization_id=org, plan=kw.pop("plan", "plus"), state=state,
        payment_failed_at=kw.pop("payment_failed_at", YESTERDAY - timedelta(days=7)),
        grace_period_ends_at=ends, **kw,
    )


# ── the happy path ──────────────────────────────────────────────────────────


class TestSuspension:
    def test_an_elapsed_grace_period_is_suspended(self):
        sweep, repo, _ = make_sweep(sub())
        result = sweep.run(apply=True, at=NOW)
        assert result.suspended == ["org_1"]
        assert repo.subs["org_1"].state is BillingState.suspended

    def test_suspension_withdraws_paid_access(self):
        """The point of the whole exercise, and the only edge that does it."""
        sweep, repo, _ = make_sweep(sub())
        sweep.run(apply=True, at=NOW)
        assert repo.subs["org_1"].state.grants_paid_access is False

    def test_it_goes_through_the_state_machine(self):
        """`grace -> suspended` is checked like every other edge, so the sweep
        cannot invent a transition the machine forbids."""
        sweep, repo, _ = make_sweep(sub())
        sweep.run(apply=True, at=NOW)
        written = repo.writes[0]
        assert written.state is BillingState.suspended
        # A suspension keeps the failure that caused it — that is what
        # distinguishes it from a customer who chose to leave.
        assert written.payment_failed_at is not None

    def test_plan_version_is_bumped_so_stale_clients_refetch(self):
        sweep, repo, _ = make_sweep(sub(plan_version=4))
        sweep.run(apply=True, at=NOW)
        assert repo.writes[0].plan_version == 5

    def test_several_organizations_in_one_run(self):
        sweep, repo, _ = make_sweep(
            sub(org="a"), sub(org="b"), sub(org="c"),
        )
        result = sweep.run(apply=True, at=NOW)
        assert sorted(result.suspended) == ["a", "b", "c"]


class TestDryRun:
    def test_dry_run_is_the_default(self):
        sweep, repo, _ = make_sweep(sub())
        result = sweep.run(at=NOW)
        assert result.dry_run is True
        assert repo.writes == []
        assert repo.subs["org_1"].state is BillingState.grace

    def test_dry_run_still_reports_what_it_would_do(self):
        sweep, _, _ = make_sweep(sub())
        assert sweep.run(at=NOW).suspended == ["org_1"]

    def test_dry_run_writes_no_audit_record(self):
        sweep, _, audit = make_sweep(sub())
        sweep.run(at=NOW)
        assert audit == []


# ── what it must never touch ────────────────────────────────────────────────


class TestNeverSuspends:
    def test_founding_organizations(self):
        """Rule 13. Never billed, so never in arrears — and this is the promise
        made to every pre-monetization customer.

        Excluded by the QUERY, so it is never even a candidate. The service
        refuses it too; that half is `TestServiceRefusesWhatTheQueryMissed`.
        """
        sweep, repo, _ = make_sweep(sub(plan_ruleset="founding"))
        result = sweep.run(apply=True, at=NOW)
        assert result.suspended == []
        assert repo.writes == []
        assert repo.subs["org_1"].state is BillingState.grace

    def test_manual_enterprise(self):
        """Enterprise is quoted, contracted and invoiced offline. A late
        transfer is a conversation with a named contact, not an automatic
        cut-off of a signed customer."""
        sweep, repo, _ = make_sweep(sub(billing_mode=BillingMode.manual))
        result = sweep.run(apply=True, at=NOW)
        assert result.suspended == []
        assert repo.writes == []
        assert repo.subs["org_1"].state is BillingState.grace

    @pytest.mark.parametrize("state", [
        BillingState.active,
        BillingState.payment_failed,
        BillingState.free,
        BillingState.pending_activation,
        BillingState.trialing,
        BillingState.cancelled,
        BillingState.suspended,
    ])
    def test_every_state_that_is_not_grace(self, state):
        """The explicit list from the requirement, plus `trialing` and
        `suspended` for completeness."""
        sweep, repo, _ = make_sweep(sub(state))
        result = sweep.run(apply=True, at=NOW)
        assert result.suspended == []
        assert repo.subs["org_1"].state is state

    def test_payment_failed_specifically(self):
        """The one the state machine's own `expire_grace()` WOULD have handled.

        A subscription can reach its deadline while still in `payment_failed`
        if the window runs out before the gateway's retries do. Suspending it
        would be us overruling the gateway on our own clock while a charge might
        still succeed. Reported instead.
        """
        sweep, repo, _ = make_sweep(sub(BillingState.payment_failed))
        result = sweep.run(apply=True, at=NOW)
        assert result.suspended == []
        assert result.stalled == ["org_1"]
        assert repo.subs["org_1"].state.grants_paid_access is True

    def test_a_grace_period_that_has_not_elapsed(self):
        sweep, repo, _ = make_sweep(sub(ends=TOMORROW))
        assert sweep.run(apply=True, at=NOW).suspended == []
        assert repo.subs["org_1"].state is BillingState.grace

    def test_a_grace_period_ending_exactly_now_is_elapsed(self):
        """The boundary. `>= deadline` matches the domain's `is_grace_expired`,
        so the two cannot disagree about who is due."""
        sweep, _, _ = make_sweep(sub(ends=NOW))
        assert sweep.run(apply=True, at=NOW).suspended == ["org_1"]

    def test_grace_with_no_deadline_recorded(self):
        """A countdown with no end must never resolve to "expired"."""
        sweep, repo, _ = make_sweep(sub(ends=None))
        assert sweep.run(apply=True, at=NOW).suspended == []


class TestServiceRefusesWhatTheQueryMissed:
    """The second layer of defence, tested on its own.

    `find_expired_grace` already excludes founding, manual and non-grace rows,
    so in normal operation the service never sees them — which means a bug in
    the service's own checks would be invisible until the day the query changed.

    These tests hand the service exactly what the query is supposed to filter
    out. If it trusted its input, every one of them would suspend a customer who
    must never be suspended.
    """

    def _bypassing_the_query(self, subscription):
        sweep, repo, audit = make_sweep()
        repo.subs[subscription.organization_id] = subscription
        repo.find_expired_grace = lambda now, limit=500: [subscription]
        return sweep, repo, audit

    @pytest.mark.parametrize("candidate,expected", [
        (sub(plan_ruleset="founding"), "founding"),
        (sub(billing_mode=BillingMode.manual), "Enterprise"),
        (sub(BillingState.payment_failed), "not grace"),
        (sub(BillingState.active), "not grace"),
        (sub(ends=TOMORROW), "has not elapsed"),
        (sub(ends=None), "no grace deadline"),
    ])
    def test_the_service_refuses_and_says_why(self, candidate, expected):
        sweep, repo, audit = self._bypassing_the_query(candidate)
        result = sweep.run(apply=True, at=NOW)
        assert result.suspended == []
        assert repo.writes == []
        assert audit == []
        assert len(result.skipped) == 1
        assert expected in result.skipped[0].reason

    def test_a_refusal_is_still_counted_as_considered(self):
        """"We found nothing" and "we found one and refused it" are completely
        different operational situations."""
        sweep, _, _ = self._bypassing_the_query(sub(plan_ruleset="founding"))
        result = sweep.run(apply=True, at=NOW)
        assert result.considered == 1
        assert len(result.skipped) == 1


# ── idempotence and concurrency ─────────────────────────────────────────────


class TestIdempotence:
    def test_running_twice_suspends_once(self):
        """Idempotence comes from the state itself: a suspended organization is
        no longer in `grace`, so the second run does not select it."""
        sweep, repo, audit = make_sweep(sub())
        first = sweep.run(apply=True, at=NOW)
        second = sweep.run(apply=True, at=NOW)
        assert first.suspended == ["org_1"]
        assert second.suspended == []
        assert len(repo.writes) == 1
        assert len(audit) == 1

    def test_running_ten_times_changes_nothing_further(self):
        sweep, repo, audit = make_sweep(sub())
        for _ in range(10):
            sweep.run(apply=True, at=NOW)
        assert len(repo.writes) == 1
        assert len(audit) == 1

    def test_a_customer_who_pays_during_the_sweep_keeps_access(self):
        """The race that must be lost in the customer's favour.

        Between the read and the write, a webhook moves them to `active`. The
        conditional update no longer matches, so the suspension is dropped and
        they keep the access they just paid for.
        """
        sweep, repo, audit = make_sweep(sub())
        repo.steal.add("org_1")
        result = sweep.run(apply=True, at=NOW)
        assert result.suspended == []
        assert "no longer in grace" in result.skipped[0].reason
        assert audit == [], "audited a suspension that never happened"

    def test_a_lost_race_is_not_reported_as_an_error(self):
        """It is the system working. A cron that alarms on it would alarm every
        time someone paid at the wrong moment."""
        sweep, repo, _ = make_sweep(sub())
        repo.steal.add("org_1")
        result = sweep.run(apply=True, at=NOW)
        assert result.considered == 1


# ── the audit record ────────────────────────────────────────────────────────


class TestAudit:
    def test_every_suspension_is_audited(self):
        sweep, _, audit = make_sweep(sub())
        sweep.run(apply=True, at=NOW)
        assert len(audit) == 1
        org, entry = audit[0]
        assert org == "org_1"
        assert entry["action"] == "billing.subscription_suspended"

    def test_the_record_says_why_and_when(self):
        sweep, _, audit = make_sweep(sub())
        sweep.run(apply=True, at=NOW)
        meta = audit[0][1]["metadata"]
        assert meta["reason"] == "grace_period_elapsed"
        assert meta["state_before"] == "grace"
        assert meta["state_after"] == "suspended"
        assert meta["actor"] == "grace_sweep"
        assert meta["grace_period_ends_at"] == YESTERDAY.isoformat()

    def test_no_user_is_attributed(self):
        """The system acted on a schedule. Naming a person would be a small lie
        in the one record whose job is to say who did what."""
        sweep, _, audit = make_sweep(sub())
        sweep.run(apply=True, at=NOW)
        assert audit[0][1]["user_id"] is None
        assert audit[0][1]["user_email"] is None

    def test_a_failed_audit_does_not_undo_a_suspension(self):
        """The suspension is already written. Raising here would leave the row
        suspended and the sweep reporting failure."""
        import app.billing.repository as repository_module

        repository_module._state_column_available = True
        repo = FakeRepo([sub()])

        class Exploding:
            def record(self, **kw):
                raise RuntimeError("audit table unavailable")

        sweep = GraceSweep(repository=repo, audit=lambda org: Exploding())
        result = sweep.run(apply=True, at=NOW)
        assert result.suspended == ["org_1"]
        assert repo.subs["org_1"].state is BillingState.suspended


# ── schema safety ───────────────────────────────────────────────────────────


class TestSchemaGuard:
    def test_refuses_to_run_without_migration_0027(self):
        """Before 0027, `payment_failed` and `grace` are the same persisted row.
        A sweep on that schema would suspend customers whose payments are still
        being retried — the exact opposite of what it is for. It refuses rather
        than guesses."""
        sweep, repo, _ = make_sweep(sub(), state_column=False)
        with pytest.raises(GraceSweepUnavailable, match="0027"):
            sweep.run(apply=True, at=NOW)
        assert repo.writes == []

    def test_refuses_in_dry_run_too(self):
        """A dry run on the wrong schema would report a list of organizations
        that must not be suspended, which is worse than refusing."""
        sweep, _, _ = make_sweep(sub(), state_column=False)
        with pytest.raises(GraceSweepUnavailable):
            sweep.run(at=NOW)

    def test_an_undetermined_column_does_not_block(self):
        """`None` means "not probed yet", not "missing"."""
        sweep, _, _ = make_sweep(sub(), state_column=None)
        assert sweep.run(at=NOW).suspended == ["org_1"]


class TestReporting:
    def test_the_summary_distinguishes_dry_run_from_real(self):
        sweep, _, _ = make_sweep(sub())
        assert "would suspend" in sweep.run(at=NOW).summary()
        assert "suspended 1" in sweep.run(apply=True, at=NOW).summary()

    def test_nothing_to_do_is_reported_as_such(self):
        sweep, _, _ = make_sweep()
        result = sweep.run(apply=True, at=NOW)
        assert result.considered == 0
        assert result.suspended == []

    def test_stalled_dunning_is_surfaced_separately(self):
        sweep, _, _ = make_sweep(
            sub(org="due"), sub(BillingState.payment_failed, org="stuck"),
        )
        result = sweep.run(apply=True, at=NOW)
        assert result.suspended == ["due"]
        assert result.stalled == ["stuck"]

    def test_a_failure_to_check_stalled_does_not_fail_the_sweep(self):
        sweep, repo, _ = make_sweep(sub())

        def explode(now, limit=500):
            raise RuntimeError("query failed")

        repo.find_expired_grace_stalled = explode
        result = sweep.run(apply=True, at=NOW)
        assert result.suspended == ["org_1"]
        assert result.stalled == []


class TestConfiguration:
    def test_only_grace_is_suspendable(self):
        """Widening this should be a visible, reviewable edit."""
        assert SUSPENDABLE_STATES == frozenset({BillingState.grace})

    def test_the_sweep_agrees_with_the_domain_about_who_is_due(self):
        """`is_grace_expired` and this sweep must not disagree about a deadline,
        or the ledger and the product tell different stories."""
        from app.billing.domain import state_machine as machine

        due = sub(ends=YESTERDAY)
        not_due = sub(ends=TOMORROW, org="org_2")
        assert machine.is_grace_expired(due, at=NOW) is True
        assert machine.is_grace_expired(not_due, at=NOW) is False

        sweep, _, _ = make_sweep(due, not_due)
        assert sweep.run(at=NOW).suspended == ["org_1"]
