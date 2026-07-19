"""Prompt management — versioned templates organized by capability."""

from app.ai.prompts.base import PromptTemplate
from app.ai.prompts.registry import get_prompt, register_prompt

__all__ = ["PromptTemplate", "get_prompt", "register_prompt"]
