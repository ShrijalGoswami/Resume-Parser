"""
Integration Platform (V6 / Sprint 11).

HireLens as the AI layer above existing HR software: every external service is a
provider plugin behind one interface; product features and the Autonomous Agent
never call an external API directly — they emit events that the workflow engine
runs through the Integration Layer.

    Feature/Agent → emit_event → Dispatcher → Workflow Engine → Integration Layer → Provider
"""

from app.integrations.events import Event, IntegrationEvent
from app.integrations.base import IntegrationAction, ProviderCategory
from app.integrations.registry import get_provider, provider_catalog, all_specs

__all__ = [
    "Event",
    "IntegrationEvent",
    "IntegrationAction",
    "ProviderCategory",
    "get_provider",
    "provider_catalog",
    "all_specs",
]
