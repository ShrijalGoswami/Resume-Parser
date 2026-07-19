"""
Credential encryption for the integration platform.

OAuth refresh tokens and provider secrets are NEVER stored in plaintext. They are
encrypted with Fernet (AES-128-CBC + HMAC) before persistence and decrypted only
in-process when a provider call needs them. The key comes from
`INTEGRATION_ENCRYPTION_KEY`; for dev it is derived deterministically from the JWT
secret so the platform works out of the box while still never persisting plaintext.
"""

from __future__ import annotations

import base64
import hashlib
import logging
from functools import lru_cache

from app.core.config import settings

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def _fernet():
    from cryptography.fernet import Fernet  # lazy

    key = settings.INTEGRATION_ENCRYPTION_KEY.strip()
    if not key:
        # Derive a stable 32-byte urlsafe key from the JWT secret (dev fallback).
        seed = (settings.SUPABASE_JWT_SECRET or "hirelens-integration-dev").encode("utf-8")
        key = base64.urlsafe_b64encode(hashlib.sha256(seed).digest()).decode("utf-8")
    return Fernet(key.encode("utf-8"))


def encrypt(plaintext: str) -> str:
    if plaintext is None:
        return ""
    return _fernet().encrypt(plaintext.encode("utf-8")).decode("utf-8")


def decrypt(token: str) -> str:
    if not token:
        return ""
    try:
        return _fernet().decrypt(token.encode("utf-8")).decode("utf-8")
    except Exception as exc:  # pragma: no cover
        logger.warning("Credential decryption failed: %s", exc)
        return ""
