"""
Knowledge Timeline + emergent Organizational Preferences.

Temporal reasoning over accumulated memory: what changed over time, and skill-demand
evolution ("when did React become our most-requested skill?"). Preferences are
DERIVED from accumulated evidence — never hardcoded.
"""

from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime, timezone
from typing import Any


def _month(occurred_at: Any) -> str:
    try:
        dt = occurred_at if isinstance(occurred_at, datetime) else datetime.fromisoformat(str(occurred_at).replace("Z", "+00:00"))
        return f"{dt.year:04d}-{dt.month:02d}"
    except Exception:
        return "unknown"


def _cutoff(months: int) -> datetime:
    now = datetime.now(timezone.utc)
    y, m = now.year, now.month - months
    while m <= 0:
        m += 12
        y -= 1
    return now.replace(year=y, month=m)


def timeline(items: list[dict], *, months: int = 6) -> list[dict]:
    """Recent memory grouped by month (most recent first)."""
    buckets: dict[str, list[dict]] = defaultdict(list)
    for it in items:
        buckets[_month(it.get("occurred_at"))].append(it)
    out = []
    for month in sorted(buckets, reverse=True):
        entries = buckets[month]
        out.append({"month": month, "count": len(entries),
                    "highlights": [e.get("value_text", "")[:160] for e in entries[:4]]})
    return out


def skill_evolution(items: list[dict]) -> list[dict]:
    """Skill/technology mention counts per month → demand evolution."""
    by_month: dict[str, Counter] = defaultdict(Counter)
    for it in items:
        month = _month(it.get("occurred_at"))
        for e in it.get("entities") or []:
            if isinstance(e, dict) and e.get("type") in ("skill", "technology") and e.get("name"):
                by_month[month][e["name"]] += 1
    out = []
    for month in sorted(by_month):
        out.append({"month": month, "top": [{"skill": s, "count": c} for s, c in by_month[month].most_common(5)]})
    return out


def derive_preferences(items: list[dict]) -> dict[str, Any]:
    """Emergent organizational preferences from accumulated evidence."""
    tech = Counter()
    universities = Counter()
    decisions = Counter()
    for it in items:
        if it.get("status") not in (None, "active"):
            continue
        for e in it.get("entities") or []:
            if not isinstance(e, dict):
                continue
            if e.get("type") in ("technology", "skill"):
                tech[e["name"]] += 1
            elif e.get("type") == "university":
                universities[e["name"]] += 1
        if it.get("kind") == "decision" and it.get("object"):
            decisions[it["object"]] += 1
    return {
        "preferred_technologies": [{"name": n, "evidence": c} for n, c in tech.most_common(10)],
        "preferred_universities": [{"name": n, "evidence": c} for n, c in universities.most_common(5)],
        "decision_patterns": [{"outcome": n, "count": c} for n, c in decisions.most_common(5)],
        "total_evidence": sum(tech.values()) + sum(universities.values()) + sum(decisions.values()),
    }
