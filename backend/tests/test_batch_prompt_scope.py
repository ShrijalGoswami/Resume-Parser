"""
batch_candidate prompt scope (v1.1).

Interview questions were 4-6 generated lines billed on every analyzed resume,
duplicating the dedicated Interview Intelligence engine. The prompt no longer
requests them; the schema keeps the field (defaulting to []) so analyses stored
before the change — and QA-cache replays — still validate. These tests pin both
halves of that contract.
"""

from __future__ import annotations

from app.ai.prompts.registry import get_prompt
from app.ai.schemas.base import Capability
from app.llm.batch_analyzer import GroqBatchAnalysis
from app.llm.batch_prompts import BATCH_SYSTEM_PROMPT, build_batch_prompt


class TestPromptNoLongerRequestsInterviewQuestions:
    def test_builder_output_has_no_interview_questions_key(self):
        prompt = build_batch_prompt("Senior ML engineer JD", '{"skills": ["python"]}')
        assert "interview_questions" not in prompt
        assert "interview questions" not in prompt.lower()

    def test_registry_rendered_prompt_has_no_interview_questions_key(self):
        # Through the real template path (fencing included), exactly as the
        # orchestrator renders it.
        tpl = get_prompt(Capability.BATCH_CANDIDATE)
        user = tpl.build_user(
            job_description="Senior ML engineer JD",
            resume_json='{"skills": ["python"]}',
        )
        assert "interview_questions" not in user
        assert "interview_questions" not in tpl.system

    def test_prompt_still_requests_the_dashboard_fields(self):
        # The evaluation fields the candidate workflow actually consumes must
        # survive the trim.
        prompt = build_batch_prompt("JD", "{}")
        for key in (
            "candidate_summary", "matching_skills", "missing_skills",
            "relevant_projects", "less_relevant_projects", "strengths",
            "weaknesses", "experience_relevance", "hiring_recommendation",
            "recommendation_explanation",
        ):
            assert f'"{key}"' in prompt, f"prompt no longer requests {key}"

    def test_prompt_version_bumped(self):
        assert get_prompt(Capability.BATCH_CANDIDATE).version == "v1.1"

    def test_json_mode_requirement_still_met(self):
        # Groq's json_object mode requires the word "JSON" in the messages
        # (see test_native_json.py); the trim must not have removed it.
        assert "JSON" in BATCH_SYSTEM_PROMPT
        assert "JSON" in build_batch_prompt("JD", "{}")


class TestSchemaStaysBackwardCompatible:
    def test_legacy_payload_with_questions_still_validates(self):
        legacy = GroqBatchAnalysis(
            candidate_summary="s",
            interview_questions=["Walk through the ranking pipeline."],
        )
        assert legacy.interview_questions == ["Walk through the ranking pipeline."]

    def test_new_payload_without_questions_defaults_to_empty(self):
        assert GroqBatchAnalysis(candidate_summary="s").interview_questions == []
