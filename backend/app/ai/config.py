"""
Centralized AI configuration.

Single source of truth for provider/model/temperature/limits, sourced from the
app settings (env-driven). No scattered constants — every AI call resolves its
parameters here, with optional per-call overrides handled by the orchestrator.
"""

from __future__ import annotations

from dataclasses import dataclass

from app.core.config import settings


@dataclass(frozen=True)
class AIConfig:
    default_provider: str
    default_model: str
    temperature: float
    max_tokens: int
    timeout_seconds: int
    max_network_retries: int
    max_json_retries: int
    max_schema_retries: int
    # Embeddings (retrieval layer — separate from the LLM).
    embedding_provider: str
    embedding_model: str
    embedding_dimensions: int


def get_ai_config() -> AIConfig:
    """Resolve the active AI configuration from settings."""
    return AIConfig(
        default_provider=settings.AI_DEFAULT_PROVIDER,
        default_model=settings.AI_DEFAULT_MODEL,
        temperature=settings.AI_TEMPERATURE,
        max_tokens=settings.AI_MAX_TOKENS,
        timeout_seconds=settings.AI_TIMEOUT_SECONDS,
        max_network_retries=settings.AI_MAX_NETWORK_RETRIES,
        max_json_retries=settings.AI_MAX_JSON_RETRIES,
        max_schema_retries=settings.AI_MAX_SCHEMA_RETRIES,
        embedding_provider=settings.EMBEDDING_PROVIDER,
        embedding_model=settings.EMBEDDING_MODEL,
        embedding_dimensions=settings.EMBEDDING_DIMENSIONS,
    )
