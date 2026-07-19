"""
Knowledge Center routes (V7 / Sprint 12).

Organizational long-term memory: explorer, retrieval (explainable), hiring timeline,
skill-demand evolution, emergent preferences, knowledge graph, sources, and memory
governance (invalidate / archive / correct / merge). Organization-scoped (membership
RLS); governance mutations require ORG_MANAGE.
"""

from __future__ import annotations

from typing import Annotated, Optional

from fastapi import APIRouter, Depends
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel

from app.enterprise.context import OrgContext
from app.enterprise.deps import OrgContextDep, require_permission
from app.enterprise.rbac import Permission
from app.knowledge import service as knowledge

router = APIRouter(prefix="/knowledge", tags=["Knowledge"])

GovernDep = Annotated[OrgContext, Depends(require_permission(Permission.ORG_MANAGE))]


class RetrieveRequest(BaseModel):
    query: str
    limit: int = 6


class CorrectRequest(BaseModel):
    value_text: Optional[str] = None
    confidence: Optional[int] = None


class MergeRequest(BaseModel):
    keep_id: str
    duplicate_id: str


@router.get("/memory")
async def memory(ctx: OrgContextDep, kind: Optional[str] = None, source: Optional[str] = None):
    return await run_in_threadpool(knowledge.list_items, ctx.organization_id, kind=kind, source=source)


@router.post("/retrieve")
async def retrieve(payload: RetrieveRequest, ctx: OrgContextDep):
    """Explainable memory retrieval — each hit carries source, time, confidence, why."""
    return await run_in_threadpool(knowledge.retrieve, ctx.organization_id, payload.query, limit=payload.limit)


@router.get("/timeline")
async def timeline(ctx: OrgContextDep, months: int = 6):
    return await run_in_threadpool(knowledge.timeline, ctx.organization_id, months)


@router.get("/skill-evolution")
async def skill_evolution(ctx: OrgContextDep):
    return await run_in_threadpool(knowledge.skill_evolution, ctx.organization_id)


@router.get("/preferences")
async def preferences(ctx: OrgContextDep):
    return await run_in_threadpool(knowledge.preferences, ctx.organization_id)


@router.get("/graph")
async def graph(ctx: OrgContextDep, entity: Optional[str] = None, depth: int = 2):
    return await run_in_threadpool(knowledge.graph_traverse, ctx.organization_id, entity or "", min(depth, 4))


@router.get("/sources")
async def sources(ctx: OrgContextDep):
    return await run_in_threadpool(knowledge.source_counts, ctx.organization_id)


# ── Governance ───────────────────────────────────────────────────────────────
@router.post("/items/{item_id}/invalidate")
async def invalidate(item_id: str, ctx: GovernDep):
    return await run_in_threadpool(knowledge.invalidate, ctx.organization_id, item_id)


@router.post("/items/{item_id}/archive")
async def archive(item_id: str, ctx: GovernDep):
    return await run_in_threadpool(knowledge.archive, ctx.organization_id, item_id)


@router.patch("/items/{item_id}")
async def correct(item_id: str, payload: CorrectRequest, ctx: GovernDep):
    return await run_in_threadpool(knowledge.correct, ctx.organization_id, item_id,
                                   value_text=payload.value_text, confidence=payload.confidence)


@router.post("/merge")
async def merge(payload: MergeRequest, ctx: GovernDep):
    return await run_in_threadpool(knowledge.merge, ctx.organization_id, payload.keep_id, payload.duplicate_id)
