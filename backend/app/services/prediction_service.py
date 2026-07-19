"""
Predictive Intelligence orchestration (product layer).

Gathers the organization's own data (reusing the report data + knowledge layers),
builds/caches the Digital Twin, and runs DETERMINISTIC forecasts and simulations.
Independent of the AI gateway. A short in-process cache keeps the twin incremental.
"""

from __future__ import annotations

import logging
import time
from dataclasses import asdict
from typing import Any, Optional

from app.db.supabase_client import get_service_client
from app.knowledge import service as knowledge
from app.prediction import SCENARIO_LEVERS, build_twin, prediction_engine
from app.prediction.simulation import simulate as _simulate
from app.services.report_data import gather_report_data

logger = logging.getLogger(__name__)

_TTL = 120
_twin_cache: dict[str, tuple[float, Any]] = {}


def _gather(org_id: str, analytics_repo, campaign_repo, activity_repo) -> dict:
    data = gather_report_data(analytics_repo=analytics_repo, campaign_repo=campaign_repo, activity_repo=activity_repo)
    d: dict[str, Any] = {
        "metrics": data.metrics.model_dump(),
        "campaigns": [c.model_dump() for c in data.campaigns],
        "charts": {"hiring_funnel": data.talent_snapshot.hiring_funnel},
        "ai_insights": {"common_missing_skills": [s.model_dump() for s in data.talent_snapshot.common_missing_skills]},
        "productivity": data.productivity.model_dump(),
    }
    try:
        evo = knowledge.skill_evolution(org_id)
        d["skill_demand"] = evo[-1]["top"] if evo else []
        d["knowledge_count"] = len(knowledge.list_items(org_id, limit=1000))
    except Exception:
        d["skill_demand"], d["knowledge_count"] = [], 0
    return d


def _recruiter_count(org_id: str) -> int:
    try:
        from app.enterprise.repositories import OrgRepository
        return max(1, OrgRepository(org_id).count_members())
    except Exception:
        return 1


def get_twin(org_id: str, *, analytics_repo, campaign_repo, activity_repo, refresh: bool = False):
    hit = _twin_cache.get(org_id)
    now = time.time()
    if hit and not refresh and now - hit[0] < _TTL:
        return hit[1]
    data = _gather(org_id, analytics_repo, campaign_repo, activity_repo)
    twin = build_twin(data, recruiter_count=_recruiter_count(org_id))
    _twin_cache[org_id] = (now, twin)
    # Persist twin state incrementally (best-effort).
    try:
        get_service_client().table("digital_twin_state").upsert(
            {"organization_id": org_id, "state": asdict(twin)}, on_conflict="organization_id").execute()
    except Exception:
        pass
    return twin


def twin_summary(org_id: str, **repos) -> dict:
    return asdict(get_twin(org_id, **repos))


def forecast(org_id: str, forecast_type: str, *, analytics_repo, campaign_repo, activity_repo, record: bool = False, **params) -> dict:
    twin = get_twin(org_id, analytics_repo=analytics_repo, campaign_repo=campaign_repo, activity_repo=activity_repo)
    f = prediction_engine.predict(twin, forecast_type, **params)
    if record:
        _record(org_id, f, params)
    return f.as_dict()


def dashboard(org_id: str, **repos) -> list[dict]:
    twin = get_twin(org_id, **repos)
    return [f.as_dict() for f in prediction_engine.dashboard(twin)]


def simulate(org_id: str, forecast_type: str, levers: dict, *, analytics_repo, campaign_repo, activity_repo, **params) -> dict:
    twin = get_twin(org_id, analytics_repo=analytics_repo, campaign_repo=campaign_repo, activity_repo=activity_repo)
    return _simulate(twin, forecast_type, levers, **params)


def scenarios() -> dict:
    return SCENARIO_LEVERS


def forecast_types() -> list[str]:
    return prediction_engine.types()


def _record(org_id: str, f, params: dict) -> None:
    try:
        get_service_client().table("prediction_snapshots").insert({
            "organization_id": org_id, "forecast_type": f.type, "target": f.target,
            "probability": f.probability, "value": f.value, "confidence": f.confidence,
            "factors": [asdict(x) for x in f.factors], "evidence": f.evidence, "params": params,
        }).execute()
    except Exception:  # pragma: no cover
        pass


def history(org_id: str, limit: int = 50) -> list[dict]:
    try:
        resp = (get_service_client().table("prediction_snapshots").select("*")
                .eq("organization_id", org_id).order("created_at", desc=True).limit(limit).execute())
        return getattr(resp, "data", None) or []
    except Exception:
        return []


# ── AI consumption helper: a short forecast block reports/copilot narrate ────
def forecast_brief(org_id: Optional[str], **repos) -> str:
    """Deterministic forecast summary the LLM EXPLAINS (never generates)."""
    if not org_id:
        return ""
    try:
        forecasts = dashboard(org_id, **repos)
    except Exception:
        return ""
    if not forecasts:
        return ""
    lines = ["### Predictive Forecast (deterministic — explain, do not invent numbers)"]
    for f in forecasts:
        val = f"{round((f.get('probability') or 0) * 100)}%" if f.get("unit") == "probability" else str(f.get("value"))
        lines.append(f"- {f.get('type')}: {val} (confidence {f.get('confidence')}%) — {f.get('summary','')}")
    return "\n".join(lines) + "\n\n"
