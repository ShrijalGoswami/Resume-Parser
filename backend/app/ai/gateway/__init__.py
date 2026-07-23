"""
AI Gateway (V5 / Sprint 7.5).

The single decision point for provider + model selection. Every AI request (LLM
or embedding) resolves through here, so the whole platform switches vendors by
configuration only — no feature-level code changes.

    from app.ai.gateway import ModelRole, resolve, fallback_chain, usage_tracker
"""

from app.ai.gateway.roles import ModelRole
from app.ai.gateway.gateway import (
    ModelSelection,
    active_provider,
    clear_override,
    config_snapshot,
    cost_of,
    fallback_chain,
    resolve,
    resolve_embedding,
    set_active_provider,
)
from app.ai.gateway.usage import usage_tracker
from app.ai.gateway.health import health_manager, HealthState
from app.ai.gateway.model_registry import ModelSpec, get_model, register_model
from app.ai.gateway.provider_registry import ProviderSpec, get_provider_spec

__all__ = [
    "ModelRole",
    "ModelSelection",
    "resolve",
    "fallback_chain",
    "resolve_embedding",
    "active_provider",
    "set_active_provider",
    "clear_override",
    "config_snapshot",
    "cost_of",
    "usage_tracker",
    "health_manager",
    "HealthState",
    "ModelSpec",
    "get_model",
    "register_model",
    "ProviderSpec",
    "get_provider_spec",
]
