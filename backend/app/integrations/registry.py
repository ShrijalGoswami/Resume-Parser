"""
Provider + Integration registries.

The single lookup for every provider plugin. Features/workflows resolve a provider
by name here — they never import an adapter directly. Future providers register
themselves; callers are unchanged.
"""

from __future__ import annotations

from typing import Optional

from app.integrations.base import IntegrationProvider, ProviderSpec
from app.integrations.providers import ALL_PROVIDERS

_PROVIDERS: dict[str, IntegrationProvider] = {}


def register_provider(provider: IntegrationProvider) -> None:
    _PROVIDERS[provider.spec.name] = provider


def get_provider(name: str) -> Optional[IntegrationProvider]:
    return _PROVIDERS.get(name)


def all_specs() -> list[ProviderSpec]:
    return [p.spec for p in _PROVIDERS.values()]


def provider_catalog() -> list[dict]:
    """Admin-safe catalog (no secrets) — for the Integration Hub."""
    out = []
    for p in _PROVIDERS.values():
        s = p.spec
        out.append({
            "name": s.name, "display_name": s.display_name, "category": s.category.value,
            "actions": [a.value for a in s.actions], "requires_oauth": s.requires_oauth,
            "oauth_available": s.oauth is not None,
        })
    return out


def _seed() -> None:
    for cls in ALL_PROVIDERS:
        register_provider(cls())


_seed()
