"""
Copilot ↔ Semantic Search bridge.

Lets the Recruiter Copilot reuse the SAME retrieval engine
(`services.talent_search`) instead of duplicating search logic. Detects search /
"find similar" intent, runs embedding-based retrieval (NO LLM), and renders the
results into a `CopilotStructuredResponse` (full results kept in message metadata).

Returns None when the message is not a search request — the caller then falls back
to the normal grounded copilot answer. Deeper "why did X match?" explanations are
handled as follow-ups through the normal copilot path (which uses the orchestrator).
"""

from __future__ import annotations

import logging
import re
from typing import Any, Optional

from app.schemas.copilot import CopilotPageContext, CopilotSource, CopilotStructuredResponse
from app.schemas.search import TalentSearchResponse
from app.services.talent_search import search_similar, search_talent

logger = logging.getLogger(__name__)

_SEARCH_TRIGGERS = (
    "find ", "search for", "search ", "show me", "look for", "list candidates",
    "candidates with", "candidates who", "people who", "people with", "who has",
    "who have", "anyone with", "engineers with", "developers with", "similar to",
    "similar candidates", "find similar",
)
_SIMILAR_RE = re.compile(r"similar to ([a-z0-9 .'\-]+)", re.IGNORECASE)


# Experience-ranking superlatives are about *years*, which embedding search
# cannot rank — let these fall through to the year-aware campaign roster handler.
_SEARCH_EXCLUSIONS = (
    "most experience", "most experienced", "least experience", "least experienced",
    "most senior", "who is the most", "who has the most experience",
)


def _is_search(question: str) -> bool:
    q = f" {question.lower()} "
    if any(x in q for x in _SEARCH_EXCLUSIONS):
        return False
    return any(t in q for t in _SEARCH_TRIGGERS)


def _clean_query(question: str) -> str:
    q = question.strip()
    q = re.sub(r"^(find|search for|search|show me|look for|list)\s+", "", q, flags=re.IGNORECASE)
    return q.rstrip("?.").strip() or question.strip()


def _resolve_name(name: str, campaign_id: Optional[str], candidate_repo: Any) -> Optional[str]:
    if not campaign_id:
        return None
    needle = name.strip().lower()
    try:
        for c in candidate_repo.list_for_campaign(campaign_id):
            full = (getattr(c, "full_name", "") or "").lower()
            if full and (needle in full or full in needle or needle.split()[0] in full):
                return c.id
    except Exception:  # pragma: no cover
        return None
    return None


def try_search(
    question: str,
    page: CopilotPageContext,
    *,
    candidate_repo: Any,
    embedding_repo: Any,
) -> Optional[tuple[TalentSearchResponse, CopilotStructuredResponse]]:
    if not _is_search(question):
        return None

    similar = _SIMILAR_RE.search(question)
    if similar:
        cid = _resolve_name(similar.group(1), page.campaign_id, candidate_repo)
        if cid:
            resp = search_similar(
                cid, campaign_id=page.campaign_id, limit=8,
                candidate_repo=candidate_repo, embedding_repo=embedding_repo,
            )
            return resp, _render(resp, header=f"Candidates similar to {similar.group(1).strip()}")

    resp = search_talent(
        _clean_query(question), campaign_id=page.campaign_id, limit=8,
        candidate_repo=candidate_repo, embedding_repo=embedding_repo,
    )
    return resp, _render(resp, header="Top semantic matches")


def safe_try_search(
    question: str,
    page: CopilotPageContext,
    candidate_repo: Any,
    embedding_repo: Any,
) -> Optional[tuple[TalentSearchResponse, CopilotStructuredResponse]]:
    """try_search that never raises — the copilot must never break on this."""
    try:
        return try_search(question, page, candidate_repo=candidate_repo, embedding_repo=embedding_repo)
    except Exception as exc:  # pragma: no cover
        logger.info("Copilot search skipped: %s", exc)
        return None


def _render(resp: TalentSearchResponse, *, header: str) -> CopilotStructuredResponse:
    if not resp.results:
        return CopilotStructuredResponse(
            answer=(
                "I couldn't find matching candidates. Make sure the campaign's candidates "
                "have been analysed and indexed for semantic search."
            ),
            confidence=0,
            reasoning_summary="Semantic retrieval returned no matches.",
            sources_used=[CopilotSource(source="Semantic Search", detail=resp.provider)],
            followups=["Re-index this campaign", "Summarize this campaign"],
        )

    lines = [f"**{header}**"]
    for i, r in enumerate(resp.results, start=1):
        pct = round(r.similarity * 100)
        concepts = f" — {', '.join(r.matched_concepts[:4])}" if r.matched_concepts else ""
        score = f" · overall {r.overall_score:g}/100" if r.overall_score else ""
        lines.append(f"{i}. **{r.name}** ({pct}% match){score}{concepts}")

    top = resp.results[0]
    return CopilotStructuredResponse(
        answer="\n".join(lines),
        summary=f"{len(resp.results)} candidate(s) matched by semantic similarity.",
        strengths=top.matched_concepts[:5],
        confidence=round(top.similarity * 100),
        reasoning_summary="Retrieved by embedding similarity (no keyword matching).",
        followups=[
            f"Compare {resp.results[0].name} and {resp.results[1].name}" if len(resp.results) > 1 else "Summarize the top candidate",
            "Who is the safer hire?",
            "Find similar candidates to the top match",
        ],
        sources_used=[CopilotSource(source="Semantic Search", detail=resp.provider)],
    )
