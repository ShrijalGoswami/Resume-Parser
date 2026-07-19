"""
Enterprise platform (V6 / Sprint 10).

Organizations, workspaces, policy-based RBAC, audit logging, usage accounting,
subscription plans, feature flags, and scoped API keys — layered additively over
the recruiter-scoped V5 product (recruiter → organization membership).

Importing this package registers the org usage-rollup hook with the AI gateway so
every AI call attributes its usage to the active organization.
"""

from __future__ import annotations

import logging

from app.ai.gateway import usage_tracker
from app.enterprise.context import current_org_id

logger = logging.getLogger(__name__)


def _org_usage_hook(prompt_tokens: int, completion_tokens: int) -> None:
    """Roll one AI call's usage up to the active organization (best-effort)."""
    org_id = current_org_id.get()
    if not org_id:
        return
    try:
        from app.enterprise.repositories import UsageRepository
        repo = UsageRepository(org_id)
        repo.increment("ai_requests", 1)
        total = (prompt_tokens or 0) + (completion_tokens or 0)
        if total:
            repo.increment("tokens", total)
    except Exception as exc:  # pragma: no cover
        logger.debug("Org usage rollup skipped: %s", exc)


# Register once at import.
usage_tracker.set_org_hook(_org_usage_hook)
