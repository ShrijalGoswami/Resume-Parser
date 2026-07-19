"""
Forecast Models — DETERMINISTIC hiring forecasts.

Pure statistical models over the Digital Twin. Same inputs always produce the same
output (no randomness, no LLM). Every forecast is fully explainable: probability,
confidence, the evidence used, contributing factors (with direction), a historical
comparison, and best/worst alternatives.

LLMs may later narrate these — they never generate them.
"""

from __future__ import annotations

import math
from dataclasses import asdict, dataclass, field
from typing import Optional

from app.prediction.confidence import confidence_from_volume
from app.prediction.twin import DigitalTwin


def _logistic(x: float) -> float:
    return 1.0 / (1.0 + math.exp(-max(-30.0, min(30.0, x))))


@dataclass
class Factor:
    name: str
    impact: str          # positive | negative | neutral
    detail: str


@dataclass
class Forecast:
    type: str
    target: str = ""
    unit: str = "probability"     # probability | count | currency | index
    probability: float = 0.0       # 0–1 (for probability unit)
    value: Optional[float] = None  # for count/currency/index
    confidence: int = 50
    summary: str = ""
    evidence: list[str] = field(default_factory=list)
    factors: list[Factor] = field(default_factory=list)
    historical_comparison: str = ""
    alternatives: dict = field(default_factory=dict)

    def as_dict(self) -> dict:
        d = asdict(self)
        d["probability"] = round(self.probability, 3)
        return d


def _conf(twin: DigitalTwin) -> int:
    return confidence_from_volume(twin.data_points)


# ── Hiring Completion Probability ───────────────────────────────────────────
def completion_probability(twin: DigitalTwin, *, campaign_id: str = "") -> Forecast:
    c = twin.campaign(campaign_id)
    if c is None:
        # Org-wide completion proxy.
        progress = twin.analyzed_ratio
        match = twin.average_match / 100.0
        momentum = max(0.0, 1.0 - twin.velocity_days / 30.0)
        title = "the pipeline"
        pool = min(1.0, twin.total_candidates / max(1, twin.active_campaigns * 5))
    else:
        progress = 1.0 - (c.awaiting / c.total_candidates) if c.total_candidates else 0.5
        match = (c.avg_match or 0) / 100.0
        momentum = max(0.0, 1.0 - (c.days_since_activity or 0) / 30.0)
        title = f"'{c.title}'"
        pool = min(1.0, c.total_candidates / 5.0)

    score = -1.2 + 1.8 * progress + 1.6 * match + 1.4 * momentum + 1.0 * pool
    p = _logistic(score)
    factors = [
        Factor("Analysis progress", "positive" if progress > 0.6 else "negative", f"{round(progress*100)}% analysed"),
        Factor("Candidate quality", "positive" if match > 0.6 else "negative", f"avg match {round(match*100)}%"),
        Factor("Momentum", "positive" if momentum > 0.5 else "negative", f"velocity {twin.velocity_days:g}d"),
        Factor("Pool sufficiency", "positive" if pool > 0.6 else "negative", f"{round(pool*100)}% of a healthy pool"),
    ]
    return Forecast(
        type="hiring_completion", target=campaign_id or "organization", probability=p, confidence=_conf(twin),
        summary=f"~{round(p*100)}% likelihood {title} completes hiring on the current trajectory.",
        evidence=[f"Progress {round(progress*100)}%", f"Avg match {round(match*100)}%",
                  f"Velocity {twin.velocity_days:g} days", f"Offer→hire conversion {round(twin.offer_conversion*100)}%"],
        factors=factors,
        historical_comparison=f"Org offer→hire conversion is {round(twin.offer_conversion*100)}%.",
        alternatives={"best_case": round(min(1.0, p + 0.15), 3), "worst_case": round(max(0.0, p - 0.2), 3)},
    )


# ── Campaign Delay Risk ─────────────────────────────────────────────────────
def delay_risk(twin: DigitalTwin, *, campaign_id: str = "", deadline_days: Optional[int] = None) -> Forecast:
    comp = completion_probability(twin, campaign_id=campaign_id)
    risk = 1.0 - comp.probability
    c = twin.campaign(campaign_id)
    if deadline_days is not None and c is not None:
        # Less time + low momentum → higher risk.
        pressure = max(0.0, 1.0 - deadline_days / 30.0)
        risk = min(1.0, risk + 0.4 * pressure * (1 if (c.days_since_activity or 0) > 10 else 0.3))
    return Forecast(
        type="campaign_delay_risk", target=campaign_id or "organization", probability=risk, confidence=comp.confidence,
        summary=f"~{round(risk*100)}% risk of delay.",
        evidence=comp.evidence + ([f"Deadline in {deadline_days} days"] if deadline_days is not None else []),
        factors=comp.factors,
        historical_comparison=comp.historical_comparison,
        alternatives={"best_case": round(max(0.0, risk - 0.2), 3), "worst_case": round(min(1.0, risk + 0.15), 3)},
    )


# ── Offer Acceptance / Interview Success ────────────────────────────────────
def offer_acceptance(twin: DigitalTwin, **_) -> Forecast:
    p = twin.offer_conversion
    return Forecast(type="offer_acceptance", probability=p, confidence=_conf(twin),
        summary=f"~{round(p*100)}% projected offer acceptance (from historical conversion).",
        evidence=[f"Historical offer→hire conversion {round(p*100)}%", f"Funnel offers: {twin.funnel.get('offer',0)}, hires: {twin.funnel.get('hired',0)}"],
        factors=[Factor("Historical conversion", "positive" if p > 0.6 else "negative", f"{round(p*100)}%")],
        historical_comparison="Based on the org's own offer→hire funnel.",
        alternatives={"best_case": round(min(1.0, p + 0.15), 3), "worst_case": round(max(0.0, p - 0.15), 3)})


def interview_success(twin: DigitalTwin, **_) -> Forecast:
    p = twin.interview_pass_rate
    return Forecast(type="interview_success", probability=p, confidence=_conf(twin),
        summary=f"~{round(p*100)}% interview→offer progression rate.",
        evidence=[f"Interview→offer rate {round(p*100)}%", f"Funnel interviews: {twin.funnel.get('interview',0)}"],
        factors=[Factor("Interview pass rate", "positive" if p > 0.4 else "negative", f"{round(p*100)}%")],
        historical_comparison="Derived from the org's interview→offer funnel.",
        alternatives={"best_case": round(min(1.0, p + 0.15), 3), "worst_case": round(max(0.0, p - 0.1), 3)})


# ── Candidate Dropout Risk ──────────────────────────────────────────────────
def candidate_dropout(twin: DigitalTwin, *, campaign_id: str = "") -> Forecast:
    c = twin.campaign(campaign_id)
    stagnation = (c.days_since_activity or twin.velocity_days) if c else twin.velocity_days
    risk = _logistic(-1.0 + stagnation / 15.0)
    return Forecast(type="candidate_dropout", target=campaign_id or "organization", probability=risk, confidence=_conf(twin),
        summary=f"~{round(risk*100)}% candidate dropout risk from pipeline stagnation.",
        evidence=[f"{stagnation:g} days since last activity"],
        factors=[Factor("Stagnation", "negative" if stagnation > 14 else "positive", f"{stagnation:g}d idle")],
        historical_comparison=f"Org velocity averages {twin.velocity_days:g} days.",
        alternatives={"best_case": round(max(0.0, risk - 0.2), 3), "worst_case": round(min(1.0, risk + 0.15), 3)})


# ── Recruiter Capacity Forecast ─────────────────────────────────────────────
def recruiter_capacity(twin: DigitalTwin, *, open_roles: int = 10) -> Forecast:
    # Per-recruiter throughput is fixed at build (scenario-invariant): adding
    # recruiters closes the GAP, it doesn't change how many the workload needs.
    throughput = max(0.5, twin.throughput_per_recruiter)
    needed = math.ceil(open_roles / throughput)
    gap = max(0, needed - twin.recruiter_count)
    return Forecast(type="recruiter_capacity", unit="count", value=float(gap), probability=0.0, confidence=_conf(twin),
        summary=f"{gap} more recruiter(s) needed for {open_roles} open roles ({needed} total vs {twin.recruiter_count} today).",
        evidence=[f"Throughput ~{throughput:.1f} hires/recruiter", f"Current recruiters: {twin.recruiter_count}",
                  f"Roles need ~{needed} recruiters at current throughput"],
        factors=[Factor("Throughput", "neutral", f"{throughput:.1f} hires/recruiter"),
                 Factor("Current headcount", "positive" if gap == 0 else "negative", f"{twin.recruiter_count} recruiters")],
        historical_comparison=f"Each recruiter delivers ~{throughput:.1f} hire(s) historically.",
        alternatives={"lean": max(0, math.ceil(open_roles / (throughput * 1.3)) - twin.recruiter_count),
                      "conservative": max(0, math.ceil(open_roles / (throughput * 0.8)) - twin.recruiter_count)})


# ── Skill Shortage Forecast ─────────────────────────────────────────────────
def skill_shortage(twin: DigitalTwin, **_) -> Forecast:
    shortages = sorted(twin.skill_shortages, key=lambda s: s.get("count", 0), reverse=True)[:6]
    bottlenecks = [s.get("skill") for s in shortages if s.get("count", 0) >= 2]
    top = shortages[0]["count"] if shortages else 0
    p = _logistic(-0.5 + top / 8.0)
    return Forecast(type="skill_shortage", probability=p, confidence=_conf(twin),
        summary=f"{len(bottlenecks)} skill(s) likely to bottleneck hiring: {', '.join(bottlenecks) or 'none'}.",
        evidence=[f"{s.get('skill')}: missing in {s.get('count')} candidate(s)" for s in shortages],
        factors=[Factor("Top gap", "negative", f"{shortages[0]['skill']} ({top})") if shortages else Factor("Gaps", "positive", "none significant")],
        historical_comparison="Based on repeated missing-skill signals across candidates.",
        alternatives={"bottleneck_skills": bottlenecks})


# ── Hiring Cost Projection ──────────────────────────────────────────────────
def hiring_cost(twin: DigitalTwin, *, open_roles: int = 10, cost_per_hire: float = 8000.0) -> Forecast:
    inefficiency = 1.0 / max(0.3, twin.offer_conversion)   # more attrition → more spend
    projected = round(open_roles * cost_per_hire * inefficiency)
    return Forecast(type="hiring_cost", unit="currency", value=float(projected), confidence=_conf(twin),
        summary=f"~${projected:,.0f} projected to fill {open_roles} roles.",
        evidence=[f"Base cost/hire ${cost_per_hire:,.0f}", f"Conversion factor {twin.offer_conversion:.2f}", f"Inefficiency multiplier {inefficiency:.2f}"],
        factors=[Factor("Offer conversion", "positive" if twin.offer_conversion > 0.6 else "negative", f"{round(twin.offer_conversion*100)}%")],
        historical_comparison=f"Assumes org offer→hire conversion of {round(twin.offer_conversion*100)}%.",
        alternatives={"optimistic": round(open_roles * cost_per_hire), "pessimistic": round(projected * 1.3)})


# ── Pipeline Health Forecast ────────────────────────────────────────────────
def pipeline_health(twin: DigitalTwin, **_) -> Forecast:
    idx = 0.35 * twin.analyzed_ratio + 0.30 * (twin.average_match / 100.0) + 0.20 * min(1.0, twin.high_quality / max(1, twin.total_candidates)) + 0.15 * max(0.0, 1.0 - twin.velocity_days / 30.0)
    return Forecast(type="pipeline_health", unit="index", value=round(idx, 3), probability=idx, confidence=_conf(twin),
        summary=f"Projected pipeline-health index {round(idx*100)}/100.",
        evidence=[f"Analysed {round(twin.analyzed_ratio*100)}%", f"Avg match {round(twin.average_match)}", f"High-quality {twin.high_quality}", f"Velocity {twin.velocity_days:g}d"],
        factors=[Factor("Analysis coverage", "positive" if twin.analyzed_ratio > 0.7 else "negative", f"{round(twin.analyzed_ratio*100)}%"),
                 Factor("Quality", "positive" if twin.average_match > 65 else "negative", f"avg {round(twin.average_match)}")],
        historical_comparison="Composite of coverage, quality, depth, and momentum.",
        alternatives={"best_case": round(min(1.0, idx + 0.12), 3), "worst_case": round(max(0.0, idx - 0.15), 3)})


#: Reusable forecast registry.
FORECASTS = {
    "hiring_completion": completion_probability,
    "campaign_delay_risk": delay_risk,
    "offer_acceptance": offer_acceptance,
    "interview_success": interview_success,
    "candidate_dropout": candidate_dropout,
    "recruiter_capacity": recruiter_capacity,
    "skill_shortage": skill_shortage,
    "hiring_cost": hiring_cost,
    "pipeline_health": pipeline_health,
}
