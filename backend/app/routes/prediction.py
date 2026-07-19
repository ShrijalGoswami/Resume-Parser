"""
Predictive Intelligence routes (V8 / Sprint 13).

Digital Twin, deterministic forecasts, and scenario simulations — organization-scoped.
Forecasts come from statistical models (never an LLM); every response is explainable
(probability/confidence/evidence/factors/alternatives). No model artifacts are exposed.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, status
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field

from app.core.deps import ActivityRepoDep, AnalyticsRepoDep, CampaignRepoDep
from app.enterprise.deps import OrgContextDep
from app.services import prediction_service as svc

router = APIRouter(prefix="/prediction", tags=["Prediction"])


class ForecastRequest(BaseModel):
    forecast_type: str
    params: dict[str, Any] = Field(default_factory=dict)


class SimulateRequest(BaseModel):
    forecast_type: str
    levers: dict[str, float] = Field(default_factory=dict)
    params: dict[str, Any] = Field(default_factory=dict)


def _repos(analytics_repo, campaign_repo, activity_repo) -> dict:
    return {"analytics_repo": analytics_repo, "campaign_repo": campaign_repo, "activity_repo": activity_repo}


@router.get("/types")
async def types(_: OrgContextDep):
    return {"forecast_types": svc.forecast_types(), "scenarios": svc.scenarios()}


@router.get("/twin")
async def twin(ctx: OrgContextDep, analytics_repo: AnalyticsRepoDep, campaign_repo: CampaignRepoDep, activity_repo: ActivityRepoDep):
    return await run_in_threadpool(svc.twin_summary, ctx.organization_id, **_repos(analytics_repo, campaign_repo, activity_repo))


@router.get("/forecasts")
async def forecasts(ctx: OrgContextDep, analytics_repo: AnalyticsRepoDep, campaign_repo: CampaignRepoDep, activity_repo: ActivityRepoDep):
    return await run_in_threadpool(svc.dashboard, ctx.organization_id, **_repos(analytics_repo, campaign_repo, activity_repo))


@router.post("/forecast")
async def forecast(payload: ForecastRequest, ctx: OrgContextDep, analytics_repo: AnalyticsRepoDep, campaign_repo: CampaignRepoDep, activity_repo: ActivityRepoDep):
    if payload.forecast_type not in svc.forecast_types():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unknown forecast '{payload.forecast_type}'.")
    return await run_in_threadpool(
        svc.forecast, ctx.organization_id, payload.forecast_type,
        record=True, **_repos(analytics_repo, campaign_repo, activity_repo), **payload.params)


@router.post("/simulate")
async def simulate(payload: SimulateRequest, ctx: OrgContextDep, analytics_repo: AnalyticsRepoDep, campaign_repo: CampaignRepoDep, activity_repo: ActivityRepoDep):
    if payload.forecast_type not in svc.forecast_types():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unknown forecast '{payload.forecast_type}'.")
    return await run_in_threadpool(
        svc.simulate, ctx.organization_id, payload.forecast_type, payload.levers,
        **_repos(analytics_repo, campaign_repo, activity_repo), **payload.params)


@router.get("/history")
async def history(ctx: OrgContextDep):
    return await run_in_threadpool(svc.history, ctx.organization_id)
