"""Catalog snapshot parity — the backend half of the frontend mirror contract.

The frontend keeps a hand-written presentation mirror of the plan catalog. A
hand-written mirror drifts, and the drift is expensive in a specific way: it does
not break anything loudly, it just shows a customer the wrong feature name, the
wrong limit, or the wrong upgrade tier. So both sides are pinned to a generated
artifact.

    catalog.py  ──(export_catalog_snapshot)──>  catalog.snapshot.json  <──  catalog.ts
                        this file asserts ↑              ↑ entitlements-catalog.test.ts

This half fails when the catalog changed and the artifact was not regenerated.
The other half fails when the artifact changed and the mirror was not updated.
Neither can pass on stale data, which is the property worth having.

Runnable without pytest:  python -m tests.test_catalog_snapshot_parity
(from backend/, with the project venv active)
"""
from __future__ import annotations

import sys

from scripts.export_catalog_snapshot import ARTIFACT, render

REGENERATE = "cd backend && .venv/Scripts/python.exe -m scripts.export_catalog_snapshot"


def check_artifact_exists() -> list[str]:
    if not ARTIFACT.exists():
        return [f"catalog snapshot missing at {ARTIFACT} — run: {REGENERATE}"]
    return []


def check_artifact_matches_catalog() -> list[str]:
    """Byte-for-byte, not a parsed comparison.

    The frontend test reads this file as data, so formatting is part of what is
    being kept stable; and a mismatch that only shows up after both sides parse
    is a mismatch that survived review.
    """
    if not ARTIFACT.exists():
        return []
    actual = ARTIFACT.read_text(encoding="utf-8")
    if actual != render():
        return [
            "catalog.snapshot.json is stale — app/enterprise/catalog.py changed "
            f"without regenerating it. Run: {REGENERATE}"
        ]
    return []


def check_artifact_is_complete() -> list[str]:
    """The fields the frontend mirror depends on must all be present.

    Guards against a future `catalog_snapshot()` that quietly stops emitting one
    of them: the frontend test would compare against an artifact missing the
    field and pass, so the contract would silently weaken to nothing.
    """
    import json

    if not ARTIFACT.exists():
        return []
    data = json.loads(ARTIFACT.read_text(encoding="utf-8"))
    failures: list[str] = []
    if data.get("ruleset") != "v1":
        failures.append("snapshot must export the v1 ruleset (founding renders no locks)")
    for key in ("plans", "features", "metrics"):
        if not data.get(key):
            failures.append(f"snapshot is missing '{key}'")
    for feature in data.get("features", []):
        for field in ("key", "label", "min_plan"):
            if field not in feature:
                failures.append(f"feature {feature.get('key', '?')} is missing '{field}'")
    for plan in data.get("plans", []):
        for field in ("key", "label", "rank", "limits", "resume_window", "features"):
            if field not in plan:
                failures.append(f"plan {plan.get('key', '?')} is missing '{field}'")
    return failures


CHECKS = (
    check_artifact_exists,
    check_artifact_matches_catalog,
    check_artifact_is_complete,
)


def run_all() -> list[str]:
    failures: list[str] = []
    for check in CHECKS:
        failures.extend(check())
    return failures


def test_snapshot_artifact_exists() -> None:
    assert not check_artifact_exists()


def test_snapshot_matches_live_catalog() -> None:
    assert not check_artifact_matches_catalog()


def test_snapshot_carries_every_mirrored_field() -> None:
    assert not check_artifact_is_complete()


def test_all_checks_pass() -> None:
    """Asserting bridge.

    The checks above double as a standalone runner and RETURN their failures.
    pytest treats a returned list as a pass, so without this bridge the runner
    could report FAILED while CI reported green — a defect this repo has already
    been bitten by once. If you add a check, add it to `CHECKS`.
    """
    failures = run_all()
    assert not failures, "\n".join(failures)


if __name__ == "__main__":
    problems = run_all()
    for problem in problems:
        print(f"FAIL: {problem}")
    print("FAILED" if problems else "PASSED")
    sys.exit(1 if problems else 0)
