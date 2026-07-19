"""
Schemas for Executive Hiring Intelligence reports (V5 / Sprint 8).

An executive report merges DETERMINISTIC metrics (computed server-side from stored
platform data — never fabricated) with an LLM NARRATIVE that explains what is
happening, why, and what to do. The model fills `ExecutiveReportLLMOutput`; the
server attaches the real numbers, the compared roster/snapshot, and the
authoritative `sources_used`.
"""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field

from app.schemas.copilot import CopilotSource

# Report sections the interactive mode can target (follow-up focus keys).
REPORT_SECTIONS = [
    "executive_summary", "campaign_intelligence", "recruiter_productivity",
    "skill_gap", "hiring_risks", "recommendations", "talent_snapshot",
]


class ExecutiveReportRequest(BaseModel):
    """Full or focused report generation (focus/instruction power interactive mode)."""
    focus: str = Field(default="full")          # full | executive_summary | campaign_intelligence | recruiter_productivity | skill_gap | hiring_risks | recommendations
    instruction: str = Field(default="", max_length=500)
    sections: Optional[list[str]] = None


# ── Deterministic (server-computed) ─────────────────────────────────────────
class ReportMetrics(BaseModel):
    total_campaigns: int = 0
    active_campaigns: int = 0
    total_candidates: int = 0
    analyzed_candidates: int = 0
    awaiting_analysis: int = 0
    average_match_score: Optional[float] = None
    average_ats_score: Optional[float] = None
    high_quality_candidates: int = 0


class CampaignSnapshot(BaseModel):
    campaign_id: str = ""
    title: str = ""
    status: str = ""
    role_title: str = ""
    total_candidates: int = 0
    awaiting_analysis: int = 0
    average_match_score: Optional[float] = None
    days_since_activity: Optional[int] = None


class ProductivityMetrics(BaseModel):
    resumes_uploaded: int = 0
    candidates_analyzed: int = 0
    comparisons_run: int = 0
    interview_packs_generated: int = 0
    copilot_messages: int = 0
    stage_changes: int = 0
    notes_added: int = 0


class SkillCount(BaseModel):
    skill: str = ""
    count: int = 0


class TalentSnapshot(BaseModel):
    top_technologies: list[SkillCount] = Field(default_factory=list)
    common_missing_skills: list[SkillCount] = Field(default_factory=list)
    match_distribution: list[dict] = Field(default_factory=list)
    ats_distribution: list[dict] = Field(default_factory=list)
    experience_distribution: list[dict] = Field(default_factory=list)
    hiring_funnel: list[dict] = Field(default_factory=list)


# ── LLM narrative ───────────────────────────────────────────────────────────
class ExecutiveSummaryNarrative(BaseModel):
    headline: str = ""
    pipeline_health: str = ""      # Healthy | At Risk | Critical
    whats_changed: list[str] = Field(default_factory=list)
    blockers: list[str] = Field(default_factory=list)
    immediate_attention: list[str] = Field(default_factory=list)


class CampaignInsight(BaseModel):
    campaign_id: str = ""
    title: str = ""
    headline: str = ""
    explanation: str = ""          # AI explains the trend, not just numbers
    concerns: list[str] = Field(default_factory=list)


class SkillGapAnalysis(BaseModel):
    summary: str = ""
    emerging_demand: list[str] = Field(default_factory=list)
    oversaturated: list[str] = Field(default_factory=list)
    hard_to_fill_roles: list[str] = Field(default_factory=list)


class HiringRisk(BaseModel):
    category: str = ""
    evidence: str = ""
    impact: str = ""
    suggested_action: str = ""


class ExecRecommendation(BaseModel):
    priority: str = "Medium"       # High | Medium | Low
    title: str = ""
    rationale: str = ""
    evidence: str = ""


class ExecutiveReportLLMOutput(BaseModel):
    """The structured narrative the orchestrated LLM returns (grounded in metrics)."""
    executive_summary: ExecutiveSummaryNarrative = Field(default_factory=ExecutiveSummaryNarrative)
    campaign_insights: list[CampaignInsight] = Field(default_factory=list)
    productivity_recommendations: list[str] = Field(default_factory=list)
    skill_gap_analysis: SkillGapAnalysis = Field(default_factory=SkillGapAnalysis)
    hiring_risks: list[HiringRisk] = Field(default_factory=list)
    recommendations: list[ExecRecommendation] = Field(default_factory=list)


class ExecutiveReport(ExecutiveReportLLMOutput):
    """The full report returned to the frontend / Copilot (metrics + narrative)."""
    period: str = "current"
    metrics: ReportMetrics = Field(default_factory=ReportMetrics)
    campaigns: list[CampaignSnapshot] = Field(default_factory=list)
    productivity: ProductivityMetrics = Field(default_factory=ProductivityMetrics)
    talent_snapshot: TalentSnapshot = Field(default_factory=TalentSnapshot)
    sources_used: list[CopilotSource] = Field(default_factory=list)
    degraded: bool = False
