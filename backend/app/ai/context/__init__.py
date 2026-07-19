"""Reusable context builders — compose these instead of hand-assembling prompts."""

from app.ai.context.builders import (
    build_resume_analysis_context,
    build_job_matching_context,
    build_batch_candidate_context,
)
from app.ai.context.copilot_context import (
    build_campaign_context,
    build_dashboard_context,
    classify_intent,
    format_history,
)

__all__ = [
    "build_resume_analysis_context",
    "build_job_matching_context",
    "build_batch_candidate_context",
    "build_campaign_context",
    "build_dashboard_context",
    "classify_intent",
    "format_history",
]
