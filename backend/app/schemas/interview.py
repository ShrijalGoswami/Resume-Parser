"""
Schemas for the Interview Intelligence Engine (V5 / Sprint 7).

A complete interview workbench: executive summary, interview strategy, technical
and behavioral questions (each fully annotated), skill verification, risk
assessment, an interviewer scorecard, and a final hiring recommendation. The
model fills `InterviewLLMOutput`; the server wraps it into an `InterviewPack` with
candidate identity and the authoritative `sources_used`.
"""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field

from app.schemas.copilot import CopilotSource

# Sections the interactive mode can target (also the follow-up focus keys).
INTERVIEW_SECTIONS = [
    "executive_summary", "interview_strategy", "technical_questions",
    "behavioral_questions", "skill_verifications", "risks", "scorecard",
    "final_recommendation",
]


class InterviewGenerateRequest(BaseModel):
    """Full or focused generation. `focus`/`instruction` drive interactive mode."""
    focus: str = Field(default="blueprint")          # blueprint | technical | behavioral | leadership | manager | culture_fit | scorecard | followup
    instruction: str = Field(default="", max_length=500)  # e.g. "generate harder questions", "only behavioral", "focus on system design"
    sections: Optional[list[str]] = None             # limit output to these sections (interactive follow-ups)


class ExecutiveCandidateSummary(BaseModel):
    who: str = ""
    why_shortlisted: str = ""
    key_differentiators: list[str] = Field(default_factory=list)


class InterviewStage(BaseModel):
    name: str = ""
    duration_minutes: int = 0
    focus: str = ""


class InterviewStrategy(BaseModel):
    recommended_duration_minutes: int = 0
    stages: list[InterviewStage] = Field(default_factory=list)
    priority_focus_areas: list[str] = Field(default_factory=list)
    suggested_interviewer_profile: str = ""


class TechnicalQuestion(BaseModel):
    question: str = ""
    skill: str = ""
    difficulty: str = "Medium"  # Easy | Medium | Hard | Expert
    reason: str = ""
    expected_answer: str = ""
    red_flags: list[str] = Field(default_factory=list)
    followups: list[str] = Field(default_factory=list)
    evaluation_criteria: list[str] = Field(default_factory=list)


class BehavioralQuestion(BaseModel):
    question: str = ""
    competency: str = ""  # leadership | conflict | ownership | decision-making | communication
    reason: str = ""
    expected_answer: str = ""
    warning_signs: list[str] = Field(default_factory=list)


class SkillVerification(BaseModel):
    skill: str = ""
    verification_method: str = ""
    hands_on_exercise: str = ""
    discussion_topic: str = ""
    confidence_level: str = ""  # Low | Medium | High (current evidence strength)


class InterviewRisk(BaseModel):
    category: str = ""  # e.g. Employment gap | Skill inconsistency | Inflated responsibility | Limited production exposure | Missing architecture experience
    detail: str = ""
    how_to_investigate: str = ""


class ScorecardCategory(BaseModel):
    category: str = ""  # Technical | Problem Solving | Communication | Leadership | Learning Ability | Culture Fit | Ownership
    weight: int = 0     # relative weight (0–100)
    suggested_focus: str = ""
    notes: str = ""


class FinalInterviewRecommendation(BaseModel):
    recommendation: str = ""  # Strong Hire | Hire | Borderline | No Hire
    reasoning: str = ""
    uncertainty: str = ""


class InterviewLLMOutput(BaseModel):
    """The structured object the orchestrated LLM returns."""
    executive_summary: ExecutiveCandidateSummary = Field(default_factory=ExecutiveCandidateSummary)
    interview_strategy: InterviewStrategy = Field(default_factory=InterviewStrategy)
    technical_questions: list[TechnicalQuestion] = Field(default_factory=list)
    behavioral_questions: list[BehavioralQuestion] = Field(default_factory=list)
    skill_verifications: list[SkillVerification] = Field(default_factory=list)
    risks: list[InterviewRisk] = Field(default_factory=list)
    scorecard: list[ScorecardCategory] = Field(default_factory=list)
    final_recommendation: FinalInterviewRecommendation = Field(default_factory=FinalInterviewRecommendation)


class InterviewPack(InterviewLLMOutput):
    """The full interview pack returned to the frontend / Copilot."""
    candidate_id: str = ""
    candidate_name: str = ""
    campaign_id: str = ""
    focus: str = "blueprint"
    sources_used: list[CopilotSource] = Field(default_factory=list)
    degraded: bool = False
