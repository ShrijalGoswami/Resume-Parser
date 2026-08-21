"""
Grandfathering suite — the FOUNDING ruleset.

The promise made when monetization shipped: no existing organization loses
anything. Only organizations created afterwards resolve against the new plan
matrix. That promise is expressed as one column (`subscriptions.plan_ruleset`),
and this suite is what stops a later catalog edit from quietly breaking it.

The failure this guards against is not hypothetical. Before monetization the
FREE plan granted `ai_copilot`, `candidate_comparison` and `semantic_search` by
default; the new FREE plan grants none of them. Without the founding ruleset,
every existing account would have lost three capabilities on deploy day.

Runnable without pytest:  python -m tests.test_grandfathering
(from backend/, with the project venv active)
"""
from __future__ import annotations

import sys

from app.enterprise.catalog import RULESET_FOUNDING, RULESET_V1, Plan
from app.enterprise.entitlements import PlanService
from app.enterprise.usage import UsageSnapshot

#: What a pre-monetization FREE organization could actually do. Sourced from the
#: old `feature_flags._PLAN_DEFAULTS[Plan.free]`, which is the historical record.
PRE_MONETIZATION_FREE = {"ai_copilot", "candidate_comparison", "semantic_search"}


def founding(plan="free", **kw) -> PlanService:
    return PlanService(plan=plan, ruleset=RULESET_FOUNDING, **kw)


def v1(plan="free", **kw) -> PlanService:
    return PlanService(plan=plan, ruleset=RULESET_V1, **kw)


def test_founding_free_org_keeps_every_capability_it_had():
    s = founding()
    for feature in PRE_MONETIZATION_FREE:
        assert s.feature(feature).allowed, (
            f"a grandfathered organization lost {feature} — this is the exact "
            f"regression the founding ruleset exists to prevent")


def test_new_free_org_does_not_get_them():
    s = v1()
    for feature in PRE_MONETIZATION_FREE:
        assert not s.feature(feature).allowed, (
            f"a NEW free organization was granted {feature} — the paid tiers are "
            f"then worth less than they are sold for")


def test_founding_org_has_no_resume_wall():
    s = founding(usage=UsageSnapshot(resumes_lifetime=10_000))
    assert s.can_upload_resume(50).allowed


def test_new_free_org_stops_at_two_resumes():
    s = v1(usage=UsageSnapshot(resumes_lifetime=2))
    d = s.can_upload_resume(1)
    assert not d.allowed
    assert d.limit == 2 and d.used == 2
    assert d.required_plan == "plus"


def test_founding_org_has_no_seat_or_role_cap():
    s = founding(usage=UsageSnapshot(members=40, campaigns=90))
    assert s.can_invite_member().allowed
    assert s.can_create_campaign().allowed


def test_the_one_multi_member_org_in_production_is_not_broken():
    """Pre-flight found exactly one organization with 2 active members, which is
    over the new FREE seat limit of 1. As a founding org it must be unaffected —
    if this fails, a real team stops being able to work together."""
    assert founding(usage=UsageSnapshot(members=2)).can_invite_member().allowed
    assert not v1(usage=UsageSnapshot(members=2)).can_invite_member().allowed


def test_founding_paid_orgs_keep_their_tier():
    """Pre-flight also found two `enterprise` and one `business` organization.
    Their legacy slugs must resolve to the tier they were sold as."""
    assert founding("business").plan is Plan.pro
    assert founding("enterprise").plan is Plan.enterprise


def test_founding_is_not_a_free_upgrade():
    """Grandfathering preserves what existed. It does not hand out capabilities
    that were never available — those are what the new tiers sell."""
    s = founding()
    for never_existed in ("sso", "api_access", "dedicated_support"):
        assert not s.feature(never_existed).allowed


def test_an_org_moved_to_v1_gets_the_new_rules():
    """The ruleset is the lever: flipping one value migrates an organization onto
    the new matrix, and flipping it back restores the old one."""
    assert founding().can_use_copilot().allowed
    assert not v1().can_use_copilot().allowed


def test_founding_orgs_keep_the_subsystems_gated_by_the_audit():
    """Prediction, Knowledge and Integrations were reachable by every
    organization until the monetization audit gated them (1 Aug 2026).

    Grandfathering is about what an account COULD DO on the day monetization
    shipped — not about which release happened to gate a given subsystem. A
    founding org that used the Learning screen yesterday must still have it.
    """
    s = founding()
    for feature in ("predictive_intelligence", "org_knowledge", "integrations", "webhooks"):
        assert s.feature(feature).allowed, (
            f"a grandfathered organization lost {feature} when the audit gated it")


def test_new_orgs_do_not_get_the_audited_subsystems_on_free():
    s = v1()
    for feature in ("predictive_intelligence", "org_knowledge", "integrations"):
        assert not s.feature(feature).allowed
    # …and they unlock where the pricing decision put them.
    assert v1("pro").feature("predictive_intelligence").allowed
    assert v1("pro").feature("org_knowledge").allowed
    assert v1("pro").feature("integrations").allowed
    assert not v1("pro").feature("webhooks").allowed        # Enterprise
    assert v1("enterprise").feature("webhooks").allowed


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
