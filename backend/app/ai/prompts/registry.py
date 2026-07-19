"""
Prompt registry — capability → PromptTemplate.

Reuses the existing, battle-tested prompt text/builders from `app.llm.*_prompts`
(single source of truth) while formalizing versioning and lookup. New
capabilities register a template here; nothing embeds long prompts in routes.
"""

from __future__ import annotations

from app.ai.prompts.base import PromptTemplate
from app.ai.schemas.base import Capability
from app.ai.utils.errors import AIConfigError

# Reuse existing prompts — do NOT duplicate the text.
from app.llm.prompts import SYSTEM_PROMPT, build_analysis_prompt
from app.llm.match_prompts import MATCH_SYSTEM_PROMPT, build_match_prompt
from app.llm.batch_prompts import BATCH_SYSTEM_PROMPT, build_batch_prompt
from app.ai.prompts.copilot import (
    COPILOT_SYSTEM_PROMPT,
    COPILOT_PROMPT_VERSION,
    build_copilot_prompt,
)
from app.ai.prompts.comparison import (
    COMPARISON_SYSTEM_PROMPT,
    COMPARISON_PROMPT_VERSION,
    build_comparison_prompt,
)
from app.ai.prompts.interview import (
    INTERVIEW_SYSTEM_PROMPT,
    INTERVIEW_PROMPT_VERSION,
    build_interview_prompt,
)
from app.ai.prompts.report import (
    EXECUTIVE_REPORT_SYSTEM_PROMPT,
    EXECUTIVE_REPORT_PROMPT_VERSION,
    build_report_prompt,
)
from app.ai.prompts.agent import (
    AGENT_REASONING_SYSTEM_PROMPT,
    AGENT_PROMPT_VERSION,
    build_agent_prompt,
)

_REGISTRY: dict[Capability, PromptTemplate] = {
    Capability.RESUME_ANALYSIS: PromptTemplate(
        id="resume_analysis",
        version="v1.0",
        system=SYSTEM_PROMPT,
        render=lambda **v: build_analysis_prompt(v["resume_json"], v["ats_score"], v["breakdown_json"]),
        description="Explain deterministic ATS scores (LLM produces text only).",
    ),
    Capability.JOB_MATCHING: PromptTemplate(
        id="job_matching",
        version="v1.1",
        system=MATCH_SYSTEM_PROMPT,
        render=lambda **v: build_match_prompt(v["job_description"], v["resume_json"]),
        description="Compare a resume against a job description (text only; scores are deterministic).",
    ),
    Capability.BATCH_CANDIDATE: PromptTemplate(
        id="batch_candidate",
        version="v1.0",
        system=BATCH_SYSTEM_PROMPT,
        render=lambda **v: build_batch_prompt(v["job_description"], v["resume_json"]),
        description="Single JD-aware candidate analysis used by batch ranking.",
    ),
    Capability.RECRUITER_COPILOT: PromptTemplate(
        id="recruiter_copilot",
        version=COPILOT_PROMPT_VERSION,
        system=COPILOT_SYSTEM_PROMPT,
        render=lambda **v: build_copilot_prompt(
            v["context"],
            v.get("available_sources", []),
            v.get("history_text", ""),
            v["question"],
            v.get("intent", "general"),
        ),
        description="Context-aware recruiter copilot Q&A grounded in platform data.",
    ),
    Capability.CANDIDATE_COMPARISON: PromptTemplate(
        id="candidate_comparison",
        version=COMPARISON_PROMPT_VERSION,
        system=COMPARISON_SYSTEM_PROMPT,
        render=lambda **v: build_comparison_prompt(
            v["context"], v["roster"], v.get("question", "")
        ),
        description="Executive comparison of 2–5 candidates grounded in stored data.",
    ),
    Capability.INTERVIEW_GENERATION: PromptTemplate(
        id="interview_generation",
        version=INTERVIEW_PROMPT_VERSION,
        system=INTERVIEW_SYSTEM_PROMPT,
        render=lambda **v: build_interview_prompt(
            v["context"], v["candidate_line"],
            v.get("focus", "blueprint"), v.get("instruction", ""), v.get("sections"),
        ),
        description="Grounded interview workbench (strategy, questions, verification, scorecard).",
    ),
    Capability.EXECUTIVE_REPORT: PromptTemplate(
        id="executive_report",
        version=EXECUTIVE_REPORT_PROMPT_VERSION,
        system=EXECUTIVE_REPORT_SYSTEM_PROMPT,
        render=lambda **v: build_report_prompt(
            v["context"], v.get("focus", "full"), v.get("instruction", ""), v.get("sections"),
        ),
        description="Executive hiring intelligence briefing grounded in real platform metrics.",
    ),
    Capability.AGENT_REASONING: PromptTemplate(
        id="agent_reasoning",
        version=AGENT_PROMPT_VERSION,
        system=AGENT_REASONING_SYSTEM_PROMPT,
        render=lambda **v: build_agent_prompt(v["situations"]),
        description="Prioritise detected agent situations into a recruiter briefing.",
    ),
}


def register_prompt(capability: Capability, template: PromptTemplate) -> None:
    _REGISTRY[capability] = template


def get_prompt(capability: Capability) -> PromptTemplate:
    template = _REGISTRY.get(capability)
    if template is None:
        raise AIConfigError(f"No prompt registered for capability '{capability.value}'.")
    return template
