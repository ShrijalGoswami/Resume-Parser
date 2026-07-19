"""
AI Foundation Layer (V5 / Sprint 3).

Every AI interaction in the product flows through this module. Nothing outside
`app.ai` should call an LLM provider directly — call the orchestrator instead:

    from app.ai import orchestrator, Capability
    result = orchestrator.run(
        capability=Capability.RESUME_ANALYSIS,
        variables={...},
        schema=GroqExplanation,
    )
    explanation = result.data          # validated schema instance
    result.execution.latency_ms        # observability metadata

Submodules:
    config       centralized AI configuration
    providers    provider abstraction (Groq today; OpenAI/Anthropic/Gemini/OpenRouter later)
    prompts      versioned prompt templates, organized by capability
    context      reusable context builders
    schemas      structured request/response/execution types
    orchestrator central orchestration service
    utils        errors + JSON parsing helpers
"""

from app.ai.schemas.base import Capability, AIExecution, AIResult
from app.ai.orchestrator.orchestrator import orchestrator
from app.ai.gateway import ModelRole
from app.ai.utils.errors import (
    AIError,
    AIConfigError,
    AIProviderError,
    AIParseError,
    AIValidationError,
    AITimeoutError,
)

__all__ = [
    "orchestrator",
    "Capability",
    "ModelRole",
    "AIExecution",
    "AIResult",
    "AIError",
    "AIConfigError",
    "AIProviderError",
    "AIParseError",
    "AIValidationError",
    "AITimeoutError",
]
