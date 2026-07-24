"""
Capability→provider routing table (M5 — STRUCTURE ONLY).

The data structure and the single consult-hook exist now so that, later, pinning a
capability to a provider (e.g. resume analysis → gemini, interview → claude) is a
pure CONFIG change — no orchestrator edit. It is INERT by default: `route_for`
returns None unless `AI_ENABLE_CAPABILITY_ROUTING` is true AND a mapping is set, so
today every capability continues to use the single configured provider.
"""

from __future__ import annotations

from typing import Optional

from app.ai.gateway.provider_config import canonical_provider
from app.core.config import settings


def route_for(capability: str) -> Optional[str]:
    """The provider a capability is pinned to, or None → default routing.

    Disabled by default. When enabled, reads `AI_CAPABILITY_ROUTING`
    ({capability_value: provider_name}); an unmapped capability returns None.
    """
    if not settings.AI_ENABLE_CAPABILITY_ROUTING:
        return None
    table = settings.AI_CAPABILITY_ROUTING or {}
    if not isinstance(table, dict):
        return None
    target = table.get(capability)
    return canonical_provider(target) if target else None
