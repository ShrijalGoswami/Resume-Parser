"""
Entitlement engine suite.

`PlanService` is the one place that answers "has this organization bought this?".
Every gate in the product delegates to it, so these tests are the specification
of what each plan can actually do — and of the two failure modes that must never
be confused:

    403  your ROLE may not          → ask an admin
    402  your PLAN does not         → upgrade

They also pin the decision CONTENTS, not just the boolean. A denial that cannot
say which plan lifts it forces every caller to re-derive the tier — which is the
`if plan == "pro"` this design exists to prevent.

Runnable without pytest:  python -m tests.test_entitlements
(from backend/, with the project venv active)
"""
from __future__ import annotations

import sys

from app.enterprise.catalog import METRIC_MEMBERS, METRIC_RESUMES, Plan
from app.enterprise.entitlements import (
    REASON_FEATURE, REASON_INACTIVE, REASON_LIMIT, PlanError, PlanService,
)
from app.enterprise.usage import UsageSnapshot


def svc(plan="free", *, ruleset="v1", status="active", usage=None, grants=None,
        overrides=None, limit_overrides=None) -> PlanService:
    return PlanService(
        plan=plan, ruleset=ruleset, plan_status=status,
        usage=usage or UsageSnapshot(period="2026-07"),
        grants=grants, feature_overrides=overrides, limit_overrides=limit_overrides,
    )


# ── Feature entitlement per plan ────────────────────────────────────────────
def test_free_plan_capabilities():
    s = svc("free")
    assert s.feature("resume_parser").allowed
    assert s.feature("ats_score").allowed
    assert s.feature("basic_ai_summary").allowed
    for locked in ("candidate_comparison", "export_pdf", "ai_copilot",
                   "semantic_search", "interview_intelligence", "advanced_analytics",
                   "autonomous_agent"):
        assert not s.feature(locked).allowed, f"free must not include {locked}"


def test_plus_plan_capabilities():
    s = svc("plus")
    for included in ("full_resume_analysis", "candidate_comparison", "export_pdf"):
        assert s.feature(included).allowed, f"plus must include {included}"
    for locked in ("ai_copilot", "semantic_search", "interview_intelligence",
                   "advanced_analytics", "export_excel"):
        assert not s.feature(locked).allowed, f"plus must not include {locked}"


def test_pro_plan_capabilities():
    s = svc("pro")
    for included in ("ai_copilot", "semantic_search", "interview_intelligence",
                     "advanced_analytics", "executive_reports", "export_excel",
                     "candidate_comparison", "export_pdf"):
        assert s.feature(included).allowed, f"pro must include {included}"
    for locked in ("sso", "api_access", "audit_logs", "autonomous_agent",
                   "dedicated_support"):
        assert not s.feature(locked).allowed, f"pro must not include {locked}"


def test_enterprise_has_everything():
    s = svc("enterprise")
    from app.enterprise.catalog import FEATURES
    for key in FEATURES:
        assert s.feature(key).allowed, f"enterprise must include {key}"


# ── Decision contents ───────────────────────────────────────────────────────
def test_denied_feature_names_the_plan_that_lifts_it():
    d = svc("free").can_use_copilot()
    assert not d.allowed
    assert d.reason == REASON_FEATURE
    assert d.required_plan == "pro"
    assert d.upgrade_target == "pro"
    assert d.current_plan == "free"
    assert "Pro" in d.message
    assert d.feature == "ai_copilot"


def test_error_body_is_flat_and_complete():
    body = svc("free").can_use_copilot().as_error()
    for key in ("detail", "code", "feature", "current_plan", "required_plan",
                "upgrade_target", "limit", "used", "remaining", "plan_version"):
        assert key in body, f"402 body missing {key}"
    assert body["code"] == REASON_FEATURE


def test_unknown_feature_denies_without_offering_an_upgrade():
    """An upgrade would not help — saying so is the honest answer."""
    d = svc("enterprise").feature("teleportation")
    assert not d.allowed
    assert d.required_plan is None


# ── Quotas ──────────────────────────────────────────────────────────────────
def test_free_resume_quota_boundary():
    s0 = svc("free", usage=UsageSnapshot(resumes_lifetime=0))
    s1 = svc("free", usage=UsageSnapshot(resumes_lifetime=1))
    s2 = svc("free", usage=UsageSnapshot(resumes_lifetime=2))
    assert s0.can_upload_resume(1).allowed
    assert s0.can_upload_resume(2).allowed          # exactly at the limit is allowed
    assert not s0.can_upload_resume(3).allowed
    assert s1.can_upload_resume(1).allowed
    assert not s1.can_upload_resume(2).allowed
    assert not s2.can_upload_resume(1).allowed      # the wall


def test_exhausted_free_quota_decision_contents():
    d = svc("free", usage=UsageSnapshot(resumes_lifetime=2)).can_upload_resume(1)
    assert not d.allowed
    assert d.reason == REASON_LIMIT
    assert d.limit == 2 and d.used == 2 and d.remaining == 0
    assert d.required_plan == "plus"
    assert d.metric == METRIC_RESUMES


def test_batch_denial_describes_the_batch():
    """"You've used 0 of 2" is confusing when 3 were requested and refused."""
    d = svc("free", usage=UsageSnapshot(resumes_lifetime=0)).can_upload_resume(3)
    assert not d.allowed
    assert "3" in d.message
    assert d.extra.get("requested") == 3


def test_free_counts_lifetime_and_plus_counts_the_month():
    usage = UsageSnapshot(resumes_lifetime=40, resumes_period=3)
    assert svc("free", usage=usage).can_upload_resume(1).used == 40
    assert svc("plus", usage=usage).can_upload_resume(1).used == 3
    # …and the monthly window is what decides for a paid plan.
    assert svc("plus", usage=usage).can_upload_resume(1).allowed


def test_pro_resumes_are_unlimited():
    d = svc("pro", usage=UsageSnapshot(resumes_period=100_000)).can_upload_resume(500)
    assert d.allowed


def test_member_seats():
    assert not svc("free", usage=UsageSnapshot(members=1)).can_invite_member().allowed
    assert svc("plus", usage=UsageSnapshot(members=2)).can_invite_member().allowed
    assert not svc("plus", usage=UsageSnapshot(members=3)).can_invite_member().allowed
    assert svc("enterprise", usage=UsageSnapshot(members=9999)).can_invite_member().allowed


def test_campaign_limit():
    assert svc("free", usage=UsageSnapshot(campaigns=1)).can_create_campaign().allowed
    assert not svc("free", usage=UsageSnapshot(campaigns=2)).can_create_campaign().allowed
    assert svc("plus", usage=UsageSnapshot(campaigns=500)).can_create_campaign().allowed


def test_limit_overrides_lift_a_quota():
    s = svc("free", usage=UsageSnapshot(resumes_lifetime=2),
            limit_overrides={METRIC_RESUMES: 100})
    assert s.can_upload_resume(1).allowed


# ── Grants, overrides, precedence ───────────────────────────────────────────
def test_grant_adds_a_capability_above_the_plan():
    s = svc("plus", grants={"ai_copilot"})
    assert s.can_use_copilot().allowed
    assert not s.can_use_semantic_search().allowed   # only what was granted


def test_org_override_can_only_subtract():
    """An `enabled = true` flag row is inert — it cannot grant above the plan.

    This is the revenue leak the pre-monetization behaviour had: a support toggle
    and a commercial decision were the same row.
    """
    assert not svc("free", overrides={"ai_copilot": True}).can_use_copilot().allowed
    assert not svc("pro", overrides={"ai_copilot": False}).can_use_copilot().allowed
    assert svc("pro", overrides={"ai_copilot": True}).can_use_copilot().allowed


def test_disabled_by_org_does_not_offer_an_upgrade():
    """Upgrading would not restore it — the organization turned it off."""
    d = svc("pro", overrides={"ai_copilot": False}).can_use_copilot()
    assert not d.allowed
    assert d.required_plan is None
    assert d.extra.get("disabled_by_org") is True


# ── Plan status ─────────────────────────────────────────────────────────────
def test_canceled_plan_falls_back_to_free():
    s = svc("pro", status="canceled")
    assert not s.can_use_copilot().allowed
    assert s.can_use_copilot().reason == REASON_INACTIVE
    assert s.feature("resume_parser").allowed        # free capabilities remain


def test_past_due_keeps_working():
    """Dunning is a billing conversation, not a reason to lock a team out of its
    pipeline mid-week."""
    assert svc("pro", status="past_due").can_use_copilot().allowed


def test_trialing_is_active():
    assert svc("pro", status="trialing").can_use_copilot().allowed


# ── Founding (grandfathered) organizations ──────────────────────────────────
def test_founding_org_keeps_capabilities_and_has_no_limits():
    s = svc("free", ruleset="founding", usage=UsageSnapshot(resumes_lifetime=9999,
                                                            members=50, campaigns=80))
    assert s.can_use_copilot().allowed
    assert s.can_compare_candidates().allowed
    assert s.can_use_semantic_search().allowed
    assert s.can_upload_resume(100).allowed
    assert s.can_invite_member().allowed
    assert s.can_create_campaign().allowed


def test_founding_org_is_not_a_free_enterprise_plan():
    s = svc("free", ruleset="founding")
    # Was `can_use_own_api_key()` (byo_ai) until the feature was removed on
    # 6 Aug 2026 — V1 is Groq-only. `api_access` is the same shape of check:
    # an Enterprise capability a grandfathered FREE org must not inherit.
    assert not s.feature("api_access").allowed
    assert not s.feature("sso").allowed


def test_founding_org_ignores_plan_status():
    """Their plan predates billing; expiring them on a status they never had
    would break the grandfather promise."""
    assert svc("free", ruleset="founding", status="canceled").can_use_copilot().allowed


# ── Enforcement switch ──────────────────────────────────────────────────────
def test_raise_for_denied_raises_402():
    try:
        svc("free").can_use_copilot().raise_for_denied()
    except PlanError as exc:
        assert exc.status_code == 402
        assert exc.decision.required_plan == "pro"
    else:
        raise AssertionError("expected PlanError")


def test_allowed_decision_does_not_raise():
    svc("pro").can_use_copilot().raise_for_denied()


def test_enforcement_can_be_disabled_as_a_rollback_lever():
    from app.core.config import settings
    original = settings.ENTITLEMENT_ENFORCEMENT
    try:
        settings.ENTITLEMENT_ENFORCEMENT = "off"
        svc("free").can_use_copilot().raise_for_denied()   # must NOT raise
    finally:
        settings.ENTITLEMENT_ENFORCEMENT = original
    # …and enforcement is back on afterwards.
    try:
        svc("free").can_use_copilot().raise_for_denied()
    except PlanError:
        pass
    else:
        raise AssertionError("enforcement did not resume")


# ── Serialisation for /org/context ──────────────────────────────────────────
def test_entitlements_map_lists_every_feature_including_locked_ones():
    """The UI renders locks; a feature missing from the map cannot be sold."""
    from app.enterprise.catalog import FEATURES
    ent = svc("free").entitlements()
    assert set(ent) == set(FEATURES)
    assert ent["ai_copilot"] == {"enabled": False, "required_plan": "pro",
                                 "label": "AI Copilot"}


def test_limits_map_reports_usage_and_window():
    limits = svc("free", usage=UsageSnapshot(resumes_lifetime=1, period="2026-07")).limits()
    assert limits[METRIC_RESUMES]["used"] == 1
    assert limits[METRIC_RESUMES]["limit"] == 2
    assert limits[METRIC_RESUMES]["remaining"] == 1
    assert limits[METRIC_RESUMES]["window"] == "lifetime"
    assert limits[METRIC_MEMBERS]["limit"] == 1


def _run_all() -> int:
    failures = 0
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            try:
                fn()
                print(f"  PASS  {name}")
            except AssertionError as exc:
                failures += 1
                print(f"  FAIL  {name}: {exc}")
    print(f"\n{'FAILED' if failures else 'OK'} - {failures} failure(s)")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(_run_all())
