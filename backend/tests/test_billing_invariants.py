"""
Subscription integrity invariant, and the architectural boundary.

The invariant: **every active organization must have exactly one subscription.**

This is not a general principle, it is a specific scar. Test-account teardown
deleted 83 subscription rows from production. A missing row resolves to `v1` at
read time, which is correct for a new organization and a silent DEMOTION for a
grandfathered one — two real customers lost their founding status and nothing
noticed for days. `docs/rca/SUBSCRIPTION_ROWS_MISSING.md`.

These tests use plain rows and no database, so the rule is exercised without
Supabase.

Runnable without pytest:  python -m tests.test_billing_invariants
"""
from __future__ import annotations

import pathlib
import re
import sys

import pytest

from app.billing.domain.errors import SubscriptionIntegrityError
from app.billing.domain.invariants import (
    IntegrityProblem,
    OrganizationRow,
    SubscriptionRow,
    check_organizations,
    raise_if_critical,
    summarize,
)

APP = pathlib.Path(__file__).resolve().parents[1] / "app"


def org(oid: str, *, active: bool = True) -> OrganizationRow:
    return OrganizationRow(organization_id=oid, has_active_member=active)


# ── the invariant ───────────────────────────────────────────────────────────
class TestSubscriptionInvariant:
    def test_healthy_when_every_active_org_has_one(self):
        findings = check_organizations(
            [org("a"), org("b")],
            [SubscriptionRow("a"), SubscriptionRow("b")],
        )
        assert findings == []
        assert summarize(findings)["healthy"]

    def test_missing_subscription_is_reported(self):
        findings = check_organizations([org("a")], [])
        assert len(findings) == 1
        assert findings[0].problem is IntegrityProblem.missing_subscription

    def test_missing_subscription_is_critical(self):
        # It decides a customer's entitlement right now, by accident.
        findings = check_organizations([org("a")], [])
        assert findings[0].is_critical
        result = summarize(findings)
        assert not result["healthy"] and result["critical"] == 1

    def test_never_silently_normalizes_to_v1(self):
        # The whole point. The old behaviour was to return a default and carry
        # on; the finding must name the consequence so nobody reads it as
        # cosmetic.
        findings = check_organizations([org("a")], [])
        assert "v1" in findings[0].detail

    def test_duplicate_subscription_is_critical(self):
        # organization_id is UNIQUE, so this should be impossible — which is
        # exactly why it is checked. An impossible state that occurs means a
        # constraint is not doing its job.
        findings = check_organizations([org("a")], [SubscriptionRow("a"), SubscriptionRow("a")])
        assert findings[0].problem is IntegrityProblem.duplicate_subscription
        assert findings[0].is_critical

    def test_orphaned_organizations_are_ignored_by_default(self):
        # 67 of these exist in production. Reporting them would bury two real
        # problems under sixty-seven pretend ones, and a check that cries wolf
        # gets switched off.
        findings = check_organizations([org("shell", active=False)], [])
        assert findings == []

    def test_orphans_can_be_included_deliberately(self):
        findings = check_organizations([org("shell", active=False)], [], include_inactive=True)
        assert len(findings) == 1

    def test_the_production_shape_after_recovery(self):
        # 3 real organizations, 67 shells, all three real ones with a row.
        orgs = [org("real-1"), org("real-2"), org("real-3")]
        orgs += [org(f"shell-{i}", active=False) for i in range(67)]
        subs = [SubscriptionRow("real-1", plan_ruleset="founding"),
                SubscriptionRow("real-2", plan_ruleset="founding"),
                SubscriptionRow("real-3", plan_ruleset="v1")]
        assert check_organizations(orgs, subs) == []

    def test_the_production_shape_before_recovery_would_have_failed(self):
        # If this check had existed, the incident would have been caught the
        # day it happened instead of days later by an unrelated snapshot.
        orgs = [org("real-1"), org("real-2"), org("real-3")]
        subs = [SubscriptionRow("real-3")]
        findings = check_organizations(orgs, subs)
        assert len(findings) == 2
        assert not summarize(findings)["healthy"]


class TestNonCriticalProblems:
    def test_provider_mode_without_a_subscription_id(self):
        findings = check_organizations(
            [org("a")], [SubscriptionRow("a", billing_mode="provider")]
        )
        assert findings[0].problem is IntegrityProblem.provider_mode_without_subscription
        assert not findings[0].is_critical

    def test_founding_org_with_a_gateway_subscription(self):
        # Founding accounts predate billing and must never be charged.
        findings = check_organizations(
            [org("a")],
            [SubscriptionRow("a", plan_ruleset="founding", billing_subscription_id="sub_x")],
        )
        assert findings[0].problem is IntegrityProblem.founding_with_gateway_subscription

    def test_grace_deadline_without_a_failure(self):
        findings = check_organizations(
            [org("a")], [SubscriptionRow("a", grace_period_ends_at="2026-08-08")]
        )
        assert findings[0].problem is IntegrityProblem.grace_without_failure

    def test_non_critical_alone_stays_healthy(self):
        # Failing readiness on a data oddity that harms nobody trains people to
        # mute the alert.
        findings = check_organizations(
            [org("a")], [SubscriptionRow("a", billing_mode="provider")]
        )
        assert summarize(findings)["healthy"]


class TestReporting:
    def test_summary_counts_by_problem(self):
        findings = check_organizations([org("a"), org("b")], [])
        assert summarize(findings)["by_problem"]["missing_subscription"] == 2

    def test_sample_is_bounded(self):
        # A health endpoint returning 70 organization ids is a payload nobody
        # reads and a small data leak. The count is the signal.
        findings = check_organizations([org(f"o{i}") for i in range(20)], [])
        assert len(summarize(findings)["sample"]) == 5
        assert summarize(findings)["problems"] == 20

    def test_raise_if_critical_raises(self):
        with pytest.raises(SubscriptionIntegrityError):
            raise_if_critical(check_organizations([org("a")], []))

    def test_raise_if_critical_is_quiet_when_clean(self):
        raise_if_critical(check_organizations([org("a")], [SubscriptionRow("a")]))


# ── architectural boundary ──────────────────────────────────────────────────
class TestBoundaries:
    """The layering is enforced here, not by good intentions."""

    def _sources(self, *parts: str) -> list[pathlib.Path]:
        root = APP.joinpath(*parts)
        return [p for p in root.rglob("*.py")] if root.exists() else []

    def test_entitlement_never_imports_billing(self):
        # The entitlement layer must keep working with billing switched off. A
        # gateway incident must not become an outage for customers who paid.
        offenders = [
            p.name for p in self._sources("enterprise")
            if re.search(r"^\s*(from|import)\s+app\.billing", p.read_text(encoding="utf-8"), re.M)
        ]
        assert offenders == [], f"enterprise imports billing: {offenders}"

    def test_domain_names_no_gateway(self):
        # `domain/` must be reviewable without knowing any gateway's API.
        pattern = re.compile(r"razorpay_|import razorpay|from razorpay", re.I)
        offenders = []
        for p in self._sources("billing", "domain"):
            body = re.sub(r"(?s)\"\"\".*?\"\"\"", "", p.read_text(encoding="utf-8"))
            body = re.sub(r"^\s*#.*$", "", body, flags=re.M)
            if pattern.search(body):
                offenders.append(p.name)
        assert offenders == [], f"gateway vocabulary leaked into the domain: {offenders}"

    def test_sdk_only_inside_the_razorpay_adapter(self):
        # Step 3 introduces the SDK. It may appear ONLY inside
        # app/billing/providers/razorpay/ — anywhere else and the abstraction
        # has leaked.
        allowed = "billing/providers/razorpay/"
        offenders = [
            p.relative_to(APP).as_posix() for p in APP.rglob("*.py")
            if allowed not in p.relative_to(APP).as_posix()
            and re.search(r"^\s*import\s+razorpay|^\s*from\s+razorpay\s",
                          p.read_text(encoding="utf-8"), re.M)
        ]
        assert offenders == [], f"Razorpay SDK imported outside the adapter: {offenders}"

    def test_gateway_vocabulary_only_inside_the_adapter(self):
        # No module outside the adapter may name a Razorpay concept.
        allowed = "billing/providers/razorpay/"
        pattern = re.compile(r"razorpay_(payment|subscription|signature|plan)_id|rzp_(test|live)_", re.I)
        offenders = []
        for p in APP.rglob("*.py"):
            rel = p.relative_to(APP).as_posix()
            if allowed in rel:
                continue
            body = re.sub(r"(?s)\"\"\".*?\"\"\"", "", p.read_text(encoding="utf-8"))
            body = re.sub(r"^\s*#.*$", "", body, flags=re.M)
            if pattern.search(body):
                offenders.append(rel)
        assert offenders == [], f"gateway vocabulary leaked: {offenders}"

    def test_no_http_calls_in_the_domain(self):
        offenders = [
            p.name for p in self._sources("billing", "domain")
            if re.search(r"^\s*import\s+(httpx|requests)|^\s*from\s+(httpx|requests)",
                         p.read_text(encoding="utf-8"), re.M)
        ]
        assert offenders == [], f"domain performs I/O: {offenders}"

    def test_billing_domain_imports_without_supabase(self):
        # It must be testable with no credentials and no network.
        import importlib

        for module in ("models", "state_machine", "invariants", "provider", "errors"):
            importlib.import_module(f"app.billing.domain.{module}")


class TestHealthEndpoint:
    """What an operator actually sees.

    The incident was silent for days. A finding that only appears in a JSON
    body nobody polls would repeat that, so a critical problem has to change
    the STATUS CODE — the thing uptime monitoring watches.
    """

    def _client(self):
        from fastapi.testclient import TestClient
        from app.main import app
        return TestClient(app)

    def test_plain_health_does_not_run_the_check(self, monkeypatch):
        # /health is polled by liveness probes. It must not read three tables.
        called = {"n": 0}

        def spy(**_):
            called["n"] += 1
            return {"healthy": True, "checked": True, "problems": 0}

        monkeypatch.setattr("app.billing.health.billing_integrity_status", spy)
        r = self._client().get("/health")
        assert r.status_code == 200
        assert called["n"] == 0
        assert "billing_integrity" not in r.json()

    def test_opt_in_check_reports_healthy(self, monkeypatch):
        monkeypatch.setattr(
            "app.billing.health.billing_integrity_status",
            lambda **_: {"healthy": True, "checked": True, "problems": 0, "critical": 0},
        )
        r = self._client().get("/health?check=billing")
        assert r.status_code == 200
        assert r.json()["billing_integrity"]["healthy"] is True

    def test_critical_finding_returns_503_and_degraded(self, monkeypatch):
        monkeypatch.setattr(
            "app.billing.health.billing_integrity_status",
            lambda **_: {"healthy": False, "checked": True, "problems": 2, "critical": 2,
                         "by_problem": {"missing_subscription": 2},
                         "sample": ["org-1: missing_subscription"]},
        )
        r = self._client().get("/health?check=billing")
        assert r.status_code == 503
        body = r.json()
        assert body["status"] == "degraded"
        assert body["billing_integrity"]["critical"] == 2

    def test_check_failure_degrades_rather_than_crashing(self, monkeypatch):
        # A health check that throws tells an operator only that the health
        # check is broken. Unknown is not unhealthy.
        def boom(**_):
            raise RuntimeError("supabase unreachable")

        monkeypatch.setattr("app.billing.health.run_integrity_check", boom)
        r = self._client().get("/health?check=billing")
        assert r.status_code == 200
        assert r.json()["billing_integrity"]["checked"] is False


if __name__ == "__main__":
    raise SystemExit(pytest.main([__file__, "-q"]))
