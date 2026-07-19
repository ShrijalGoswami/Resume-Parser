"""
AI Gateway admin routes (V5 / Sprint 7.5).

    GET  /api/v1/ai/config    — resolved provider/model per logical role (NO secrets)
    GET  /api/v1/ai/usage     — usage, cost, and provider-health snapshot
    POST /api/v1/ai/provider  — runtime switch of the platform-wide reasoning provider

Authenticated (recruiter). These never expose API keys or raw provider errors —
only provider/model names, capability flags, and counters. The gateway is the one
switch: changing the provider here (or via env + restart) immediately affects every
AI feature (Copilot, Comparison, Semantic Search, Interview Intelligence).
"""

import logging

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from typing import Annotated

from app.ai.gateway import config_snapshot, set_active_provider, usage_tracker
from app.ai.utils.errors import AIConfigError
from app.core.config import settings
from app.core.deps import RecruiterDep
from app.enterprise.context import OrgContext
from app.enterprise.deps import require_permission
from app.enterprise.rbac import Permission
from app.enterprise.repositories import AuditRepository
from fastapi import Depends

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ai", tags=["AI Gateway"])


class SwitchProviderRequest(BaseModel):
    provider: str


@router.get("/config")
async def get_ai_config(_: RecruiterDep):
    """The active gateway configuration — provider/model per role, no secrets."""
    return config_snapshot()


@router.get("/usage")
async def get_ai_usage(_: RecruiterDep):
    """Usage, estimated cost, and provider health for future dashboards."""
    return usage_tracker.snapshot()


@router.post("/qa/reset")
async def qa_reset(_: RecruiterDep):
    """DEV-ONLY: reset the usage tracker and enable QA duplicate-detection so a
    QA session's total LLM calls/tokens can be measured. No-op in production."""
    if settings.ENVIRONMENT not in ("development", "test", "local"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="QA mode is available in development only.")
    usage_tracker.reset()
    usage_tracker.enable_qa_mode()
    return {"qa_mode": True, "detail": "usage tracker reset; QA duplicate-detection enabled"}


@router.post("/provider")
async def switch_provider(
    payload: SwitchProviderRequest,
    ctx: Annotated[OrgContext, Depends(require_permission(Permission.ORG_MANAGE))],
):
    """Switch the platform-wide reasoning provider at runtime (org-admin only; audited)."""
    try:
        set_active_provider(payload.provider)
    except AIConfigError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    AuditRepository(ctx.organization_id).record(
        user_id=ctx.recruiter.id, user_email=ctx.recruiter.email,
        action="ai_provider.changed", resource_type="ai_gateway", metadata={"provider": payload.provider},
    )
    return config_snapshot()
