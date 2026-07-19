"""
Agent Tool Registry.

The agent NEVER reimplements business logic — it coordinates existing engines
through tools. Each tool is a thin wrapper over an already-built service
(semantic search, comparison, interview, executive report) or a repository read,
invoked with a shared `ToolContext` that carries the recruiter-scoped repositories
and a per-scan cache (so expensive reads happen once — no N+1).

Future agents/workflows add capabilities by registering tools; nothing else
changes.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable, Optional


@dataclass
class ToolContext:
    """Recruiter-scoped dependencies + per-scan cache shared across tools."""
    recruiter_id: str
    campaign_repo: Any = None
    candidate_repo: Any = None
    note_repo: Any = None
    analytics_repo: Any = None
    activity_repo: Any = None
    embedding_repo: Any = None
    cache: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class Tool:
    name: str
    description: str
    category: str                        # retrieval | engine
    fn: Callable[..., Any]

    def __call__(self, ctx: ToolContext, **params: Any) -> Any:
        return self.fn(ctx, **params)


_REGISTRY: dict[str, Tool] = {}


def register_tool(tool: Tool) -> None:
    _REGISTRY[tool.name] = tool


def get_tool(name: str) -> Optional[Tool]:
    return _REGISTRY.get(name)


def available_tools() -> list[dict]:
    return [{"name": t.name, "description": t.description, "category": t.category} for t in _REGISTRY.values()]


def invoke_tool(name: str, ctx: ToolContext, **params: Any) -> Any:
    tool = _REGISTRY.get(name)
    if tool is None:
        raise KeyError(f"Unknown agent tool '{name}'.")
    return tool(ctx, **params)


# ── Retrieval tools (cheap reads, cached) ───────────────────────────────────
def _retrieve_analytics(ctx: ToolContext, **_: Any) -> dict:
    if "overview" not in ctx.cache:
        ctx.cache["overview"] = ctx.analytics_repo.overview() if ctx.analytics_repo else {}
    return ctx.cache["overview"]


def _retrieve_campaigns(ctx: ToolContext, **_: Any) -> list[dict]:
    if "campaigns" in ctx.cache:
        return ctx.cache["campaigns"]
    out: list[dict] = []
    if ctx.campaign_repo:
        stats = ctx.campaign_repo.stats_for_recruiter()
        for c in ctx.campaign_repo.list():
            s = stats.get(c.id, {})
            cd = c.model_dump() if hasattr(c, "model_dump") else {}
            out.append({
                "id": c.id, "title": getattr(c, "title", ""), "status": getattr(c, "status", ""),
                "role_title": cd.get("role_title", ""), "metadata": cd.get("metadata", {}),
                "job_description": cd.get("job_description", ""),
                "total_candidates": s.get("total_candidates", 0),
                "awaiting_analysis": s.get("awaiting_analysis", 0),
                "average_match_score": s.get("average_match_score"),
                "last_activity_at": s.get("last_activity_at") or cd.get("updated_at"),
                "updated_at": cd.get("updated_at"),
            })
    ctx.cache["campaigns"] = out
    return out


def _retrieve_campaign_roster(ctx: ToolContext, *, campaign_id: str, **_: Any) -> list[Any]:
    key = f"roster:{campaign_id}"
    if key not in ctx.cache:
        ctx.cache[key] = ctx.candidate_repo.list_for_campaign_with_analysis(campaign_id) if ctx.candidate_repo else []
    return ctx.cache[key]


def _retrieve_candidate_context(ctx: ToolContext, *, candidate_id: str, **_: Any) -> dict:
    cand = ctx.candidate_repo.get(candidate_id)
    analysis = ctx.candidate_repo.latest_analysis(candidate_id)
    return {"candidate": cand, "analysis": analysis}


def _retrieve_notes(ctx: ToolContext, *, candidate_id: str, **_: Any) -> list[str]:
    if not ctx.note_repo:
        return []
    return [n.body for n in ctx.note_repo.list_for_candidate(candidate_id) if getattr(n, "body", None)]


# ── Engine tools (wrap existing AI services) ────────────────────────────────
def _search_candidates(ctx: ToolContext, *, query: str, campaign_id: Optional[str] = None, limit: int = 8, **_: Any):
    from app.services.talent_search import search_talent
    return search_talent(query, campaign_id=campaign_id, limit=limit,
                         candidate_repo=ctx.candidate_repo, embedding_repo=ctx.embedding_repo)


def _compare_candidates(ctx: ToolContext, *, campaign_id: str, candidate_ids: list[str], **_: Any):
    from app.services.comparison_service import run_comparison
    return run_comparison(campaign_id, candidate_ids,
                         campaign_repo=ctx.campaign_repo, candidate_repo=ctx.candidate_repo, note_repo=ctx.note_repo)


def _generate_interview_pack(ctx: ToolContext, *, candidate_id: str, campaign_id: Optional[str] = None, focus: str = "blueprint", **_: Any):
    from app.services.interview_service import run_interview
    return run_interview(candidate_id, campaign_id=campaign_id, focus=focus,
                        candidate_repo=ctx.candidate_repo, campaign_repo=ctx.campaign_repo, note_repo=ctx.note_repo)


def _generate_executive_report(ctx: ToolContext, *, focus: str = "full", instruction: str = "", **_: Any):
    from app.services.report_service import run_executive_report
    return run_executive_report(focus=focus, instruction=instruction,
                               analytics_repo=ctx.analytics_repo, campaign_repo=ctx.campaign_repo, activity_repo=ctx.activity_repo)


def _forecast(ctx: ToolContext, *, forecast_type: str = "campaign_delay_risk", **params: Any):
    """Deterministic hiring forecast (the agent consumes predictions, never computes them)."""
    from app.enterprise.context import current_org_id
    from app.services.prediction_service import forecast
    org = current_org_id.get()
    if not org:
        return {}
    return forecast(org, forecast_type, analytics_repo=ctx.analytics_repo,
                    campaign_repo=ctx.campaign_repo, activity_repo=ctx.activity_repo, **params)


def _seed() -> None:
    tools = [
        Tool("retrieve_analytics", "Aggregated pipeline analytics", "retrieval", _retrieve_analytics),
        Tool("retrieve_campaigns", "Campaigns with per-campaign stats", "retrieval", _retrieve_campaigns),
        Tool("retrieve_campaign_context", "A campaign's candidate roster + analyses", "retrieval", _retrieve_campaign_roster),
        Tool("retrieve_candidate_context", "A candidate's profile + latest analysis", "retrieval", _retrieve_candidate_context),
        Tool("retrieve_notes", "Recruiter notes for a candidate", "retrieval", _retrieve_notes),
        Tool("search_candidates", "Semantic talent search (Sprint 6 engine)", "engine", _search_candidates),
        Tool("compare_candidates", "AI candidate comparison (Sprint 5 engine)", "engine", _compare_candidates),
        Tool("generate_interview_pack", "Interview Intelligence pack (Sprint 7 engine)", "engine", _generate_interview_pack),
        Tool("generate_executive_report", "Executive report (Sprint 8 engine)", "engine", _generate_executive_report),
        Tool("forecast", "Deterministic hiring forecast (Sprint 13 prediction engine)", "engine", _forecast),
    ]
    for t in tools:
        register_tool(t)


_seed()
