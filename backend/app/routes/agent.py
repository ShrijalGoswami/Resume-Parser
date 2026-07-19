"""
Autonomous Recruiting Agent routes (V5 / Sprint 9).

    POST  /api/v1/agent/scan                     — run workflows → recommendations + briefing
    GET   /api/v1/agent/recommendations          — list (optional ?status=)
    PATCH /api/v1/agent/recommendations/{id}     — approve / reject / dismiss
    GET   /api/v1/agent/workflows                — available workflows + tools (metadata)

Authenticated + recruiter-scoped (RLS). The agent only writes its own
recommendations and NEVER modifies production candidate/campaign data — human
approval is required and execution is deferred to a future sprint.
"""

import logging

from fastapi import APIRouter, status
from fastapi.concurrency import run_in_threadpool

from app.ai.agent import WORKFLOWS, available_tools
from app.core.deps import (
    ActivityRepoDep, AgentRepoDep, AnalyticsRepoDep, CampaignRepoDep,
    CandidateRepoDep, EmbeddingRepoDep, NoteRepoDep,
)
from app.schemas.agent import (
    AgentScanRequest, AgentScanResponse, Recommendation, RecommendationUpdate,
)
from app.services.agent_service import (
    list_recommendations, run_agent_scan, update_recommendation_status,
)
from app.enterprise.deps import OrgContextDep
from app.integrations import IntegrationEvent
from app.services.integration_service import safe_emit_event
from app.knowledge.service import safe_ingest as knowledge_ingest

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/agent", tags=["Agent"])


@router.post("/scan", response_model=AgentScanResponse, status_code=status.HTTP_200_OK)
async def scan(
    payload: AgentScanRequest,
    agent_repo: AgentRepoDep,
    campaign_repo: CampaignRepoDep,
    candidate_repo: CandidateRepoDep,
    note_repo: NoteRepoDep,
    analytics_repo: AnalyticsRepoDep,
    activity_repo: ActivityRepoDep,
    embedding_repo: EmbeddingRepoDep,
):
    return await run_in_threadpool(
        run_agent_scan,
        workflows=payload.workflows,
        agent_repo=agent_repo, campaign_repo=campaign_repo, candidate_repo=candidate_repo,
        note_repo=note_repo, analytics_repo=analytics_repo, activity_repo=activity_repo,
        embedding_repo=embedding_repo,
    )


@router.get("/recommendations", response_model=list[Recommendation])
async def recommendations(agent_repo: AgentRepoDep, status: str | None = None):
    return await run_in_threadpool(list_recommendations, agent_repo=agent_repo, status=status)


@router.patch("/recommendations/{rec_id}", response_model=Recommendation)
async def update_recommendation(rec_id: str, payload: RecommendationUpdate, agent_repo: AgentRepoDep, ctx: OrgContextDep):
    rec = await run_in_threadpool(
        update_recommendation_status, agent_repo=agent_repo, rec_id=rec_id, status=payload.status.value,
    )
    # Agent → Workflow → Integration: on approval, emit an event the workflow engine
    # dispatches to integrations. The agent itself NEVER calls integrations directly.
    if payload.status.value == "approved":
        await run_in_threadpool(
            safe_emit_event, ctx.organization_id, IntegrationEvent.agent_recommendation_approved,
            {"recommendation_id": rec_id, "workflow": rec.workflow, "title": rec.title,
             "candidate_id": rec.candidate_id, "campaign_id": rec.campaign_id},
        )
        # Accumulate organizational memory from the approved decision.
        await run_in_threadpool(knowledge_ingest, ctx.organization_id, "agent",
                                source_id=rec_id, rec=rec.model_dump())
    return rec


@router.get("/workflows")
async def workflows(_: AgentRepoDep):
    """The agent's registered workflows and tools (metadata; no secrets)."""
    return {"workflows": list(WORKFLOWS), "tools": available_tools()}
