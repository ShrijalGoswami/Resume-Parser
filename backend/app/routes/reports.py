"""
Executive Intelligence report routes (V5 / Sprint 8).

    POST /api/v1/reports/executive — generate a grounded executive hiring report

Authenticated + recruiter-scoped (RLS): a leader only sees reports over data they
own. Reports compose existing analytics/engines and flow through the AIOrchestrator;
statistics are server-computed (never fabricated) and the LLM only narrates them.
"""

import logging

from fastapi import APIRouter, status
from fastapi.concurrency import run_in_threadpool

from app.core.deps import ActivityRepoDep, AnalyticsRepoDep, CampaignRepoDep
from app.schemas.report import ExecutiveReport, ExecutiveReportRequest
from app.services.report_service import run_executive_report

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/reports", tags=["Reports"])


@router.post("/executive", response_model=ExecutiveReport, status_code=status.HTTP_200_OK)
async def executive_report(
    payload: ExecutiveReportRequest,
    analytics_repo: AnalyticsRepoDep,
    campaign_repo: CampaignRepoDep,
    activity_repo: ActivityRepoDep,
):
    return await run_in_threadpool(
        run_executive_report,
        focus=payload.focus,
        instruction=payload.instruction,
        sections=payload.sections,
        analytics_repo=analytics_repo,
        campaign_repo=campaign_repo,
        activity_repo=activity_repo,
    )
