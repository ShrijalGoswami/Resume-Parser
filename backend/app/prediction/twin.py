"""
Organizational Digital Twin.

A deterministic, internal model of the organization's hiring system built ONLY from
its own data (analytics + knowledge + activity). The twin is the simulation
environment forecasts run against. Pure — the service supplies gathered data; no
DB/LLM here.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class CampaignModel:
    id: str
    title: str
    status: str
    total_candidates: int = 0
    awaiting: int = 0
    avg_match: float | None = None
    days_since_activity: int | None = None


@dataclass
class DigitalTwin:
    # Aggregate state
    total_campaigns: int = 0
    active_campaigns: int = 0
    total_candidates: int = 0
    analyzed_candidates: int = 0
    high_quality: int = 0
    average_match: float = 0.0
    recruiter_count: int = 1
    campaigns: list[CampaignModel] = field(default_factory=list)
    funnel: dict[str, int] = field(default_factory=dict)   # stage → count
    skill_demand: list[dict] = field(default_factory=list)  # [{skill, count}]
    skill_shortages: list[dict] = field(default_factory=list)  # [{skill, count}]
    productivity: dict[str, int] = field(default_factory=dict)
    # Derived rates
    offer_conversion: float = 0.6          # offer → hire (historical or default)
    interview_pass_rate: float = 0.4       # interview → offer
    analyzed_ratio: float = 1.0
    velocity_days: float = 7.0             # avg days between activity (lower = faster)
    throughput_per_recruiter: float = 1.0  # hires per recruiter (fixed at build; scenario-invariant)
    data_points: int = 0                   # evidence volume (drives confidence)

    def campaign(self, campaign_id: str) -> CampaignModel | None:
        return next((c for c in self.campaigns if c.id == campaign_id), None)


def _funnel_rate(funnel: dict[str, int], numer_stage: str, denom_stages: list[str], default: float) -> float:
    denom = sum(funnel.get(s, 0) for s in denom_stages)
    if denom <= 0:
        return default
    return round(funnel.get(numer_stage, 0) / denom, 3)


def build_twin(data: dict[str, Any], *, recruiter_count: int = 1) -> DigitalTwin:
    """Build the twin from gathered org data (analytics overview + knowledge)."""
    metrics = data.get("metrics", {})
    campaigns_raw = data.get("campaigns", [])
    charts = data.get("charts", {})
    ai = data.get("ai_insights", {})
    funnel = {row.get("stage"): row.get("count", 0) for row in (charts.get("hiring_funnel") or []) if row.get("stage")}

    campaigns = [CampaignModel(
        id=c.get("campaign_id") or c.get("id", ""), title=c.get("title", ""), status=c.get("status", ""),
        total_candidates=c.get("total_candidates", 0), awaiting=c.get("awaiting_analysis", 0),
        avg_match=c.get("average_match_score"), days_since_activity=c.get("days_since_activity"),
    ) for c in campaigns_raw]

    total = metrics.get("total_candidates", 0) or 0
    analyzed = metrics.get("analyzed_candidates", 0) or 0
    active_days = [c.days_since_activity for c in campaigns if c.days_since_activity is not None]
    velocity = round(sum(active_days) / len(active_days), 1) if active_days else 7.0

    twin = DigitalTwin(
        total_campaigns=metrics.get("total_campaigns", 0) or 0,
        active_campaigns=metrics.get("active_campaigns", 0) or 0,
        total_candidates=total, analyzed_candidates=analyzed,
        high_quality=metrics.get("high_quality_candidates", 0) or 0,
        average_match=metrics.get("average_match_score") or 0.0,
        recruiter_count=max(1, recruiter_count),
        campaigns=campaigns, funnel=funnel,
        skill_demand=data.get("skill_demand", []),
        skill_shortages=ai.get("common_missing_skills", []) if isinstance(ai, dict) else [],
        productivity=data.get("productivity", {}),
        offer_conversion=_funnel_rate(funnel, "hired", ["hired", "offer"], 0.6),
        interview_pass_rate=_funnel_rate(funnel, "offer", ["offer", "interview"], 0.4),
        analyzed_ratio=round(analyzed / total, 3) if total else 1.0,
        velocity_days=velocity,
        throughput_per_recruiter=round(max(0.5, funnel.get("hired", 0) / max(1, recruiter_count)), 2),
        data_points=total + len(campaigns) * 5 + data.get("knowledge_count", 0),
    )
    return twin
