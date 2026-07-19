"""
Recruiter Copilot context resolver.

Given the page the recruiter is on (auto-detected on the frontend) and their
question, this fetches the highest-priority platform context from the existing
repositories and composes it — via the reusable context builders — into the
variables the AIOrchestrator's copilot prompt consumes.

Context priority (never reversed):
    1. Current Campaign  2. Selected Candidate  3. Resume  4. Job Description
    5. Recruiter Notes   6. Conversation History  7. LLM reasoning

Everything degrades gracefully: deleted candidates/campaigns or missing analyses
never raise — they simply drop out of the context (and out of Sources Used), so
the copilot answers with whatever grounding remains.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any, Optional

from app.ai.context.copilot_context import (
    build_campaign_context,
    build_dashboard_context,
    classify_intent,
)
from app.schemas.batch import CandidateResult
from app.schemas.copilot import CopilotPageContext, CopilotSource, CopilotStructuredResponse
from app.services.candidate_context import build_candidate_context

logger = logging.getLogger(__name__)


@dataclass
class ResolvedContext:
    context_text: str = ""
    available_sources: list[str] = field(default_factory=list)
    sources: list[CopilotSource] = field(default_factory=list)
    intent: str = "general"
    # Preserved so the caller can build a deterministic fallback answer.
    candidate_result: Optional[CandidateResult] = None


def _candidate_row(c: Any) -> dict[str, Any]:
    """Flatten a persisted Candidate (+ latest analysis) into a scoring dict."""
    la = getattr(c, "latest_analysis", None) or {}
    result = la.get("result") if isinstance(la, dict) else None
    result = result if isinstance(result, dict) else {}

    def pick(key: str) -> Any:
        return la.get(key) if la.get(key) is not None else result.get(key)

    resume = result.get("resume_data") if isinstance(result.get("resume_data"), dict) else {}
    # Merge JD-matched skills (most relevant) with the full résumé skill list so
    # the roster reflects ALL real skills — `top_skills` alone is truncated to 8
    # and can drop key items (e.g. PostgreSQL/Redis for a backend engineer).
    _seen: set[str] = set()
    skills: list[str] = []
    for s in (result.get("matching_skills") or []) + (resume.get("skills") or []) + (result.get("top_skills") or []):
        k = str(s).lower()
        if k not in _seen:
            _seen.add(k)
            skills.append(s)
    return {
        "full_name": getattr(c, "full_name", None) or result.get("name"),
        "stage": getattr(c, "stage", None),
        "overall_score": pick("overall_score"),
        "ats_score": pick("ats_score"),
        "match_category": pick("match_category"),
        "recommendation": pick("recommendation"),
        # Enriched so the roster can answer skill/experience/gap questions
        # (who's a fresher, who knows PostgreSQL, who lacks cloud, weaknesses).
        "years_experience": pick("years_experience"),
        "top_skills": list(skills)[:12],
        "missing_skills": (result.get("missing_skills") or [])[:8],
        "weaknesses": (result.get("weaknesses") or [])[:3],
    }


def _candidate_result_from_analysis(analysis_row: Optional[dict]) -> Optional[CandidateResult]:
    if not analysis_row:
        return None
    result = analysis_row.get("result") if isinstance(analysis_row, dict) else None
    if not isinstance(result, dict):
        return None
    try:
        return CandidateResult(**result)
    except Exception as exc:  # pragma: no cover — tolerate schema drift
        logger.warning("Could not reconstruct CandidateResult: %s", exc)
        return None


def resolve_context(page, question, *, campaign_repo=None, candidate_repo=None, note_repo=None, analytics_repo=None) -> ResolvedContext:
    """Resolve grounded context, then prepend relevant organizational memory."""
    resolved = _resolve_dispatch(
        page, question, campaign_repo=campaign_repo, candidate_repo=candidate_repo,
        note_repo=note_repo, analytics_repo=analytics_repo,
    )
    # Long-term organizational memory before reasoning (every AI engine gets this).
    from app.enterprise.context import current_org_id
    from app.knowledge.injection import memory_block
    mem_text, mem_sources = memory_block(current_org_id.get(), question)
    if mem_text:
        resolved.context_text = mem_text + resolved.context_text
        resolved.available_sources = ["Organizational Memory"] + resolved.available_sources
        resolved.sources = [CopilotSource(source="Organizational Memory",
                                          detail=f"{len(mem_sources)} remembered fact(s)")] + resolved.sources
    return resolved


def _resolve_dispatch(
    page: CopilotPageContext,
    question: str,
    *,
    campaign_repo=None,
    candidate_repo=None,
    note_repo=None,
    analytics_repo=None,
) -> ResolvedContext:
    """Resolve the grounded context for one copilot turn based on the page."""
    ptype = page.type or "global"

    if ptype == "candidate" and page.candidate_id and candidate_repo is not None:
        return _resolve_candidate(page, question, campaign_repo, candidate_repo, note_repo)
    if ptype == "campaign" and page.campaign_id and campaign_repo is not None:
        return _resolve_campaign(page, question, campaign_repo, candidate_repo)
    if ptype in ("dashboard", "analytics") and analytics_repo is not None:
        return _resolve_dashboard(page, question, analytics_repo)

    # Global / no specific context.
    return ResolvedContext(
        context_text="(No specific page context. Answer from conversation history "
        "and general recruiting expertise, and ask the recruiter to open a campaign "
        "or candidate for grounded, data-backed answers.)",
        available_sources=[],
        sources=[],
        intent=classify_intent(question, ptype),
    )


def _resolve_candidate(page, question, campaign_repo, candidate_repo, note_repo) -> ResolvedContext:
    sources: list[CopilotSource] = []
    parts: list[str] = []
    job_description = ""
    candidate_result: Optional[CandidateResult] = None

    # 1. Current Campaign (highest priority) — light header + JD.
    if page.campaign_id and campaign_repo is not None:
        try:
            campaign = campaign_repo.get(page.campaign_id)
            cd = campaign.model_dump()
            job_description = cd.get("job_description") or ""
            parts.append(
                "### Current Campaign\n"
                f"Title: {cd.get('title') or 'Untitled'}"
                + (f"\nRole: {cd.get('role_title')}" if cd.get("role_title") else "")
                + (f"\nStatus: {cd.get('status')}" if cd.get("status") else "")
            )
            sources.append(CopilotSource(source="Current Campaign", detail=cd.get("title") or ""))
        except Exception as exc:
            logger.info("Copilot: campaign %s unavailable: %s", page.campaign_id, exc)

    # 2. Selected Candidate + 3. Resume + 4. JD + 5. Notes.
    try:
        analysis_row = candidate_repo.latest_analysis(page.candidate_id)
    except Exception:
        analysis_row = None
    candidate_result = _candidate_result_from_analysis(analysis_row)

    notes: list[str] = []
    if note_repo is not None:
        try:
            notes = [n.body for n in note_repo.list_for_candidate(page.candidate_id) if getattr(n, "body", None)]
        except Exception as exc:
            logger.info("Copilot: notes unavailable: %s", exc)

    if candidate_result is not None:
        builder = build_candidate_context(candidate_result, job_description, notes)
        parts.append(builder.build())
        sources.append(CopilotSource(source="Selected Candidate", detail=candidate_result.name or ""))
        sources.append(CopilotSource(source="Resume", detail="Parsed resume data"))
        if job_description.strip():
            sources.append(CopilotSource(source="Job Description"))
        if notes:
            sources.append(CopilotSource(source="Recruiter Notes", detail=f"{len(notes)} note(s)"))
    else:
        # Candidate exists but has no stored analysis (or was deleted).
        try:
            candidate = candidate_repo.get(page.candidate_id)
            parts.append(
                "### Selected Candidate\n"
                f"Name: {getattr(candidate, 'full_name', '') or 'Unnamed'}\n"
                f"Stage: {getattr(candidate, 'stage', 'n/a')}\n"
                "(This candidate has not been analysed yet — no scores available.)"
            )
            sources.append(CopilotSource(source="Selected Candidate", detail=getattr(candidate, "full_name", "") or ""))
        except Exception:
            parts.append("### Selected Candidate\n(The selected candidate is no longer available.)")

    dedup = _dedup_source_titles(sources)
    return ResolvedContext(
        context_text="\n\n".join(p for p in parts if p),
        available_sources=dedup,
        sources=sources,
        intent=classify_intent(question, "candidate"),
        candidate_result=candidate_result,
    )


def _resolve_campaign(page, question, campaign_repo, candidate_repo) -> ResolvedContext:
    try:
        campaign = campaign_repo.get(page.campaign_id)
    except Exception as exc:
        logger.info("Copilot: campaign %s unavailable: %s", page.campaign_id, exc)
        return ResolvedContext(
            context_text="### Current Campaign\n(This campaign is no longer available.)",
            available_sources=[],
            sources=[],
            intent=classify_intent(question, "campaign"),
        )

    candidates_rows: list[dict] = []
    if candidate_repo is not None:
        try:
            candidates = candidate_repo.list_for_campaign_with_analysis(page.campaign_id)
            candidates_rows = [_candidate_row(c) for c in candidates]
        except Exception as exc:
            logger.info("Copilot: candidate roster unavailable: %s", exc)

    context_text = build_campaign_context(campaign.model_dump(), candidates_rows)
    sources = [CopilotSource(source="Current Campaign", detail=getattr(campaign, "title", "") or "")]
    available = ["Current Campaign"]
    if candidates_rows:
        sources.append(CopilotSource(source="Candidate Roster", detail=f"{len(candidates_rows)} candidate(s)"))
        available.append("Candidate Roster")
    return ResolvedContext(
        context_text=context_text,
        available_sources=available,
        sources=sources,
        intent=classify_intent(question, "campaign"),
    )


def _resolve_dashboard(page, question, analytics_repo) -> ResolvedContext:
    try:
        overview = analytics_repo.overview()
        overview = overview if isinstance(overview, dict) else dict(overview)
    except Exception as exc:
        logger.info("Copilot: analytics overview unavailable: %s", exc)
        overview = {}
    return ResolvedContext(
        context_text=build_dashboard_context(overview),
        available_sources=["Campaign Analytics"] if overview else [],
        sources=[CopilotSource(source="Campaign Analytics")] if overview else [],
        intent=classify_intent(question, page.type or "dashboard"),
    )


def _dedup_source_titles(sources: list[CopilotSource]) -> list[str]:
    seen: list[str] = []
    for s in sources:
        if s.source not in seen:
            seen.append(s.source)
    return seen


def deterministic_fallback(resolved: ResolvedContext) -> Optional[CopilotStructuredResponse]:
    """Build a still-useful fallback answer from stored candidate data, if any."""
    c = resolved.candidate_result
    if c is None:
        return None
    lines = [
        f"**AI narrative is temporarily unavailable**, so here is what the stored "
        f"analysis shows for **{c.name or 'this candidate'}**:",
        "",
        f"- Overall score: **{c.overall_score}/100** ({c.match_category})",
        f"- ATS score: **{c.ats_score}/100**",
        f"- Hiring recommendation: **{c.recommendation or 'N/A'}**",
    ]
    if c.missing_skills:
        lines.append(f"- Missing skills: {', '.join(c.missing_skills[:8])}")
    return CopilotStructuredResponse(
        answer="\n".join(lines),
        summary=f"{c.name or 'Candidate'} scored {c.overall_score}/100 ({c.match_category}).",
        strengths=list(c.strengths[:5]) if c.strengths else [],
        weaknesses=list(c.weaknesses[:5]) if c.weaknesses else [],
        confidence=0,
        reasoning_summary="Derived from deterministic analysis only (LLM unavailable).",
        followups=["Explain their ATS score.", "Which required skills are missing?"],
        sources_used=resolved.sources,
        degraded=True,
    )
