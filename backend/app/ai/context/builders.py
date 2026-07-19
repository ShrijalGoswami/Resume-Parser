"""
Concrete context builders for the currently-orchestrated capabilities.

Each returns the exact variable mapping its prompt template renders from, so the
call sites stay declarative and the assembly logic lives in one place.
"""

from __future__ import annotations

from typing import Any

from app.schemas.analysis import ScoreBreakdown
from app.schemas.resume import ResumeData


def build_resume_analysis_context(
    resume_data: ResumeData, ats_score: int, breakdown: ScoreBreakdown
) -> dict[str, Any]:
    """Variables for Capability.RESUME_ANALYSIS."""
    return {
        "resume_json": resume_data.model_dump_json(indent=2),
        "ats_score": ats_score,
        "breakdown_json": breakdown.model_dump_json(indent=2),
    }


def build_job_matching_context(resume_data: ResumeData, job_description: str) -> dict[str, Any]:
    """Variables for Capability.JOB_MATCHING."""
    return {
        "resume_json": resume_data.model_dump_json(indent=2),
        "job_description": job_description,
    }


def build_batch_candidate_context(resume_data: ResumeData, job_description: str) -> dict[str, Any]:
    """Variables for Capability.BATCH_CANDIDATE."""
    return {
        "resume_json": resume_data.model_dump_json(indent=2),
        "job_description": job_description,
    }
