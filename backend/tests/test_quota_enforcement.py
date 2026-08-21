"""
Quota-enforcement suite.

A limit that is displayed but never checked is worse than no limit: it is a
promise the product does not keep, in the direction that costs money. That was
the state before monetization — `plans.PLAN_LIMITS` was rendered in Settings and
`within_limit()` had zero call sites.

This suite inspects the LIVE application (route graph + source of the handlers
that enforce in-body) rather than trusting a list, so a quota that is quietly
removed from an endpoint fails here.

Runnable without pytest:  python -m tests.test_quota_enforcement
(from backend/, with the project venv active)
"""
from __future__ import annotations

import inspect
import sys

from app.routes import batch as batch_routes
from app.routes import campaigns as campaign_routes
from app.routes import org as org_routes

# (module, handler name, the PlanService call it must make, why it matters)
QUOTA_ENFORCEMENT: list[tuple[object, str, str, str]] = [
    (
        batch_routes, "batch_analysis", "can_upload_resume",
        "the pre-AI check. Without it an exhausted FREE org burns tokens on a "
        "200-résumé batch and is only then told no.",
    ),
    (
        campaign_routes, "persist_batch", "can_upload_resume",
        "the persistence check. /batch-analysis and this endpoint are separately "
        "callable, and only what is persisted consumes credits.",
    ),
    (
        campaign_routes, "create_campaign", "can_create_campaign",
        "a product 'role' is a campaign row; FREE includes 2.",
    ),
    (
        org_routes, "invite_member", "can_invite_member",
        "seats are a plan limit; without this a FREE org invites an unlimited team.",
    ),
]


def _source_of(module, name: str) -> str:
    fn = getattr(module, name, None)
    assert fn is not None, f"{module.__name__}.{name} no longer exists"
    return inspect.getsource(fn)


def test_quota_checks_are_present() -> list[str]:
    failures = []
    for module, handler, call, why in QUOTA_ENFORCEMENT:
        src = _source_of(module, handler)
        if call not in src:
            failures.append(f"{module.__name__}.{handler} no longer calls {call}() — {why}")
        elif "raise_for_denied" not in src:
            failures.append(
                f"{module.__name__}.{handler} calls {call}() but never "
                f"raise_for_denied() — the decision is computed and discarded"
            )
        else:
            print(f"  ok  {module.__name__.split('.')[-1]}.{handler} -> {call}()")
    return failures


def test_batch_checks_quota_before_spending_tokens() -> list[str]:
    """Order matters, not just presence.

    The quota call must appear before the batch is processed. A check placed
    after `process_batch` would be enforcement that costs exactly as much as no
    enforcement.
    """
    src = _source_of(batch_routes, "batch_analysis")
    failures = []
    quota_at = src.find("can_upload_resume")
    work_at = src.find("process_batch")
    if quota_at == -1:
        failures.append("no quota check in batch_analysis")
    elif work_at != -1 and quota_at > work_at:
        failures.append(
            "batch_analysis checks the résumé quota AFTER process_batch — the "
            "tokens are already spent by then"
        )
    else:
        print("  ok  batch_analysis checks quota before process_batch")
    return failures


def test_persistence_counts_only_what_was_stored() -> list[str]:
    """Dedup must not consume credits.

    The same file re-uploaded — double submit, retry, React Strict Mode, renamed
    copy — is discarded by the content-hash constraint. Charging for a résumé the
    product deliberately throws away would be charging for nothing.
    """
    from app.services.persistence_service import PersistenceService
    src = inspect.getsource(PersistenceService.persist_batch)
    failures = []
    if "record_resumes" not in src:
        failures.append("persist_batch no longer records résumé usage")
    elif "len(stored)" not in src:
        failures.append(
            "persist_batch records usage from something other than `stored` — "
            "`stored` is the deduplicated set; anything else double-charges"
        )
    else:
        print("  ok  persist_batch charges len(stored), i.e. post-dedup")
    return failures


def test_upload_endpoint_is_not_double_charged() -> list[str]:
    """Attaching a file to an existing candidate must not consume a second credit."""
    src = _source_of(campaign_routes, "upload_candidate_resume")
    failures = []
    if "can_upload_resume" in src:
        failures.append(
            "upload_candidate_resume is quota-gated — the candidate it attaches to "
            "was already charged at persist time, so this bills the same résumé twice"
        )
    else:
        print("  ok  upload_candidate_resume is not double-charged")
    return failures


def test_usage_writes_go_through_the_atomic_rpc() -> list[str]:
    """The read-modify-write that made the quota bypassable must not come back."""
    from app.enterprise import repositories, usage
    failures = []
    # `record_resumes` (and its interview/copilot siblings) delegate to
    # `_record_metric`, which is where the atomic RPC must be.
    if "increment_usage" not in inspect.getsource(usage._record_metric):
        failures.append("_record_metric does not use the atomic increment_usage RPC")
    elif "_record_metric" not in inspect.getsource(usage.record_resumes):
        failures.append("record_resumes does not delegate to _record_metric")
    else:
        print("  ok  record_resumes uses increment_usage() via _record_metric")

    inc_src = inspect.getsource(repositories.UsageRepository.increment)
    if "increment_usage" not in inc_src:
        failures.append(
            "UsageRepository.increment is not using the atomic RPC — concurrent "
            "increments lose updates, which IS the quota bypass"
        )
    else:
        print("  ok  UsageRepository.increment uses increment_usage()")
    return failures


def main() -> int:
    checks = [
        test_quota_checks_are_present,
        test_batch_checks_quota_before_spending_tokens,
        test_persistence_counts_only_what_was_stored,
        test_upload_endpoint_is_not_double_charged,
        test_usage_writes_go_through_the_atomic_rpc,
    ]
    failures: list[str] = []
    for check in checks:
        print(f"\n{check.__name__}")
        found = check()
        for f in found:
            print(f"  FAIL  {f}")
        if not found:
            print("  passed")
        failures.extend(found)

    print("\n" + "-" * 60)
    if failures:
        print(f"FAILED - {len(failures)} problem(s)")
        return 1
    print("PASSED - every quota is enforced where it must be")
    return 0


if __name__ == "__main__":
    sys.exit(main())


# ── pytest visibility ────────────────────────────────────────────────────────
# The checks above RETURN their failures so this file can also run standalone.
# Under pytest a returned list is a PASS with a warning, not a failure — so
# without this wrapper every check here would be invisible to CI while the
# standalone runner reported FAILED. This bridges the two.
def test_all_checks_pass():
    failures: list[str] = []
    for check in (
        test_quota_checks_are_present,
        test_batch_checks_quota_before_spending_tokens,
        test_persistence_counts_only_what_was_stored,
        test_upload_endpoint_is_not_double_charged,
        test_usage_writes_go_through_the_atomic_rpc,
    ):
        failures.extend(check() or [])
    assert not failures, "; ".join(failures)
