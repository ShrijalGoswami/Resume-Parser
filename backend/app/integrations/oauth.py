"""
OAuth 2 manager.

Builds provider authorize URLs and exchanges auth codes for tokens. Client
credentials come from settings (server-side only). Refresh tokens are encrypted
before persistence (see credentials store). When a provider's client secret is not
configured, exchange returns a clearly-marked simulated credential so the platform
is fully exercisable without live app registrations.
"""

from __future__ import annotations

import logging
from urllib.parse import urlencode

from app.core.config import settings
from app.integrations.registry import get_provider
from app.integrations.base import ProviderSpec

logger = logging.getLogger(__name__)


def _spec(provider_name: str) -> ProviderSpec:
    provider = get_provider(provider_name)
    if provider is None or provider.spec.oauth is None:
        raise ValueError(f"Provider '{provider_name}' does not support OAuth.")
    return provider.spec


def authorize_url(provider_name: str, redirect_uri: str, state: str) -> str:
    spec = _spec(provider_name)
    oauth = spec.oauth
    client_id = getattr(settings, oauth.client_id_setting, "") or ""
    params = {
        "response_type": "code",
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "scope": " ".join(oauth.scopes),
        "state": state,
        "access_type": "offline",
        "prompt": "consent",
    }
    return f"{oauth.authorize_url}?{urlencode(params)}"


def exchange_code(provider_name: str, code: str, redirect_uri: str) -> dict:
    """Exchange an auth code for tokens. Returns a credential dict (may be simulated)."""
    spec = _spec(provider_name)
    oauth = spec.oauth
    client_id = getattr(settings, oauth.client_id_setting, "") or ""
    client_secret = getattr(settings, oauth.client_secret_setting, "") or ""

    if not client_secret:
        # No live app registration — return a simulated credential (clearly marked).
        return {"access_token": f"sim_{provider_name}_access", "refresh_token": f"sim_{provider_name}_refresh",
                "scope": " ".join(oauth.scopes), "simulated": True}

    try:  # pragma: no cover — real network path
        import httpx
        resp = httpx.post(oauth.token_url, data={
            "grant_type": "authorization_code", "code": code, "redirect_uri": redirect_uri,
            "client_id": client_id, "client_secret": client_secret,
        }, timeout=20)
        resp.raise_for_status()
        data = resp.json()
        data["simulated"] = False
        return data
    except Exception as exc:  # pragma: no cover
        logger.warning("OAuth exchange failed for %s: %s", provider_name, exc)
        raise
