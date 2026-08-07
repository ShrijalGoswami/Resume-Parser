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
    config_snapshot,
    configured_reasoning_providers,
    cost_of,
    fallback_chain,
    is_reasoning_configured,
    resolve,
    resolve_embedding,
)
from app.ai.gateway.usage import usage_tracker
from app.ai.gateway.health import health_manager, HealthState
from app.ai.gateway.model_registry import ModelSpec, get_model, register_model
from app.ai.gateway.provider_registry import ProviderSpec, get_provider_spec
from app.ai.gateway.validation import (
    AIConfigurationError,
    ConfigProblem,
    check_provider_configuration,
    validate_ai_configuration,
)

__all__ = [
    "ModelRole",
    "ModelSelection",
    "resolve",
    "fallback_chain",
    "resolve_embedding",
    "active_provider",
    "config_snapshot",
    "configured_reasoning_providers",
    "cost_of",
    "is_reasoning_configured",
    "usage_tracker",
    "health_manager",
    "HealthState",
    "ModelSpec",
    "get_model",
    "register_model",
    "ProviderSpec",
    "get_provider_spec",
    "AIConfigurationError",
    "ConfigProblem",
    "check_provider_configuration",
    "validate_ai_configuration",
]
