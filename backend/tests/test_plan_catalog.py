"""
Plan catalog suite.

The catalog is the single source of truth for what each plan includes, so a
defect here is not a bug in one screen — it is the wrong answer everywhere at
once, including in the price the customer is shown. These tests pin the
properties that must hold for any future edit of the table:

  * monotonicity — a higher tier can never include LESS than a lower one
  * alias safety — a paying `professional`/`business` row never resolves to free
  * founding fidelity — the grandfathered set keeps what those accounts had
  * ruleset default direction — an unknown ruleset applies the NEW rules, while
    an unknown plan resolves to free; getting either backwards gives something
    away

Runnable without pytest:  python -m tests.test_plan_catalog
(from backend/, with the project venv active)
"""
from __future__ import annotations

import sys

from app.enterprise.catalog import (
    FEATURES, FOUNDING_FEATURES, LIMITS, METRIC_CAMPAIGNS, METRIC_MEMBERS,
    METRIC_RESUMES, PLAN_ORDER, RULESET_FOUNDING, RULESET_V1, UNLIMITED, Plan,
    features_for_plan, is_at_least, limits_for_plan, minimum_plan_for_limit,
    normalize_plan, normalize_ruleset, resume_window,
)


def test_every_feature_has_a_min_plan():
    for key, feature in FEATURES.items():
        assert isinstance(feature.min_plan, Plan), f"{key} has no valid min_plan"
        assert feature.label, f"{key} has no label — the lock surface would render blank"


def test_plans_are_monotonic():
    """Each tier includes everything the tier below it does.

    A customer who upgrades must never lose a capability. This is the property
    that makes `min_plan` a sound basis for "Upgrade to X".
    """
    for lower, higher in zip(PLAN_ORDER, PLAN_ORDER[1:]):
        low = features_for_plan(lower)
        high = features_for_plan(higher)
        missing = low - high
        assert not missing, f"{higher.value} is missing {missing} that {lower.value} includes"


def test_limits_are_monotonic():
    for lower, higher in zip(PLAN_ORDER, PLAN_ORDER[1:]):
        for metric in LIMITS[lower]:
            low = LIMITS[lower][metric]
            high = LIMITS[higher][metric]
            if metric == "organizations":
                continue  # V1 is single-org on every plan (decision 7)
            ok = high == UNLIMITED or (low != UNLIMITED and high >= low)
            assert ok, f"{higher.value}.{metric}={high} is less than {lower.value}.{metric}={low}"


def test_plan_matrix_matches_the_approved_product_decisions():
    """The numbers the plans were sold on. If a tier's allowance changes, this
    test should fail and be updated deliberately — never silently."""
    assert LIMITS[Plan.free][METRIC_RESUMES] == 2
    assert LIMITS[Plan.free][METRIC_MEMBERS] == 1
    assert LIMITS[Plan.free][METRIC_CAMPAIGNS] == 2
    assert LIMITS[Plan.plus][METRIC_RESUMES] == 25
    assert LIMITS[Plan.plus][METRIC_MEMBERS] == 3
    assert LIMITS[Plan.pro][METRIC_RESUMES] == UNLIMITED
    assert LIMITS[Plan.pro][METRIC_MEMBERS] == 25
    assert LIMITS[Plan.enterprise][METRIC_MEMBERS] == UNLIMITED

    # FREE's credits are for the lifetime of the account; paid plans renew.
    assert resume_window(Plan.free) == "lifetime"
    assert resume_window(Plan.plus) == "month"
    assert resume_window(Plan.pro) == "month"


def test_capability_placement():
    """Where each capability unlocks, per the approved matrix."""
    expected = {
        "resume_parser": Plan.free, "ats_score": Plan.free, "basic_ai_summary": Plan.free,
        "full_resume_analysis": Plan.plus, "candidate_comparison": Plan.plus,
        "export_pdf": Plan.plus,
        "ai_copilot": Plan.pro, "semantic_search": Plan.pro,
        "interview_intelligence": Plan.pro, "advanced_analytics": Plan.pro,
        "executive_reports": Plan.pro, "export_excel": Plan.pro,
        "autonomous_agent": Plan.enterprise,
        "api_access": Plan.enterprise, "sso": Plan.enterprise,
        "audit_logs": Plan.enterprise, "dedicated_support": Plan.enterprise,
    }
    for key, plan in expected.items():
        assert FEATURES[key].min_plan is plan, (
            f"{key} should unlock at {plan.value}, not {FEATURES[key].min_plan.value}")


def test_legacy_slugs_never_resolve_to_free():
    """A paying account must not be silently downgraded by a rename."""
    assert normalize_plan("professional") is Plan.plus
    assert normalize_plan("business") is Plan.pro
    assert normalize_plan("PROFESSIONAL") is Plan.plus
    assert normalize_plan(" business ") is Plan.pro


def test_unknown_plan_resolves_to_free():
    for value in ("", None, "gold", "enterprise-plus"):
        assert normalize_plan(value) is Plan.free


def test_unknown_ruleset_resolves_to_v1():
    """Opposite direction from `normalize_plan`, deliberately: an unrecognised
    ruleset must apply the CURRENT rules, never hand out the founding set."""
    for value in ("", None, "legacy", "grandfathered"):
        assert normalize_ruleset(value) == RULESET_V1
    assert normalize_ruleset("founding") == RULESET_FOUNDING


def test_founding_ruleset_keeps_the_pre_monetization_capabilities():
    founding = features_for_plan(Plan.free, ruleset=RULESET_FOUNDING)
    # The four AI capabilities a pre-monetization free org actually had.
    for key in ("ai_copilot", "candidate_comparison", "semantic_search",
                "interview_intelligence"):
        assert key in founding, f"founding orgs must keep {key}"
    assert founding == set(FOUNDING_FEATURES)


def test_founding_ruleset_has_no_limits():
    limits = limits_for_plan(Plan.free, ruleset=RULESET_FOUNDING)
    assert all(v == UNLIMITED for v in limits.values()), limits


def test_founding_does_not_grant_capabilities_that_never_existed():
    """Grandfathering preserves what was promised — it is not a free Enterprise
    plan. BYO AI, SSO and API access did not exist as entitlements before."""
    for key in ("sso", "api_access", "dedicated_support"):
        assert key not in FOUNDING_FEATURES


def test_minimum_plan_for_limit():
    assert minimum_plan_for_limit(METRIC_RESUMES, 2) is Plan.free
    assert minimum_plan_for_limit(METRIC_RESUMES, 3) is Plan.plus
    assert minimum_plan_for_limit(METRIC_RESUMES, 26) is Plan.pro
    assert minimum_plan_for_limit(METRIC_MEMBERS, 1) is Plan.free
    assert minimum_plan_for_limit(METRIC_MEMBERS, 3) is Plan.plus
    assert minimum_plan_for_limit(METRIC_MEMBERS, 26) is Plan.enterprise


def test_limit_overrides_apply():
    limits = limits_for_plan(Plan.pro, overrides={METRIC_MEMBERS: 500})
    assert limits[METRIC_MEMBERS] == 500
    # A garbage override is ignored rather than crashing a request.
    assert limits_for_plan(Plan.pro, overrides={METRIC_MEMBERS: "many"})[METRIC_MEMBERS] == 25


def test_is_at_least():
    assert is_at_least(Plan.pro, Plan.plus)
    assert is_at_least(Plan.plus, Plan.plus)
    assert not is_at_least(Plan.plus, Plan.pro)


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
    print(f"\n{'FAILED' if failures else 'OK'} — {failures} failure(s)")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(_run_all())
