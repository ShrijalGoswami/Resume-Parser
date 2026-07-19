"""
Copilot ↔ Prediction bridge (scenario analysis).

Lets the Recruiter Copilot answer "what happens if…" / "what's the probability…"
questions by invoking the SAME deterministic prediction engine — the Copilot never
computes forecasts itself, and the numbers come from statistical models (the LLM
would only explain them). Returns None when the message is not predictive.
"""

from __future__ import annotations

import logging
import re
from typing import Any, Optional

from app.schemas.copilot import CopilotPageContext, CopilotSource, CopilotStructuredResponse
from app.services import prediction_service as svc

logger = logging.getLogger(__name__)

_TRIGGERS = (
    "what happens if", "what if", "forecast", "predict", "probability", "likelihood",
    "chance", "will we finish", "on track", "how many recruiters", "recruiters will we need",
    "skill shortage", "bottleneck", "what would happen", "simulate", "scenario", "capacity",
)


def _is_prediction(q: str) -> bool:
    ql = f" {q.lower()} "
    return any(t in ql for t in _TRIGGERS)


def _num(q: str, default: int) -> int:
    m = re.search(r"\b(\d+)\b", q)
    return int(m.group(1)) if m else default


def _forecast_type(q: str) -> tuple[str, dict]:
    m = q.lower()
    if "recruiter" in m or "how many" in m or "capacity" in m:
        return "recruiter_capacity", {"open_roles": _num(q, 10)}
    if "skill" in m or "bottleneck" in m:
        return "skill_shortage", {}
    if "cost" in m or "budget" in m or "$" in q:
        return "hiring_cost", {"open_roles": _num(q, 10)}
    if "offer" in m or "accept" in m:
        return "offer_acceptance", {}
    if "interview" in m:
        return "interview_success", {}
    if "delay" in m or "deadline" in m or "miss" in m:
        return "campaign_delay_risk", {}
    if "finish" in m or "complete" in m or "on track" in m:
        return "hiring_completion", {}
    return "pipeline_health", {}


def _levers(q: str) -> dict[str, float]:
    m = q.lower()
    levers: dict[str, float] = {}
    if re.search(r"(increase|raise|higher|bump).{0,20}salary", m):
        levers["increase_salary"] = _num(q, 15)
    elif re.search(r"(reduce|lower|cut|decrease).{0,20}salary", m):
        levers["reduce_salary"] = _num(q, 15)
    if re.search(r"(add|hire|more|increase).{0,20}recruiter", m):
        levers["increase_recruiters"] = _num(q, 3)
    if "remote" in m:
        levers["expand_remote"] = 30
    if "relax" in m or "lower.{0,10}requirement" in m:
        levers["relax_experience"] = 20
    if re.search(r"(open|add).{0,20}(campaign|role|position)", m):
        levers["open_campaigns"] = _num(q, 5)
    return levers


def try_prediction(question: str, page: CopilotPageContext, *, org_id: Optional[str],
                   analytics_repo: Any, campaign_repo: Any, activity_repo: Any):
    if not org_id or not _is_prediction(question):
        return None
    ftype, params = _forecast_type(question)
    levers = _levers(question)
    repos = {"analytics_repo": analytics_repo, "campaign_repo": campaign_repo, "activity_repo": activity_repo}
    if levers:
        result = svc.simulate(org_id, ftype, levers, **repos, **params)
        return result, _render_sim(result)
    result = svc.forecast(org_id, ftype, **repos, **params)
    return result, _render_forecast(result)


def safe_try_prediction(question, page, org_id, analytics_repo, campaign_repo, activity_repo):
    try:
        return try_prediction(question, page, org_id=org_id, analytics_repo=analytics_repo,
                              campaign_repo=campaign_repo, activity_repo=activity_repo)
    except Exception as exc:  # pragma: no cover
        logger.info("Copilot prediction skipped: %s", exc)
        return None


def _val(f: dict) -> str:
    return f"{round((f.get('probability') or 0) * 100)}%" if f.get("unit") == "probability" else str(f.get("value"))


def _render_forecast(f: dict) -> CopilotStructuredResponse:
    lines = [f"**{f.get('summary','Forecast')}**", f"_Deterministic forecast · {f.get('confidence')}% confidence_"]
    if f.get("evidence"):
        lines.append("\n**Evidence**")
        lines += [f"- {e}" for e in f["evidence"][:5]]
    if f.get("alternatives"):
        lines.append(f"\n_Alternatives: {f['alternatives']}_")
    return CopilotStructuredResponse(
        answer="\n".join(lines), summary=f.get("summary", ""),
        recommendations=[fa.get("detail", "") for fa in f.get("factors", []) if fa.get("impact") == "negative"][:4],
        confidence=f.get("confidence", 50),
        reasoning_summary="Computed by the deterministic prediction engine (not the LLM).",
        followups=["What if we increase salary 15%?", "How many recruiters will we need?", "Which skills will bottleneck?"],
        sources_used=[CopilotSource(source="Predictive Intelligence", detail=f.get("type", ""))],
    )


def _render_sim(s: dict) -> CopilotStructuredResponse:
    b, sc = s.get("baseline", {}), s.get("scenario", {})
    lines = [f"**Scenario: {s.get('summary','')}**",
             f"- Baseline: {_val(b)} ({b.get('summary','')})",
             f"- With scenario: {_val(sc)} ({sc.get('summary','')})",
             f"- Net change: {s.get('delta')} ({s.get('direction')})"]
    return CopilotStructuredResponse(
        answer="\n".join(lines), summary=s.get("summary", ""),
        confidence=sc.get("confidence", 50),
        reasoning_summary="Simulated by the deterministic prediction engine (evidence-based elasticities).",
        followups=["Try a different scenario", "How many recruiters will we need?", "What's our pipeline health forecast?"],
        sources_used=[CopilotSource(source="Predictive Intelligence", detail=s.get("forecast_type", ""))],
    )
