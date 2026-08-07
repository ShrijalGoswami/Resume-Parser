"""
AI Gateway admin routes (V5 / Sprint 7.5).

    GET  /api/v1/ai/config    — resolved provider/model per logical role (NO secrets)
    GET  /api/v1/ai/usage     — usage, cost, and provider-health snapshot
    GET  /api/v1/ai/health    — live per-provider health and recent fallbacks

**Read-only diagnostics.** There is no runtime provider switch: V1 is Groq-only
by product decision (HANDOFF §11.0), so there is nothing to switch to. The
provider is a deployment decision — `AI_PROVIDER` plus a restart — validated at
boot rather than accepted from a request. `POST /ai/provider` existed until
6 Aug 2026 and was removed with the feature; it mutated process-global state
from an org-scoped permission check, so one organization's admin changed the
provider for every organization in the process.

Authenticated (recruiter). These never expose API keys or raw provider errors —
only provider/model names, capability flags, and counters.
"""

import logging

from fastapi import APIRouter, HTTPException, status

from app.ai.gateway import config_snapshot, usage_tracker, health_manager
from app.core.config import settings
from app.core.deps import RecruiterDep
from app.enterprise.deps import RequireUsageView

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ai", tags=["AI Gateway"])


@router.get("/config")
async def get_ai_config(_: RecruiterDep):
    """The active gateway configuration — provider/model per role, no secrets."""
    return config_snapshot()


@router.get("/usage", dependencies=[RequireUsageView])
async def get_ai_usage(_: RecruiterDep):
    """Usage, estimated cost, retries, fallbacks, and cache stats.

    `usage.view`, matching `/org/usage`. This is organization spend; it was
    readable by every authenticated member — including `viewer` — while the
    equivalent counters in Settings denied a recruiter. Same data, same gate
    (confirmed 29 Jul). `/config` and `/health` stay authenticated-only: they
    carry provider names, capability flags and health counters, no spend.
    """
    return usage_tracker.snapshot()


@router.get("/health")
async def get_ai_health(_: RecruiterDep):
    """Live per-provider health (state, cooldown, failures) + recent fallbacks.
    No secrets — provider names + counters only."""
    snap = usage_tracker.snapshot()
    return {
        "providers": health_manager.snapshot(),
        "fallbacks": {
            "total": snap.get("total_fallbacks", 0),
            "recent": snap.get("recent_fallbacks", []),
        },
    }


@router.post("/qa/reset")
async def qa_reset(_: RecruiterDep):
    """DEV-ONLY: reset the usage tracker and enable QA duplicate-detection so a
    QA session's total LLM calls/tokens can be measured. No-op in production."""
    if settings.ENVIRONMENT not in ("development", "test", "local"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="QA mode is available in development only.")
    usage_tracker.reset()
    usage_tracker.enable_qa_mode()
    return {"qa_mode": True, "detail": "usage tracker reset; QA duplicate-detection enabled"}
