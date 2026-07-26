"""
Copilot dashboard/analytics grounding.

`build_dashboard_context` renders the analytics overview into the text the LLM is
grounded on. It previously read the aggregate metrics from the top level of the
payload while `AnalyticsRepository.overview()` nests them under an "overview"
sub-object. Every metric resolved to None, the block rendered "(no metrics)", and
the only candidate figure left in context was the single "strongest candidate" —
so "how many candidates have been analyzed?" was answered "only 1", with a
Campaign Analytics citation and high confidence. Silently missing context is
worse than absent context: it produces a confident wrong answer.

These assert against the real nested shape.

Runnable without pytest:  python -m tests.test_copilot_dashboard_context
(from backend/, with the project venv active)
"""
from __future__ import annotations

import sys

from app.ai.context.copilot_context import build_dashboard_context

# The exact shape AnalyticsRepository.overview() returns (trimmed).
NESTED = {
    "overview": {
        "active_campaigns": 1,
        "total_campaigns": 1,
        "total_candidates": 4,
        "analyzed_candidates": 4,
        "awaiting_analysis": 0,
        "average_match_score": 52,
        "average_ats_score": 64,
        "high_quality_candidates": 0,
        "high_quality_threshold": 80,
    },
    "ai_insights": {
        "strongest_candidate": {"name": "Elena Vasquez", "overall_score": 64},
        "common_missing_skills": [{"skill": "Apache Kafka", "count": 3}],
        "candidates_requiring_review_count": 4,
    },
    "charts": {},
}


def test_nested_metrics_reach_the_context() -> list[str]:
    block = build_dashboard_context(NESTED)
    failures = []
    for needle in (
        "Total candidates: 4",
        "Analyzed candidates: 4",
        "Average match score: 52",
        "Average ATS score: 64",
        "Active campaigns: 1",
        "High-quality candidates: 0",
    ):
        if needle not in block:
            failures.append(f"missing from context: {needle!r}")
    if "(no metrics)" in block:
        failures.append("rendered '(no metrics)' despite metrics being present")
    return failures


def test_flat_shape_still_supported() -> list[str]:
    """Defensive: a flat overview must keep working."""
    flat = {"total_candidates": 7, "analyzed_candidates": 5, "average_match_score": 61}
    block = build_dashboard_context(flat)
    failures = []
    for needle in ("Total candidates: 7", "Analyzed candidates: 5", "Average match score: 61"):
        if needle not in block:
            failures.append(f"flat shape lost: {needle!r}")
    return failures


def test_strongest_candidate_is_not_the_only_candidate_figure() -> list[str]:
    """The bug's signature: strongest candidate present, aggregates absent."""
    block = build_dashboard_context(NESTED)
    failures = []
    if "Elena Vasquez" not in block:
        failures.append("strongest candidate should still be included")
    # If aggregates are missing while the strongest candidate is present, an LLM
    # will conclude there is exactly one candidate. Guard that combination.
    if "Elena Vasquez" in block and "Analyzed candidates:" not in block:
        failures.append(
            "context names a single candidate with no aggregate counts — this is the "
            "shape that produced 'only 1 candidate has been analyzed'"
        )
    return failures


def test_empty_overview_is_honest() -> list[str]:
    block = build_dashboard_context({})
    return [] if "no analytics available yet" in block else ["empty overview should say so plainly"]


def main() -> int:
    checks = [
        test_nested_metrics_reach_the_context,
        test_flat_shape_still_supported,
        test_strongest_candidate_is_not_the_only_candidate_figure,
        test_empty_overview_is_honest,
    ]
    all_failures: list[str] = []
    for check in checks:
        print(f"\n{check.__name__}")
        failures = check()
        if failures:
            for f in failures:
                print(f"  FAIL  {f}")
            all_failures.extend(failures)
        else:
            print("  passed")

    print("\n" + "-" * 60)
    if all_failures:
        print(f"FAILED — {len(all_failures)} problem(s)")
        return 1
    print("PASSED — analytics metrics reach the copilot's grounding context")
    return 0


if __name__ == "__main__":
    sys.exit(main())
