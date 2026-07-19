"""
Reusable context builders for the Recruiter Copilot.

These are **pure** functions over already-fetched domain data (no repository or
network access) so they stay testable and side-effect free. The service layer
fetches from repositories and feeds the results here; the resolver then composes
the pieces into the variable mapping the orchestrator's copilot prompt renders.

Honouring the platform context priority:
    1. Current Campaign  2. Selected Candidate  3. Resume  4. Job Description
    5. Recruiter Notes   6. Conversation History  7. LLM reasoning
"""

from __future__ import annotations

from typing import Any

# Keep conversation history bounded to control token usage.
MAX_HISTORY_TURNS = 10
MAX_MESSAGE_CHARS = 1500


def _num(value: Any, default: str = "n/a") -> str:
    return str(value) if value is not None else default


def format_history(messages: list[dict[str, Any]]) -> str:
    """Render recent prior turns as 'Recruiter:' / 'Copilot:' lines."""
    recent = messages[-MAX_HISTORY_TURNS:]
    lines: list[str] = []
    for m in recent:
        role = m.get("role", "")
        speaker = "Recruiter" if role == "user" else "Copilot"
        content = (m.get("content") or "")[:MAX_MESSAGE_CHARS]
        if content.strip():
            lines.append(f"{speaker}: {content}")
    return "\n".join(lines)


def build_campaign_context(campaign: dict[str, Any], candidates: list[dict[str, Any]]) -> str:
    """
    Render a campaign overview + ranked candidate roster from persisted data.

    `campaign` is a Campaign.model_dump()-like dict; `candidates` is a list of
    dicts each carrying identity + latest-analysis scalars (rank, overall_score,
    ats_score, match_category, recommendation, stage).
    """
    title = campaign.get("title") or campaign.get("role_title") or "Untitled campaign"
    header = [f"Title: {title}"]
    for key, label in (
        ("role_title", "Role"),
        ("department", "Department"),
        ("location", "Location"),
        ("employment_type", "Employment type"),
        ("status", "Status"),
    ):
        val = campaign.get(key)
        if val:
            header.append(f"{label}: {val}")
    total = campaign.get("total_candidates", campaign.get("candidate_count"))
    if total is not None:
        header.append(f"Total candidates: {total}")
    if campaign.get("average_match_score") is not None:
        header.append(f"Average match score: {campaign['average_match_score']}")

    jd = (campaign.get("job_description") or "").strip()
    jd_block = jd[:2000] if jd else "(no job description on file)"

    # Ranked roster (already ordered by caller; fall back to score sort).
    def _score(c: dict[str, Any]) -> float:
        return float(c.get("overall_score") or 0)

    roster = sorted(candidates, key=_score, reverse=True)
    rows: list[str] = []
    for i, c in enumerate(roster[:25], start=1):
        name = c.get("full_name") or c.get("name") or "Unnamed candidate"
        line = (
            f"{i}. {name} — overall {_num(c.get('overall_score'))}/100, "
            f"ATS {_num(c.get('ats_score'))}/100, "
            f"{c.get('match_category') or 'n/a'}, "
            f"stage: {c.get('stage') or 'n/a'}, "
            f"rec: {c.get('recommendation') or 'n/a'}"
        )
        yrs = c.get("years_experience")
        if yrs is not None:
            fresher = " (fresher/entry-level)" if float(yrs) <= 1 else ""
            line += f", experience: {yrs} yrs{fresher}"
        if c.get("top_skills"):
            line += f", skills: {', '.join(c['top_skills'])}"
        if c.get("missing_skills"):
            line += f", missing/gaps: {', '.join(c['missing_skills'])}"
        if c.get("weaknesses"):
            line += f", noted weaknesses: {'; '.join(c['weaknesses'])}"
        rows.append(line)
    roster_block = "\n".join(rows) if rows else "(no analysed candidates yet)"

    return (
        "### Current Campaign\n" + "\n".join(header) + "\n\n"
        "### Job Description\n" + jd_block + "\n\n"
        "### Candidate Roster (ranked)\n" + roster_block
    )


def build_dashboard_context(overview: dict[str, Any]) -> str:
    """
    Render the recruiter's dashboard/analytics overview into a context block.

    Shapes match AnalyticsRepository.overview(): top-level metrics + nested
    `ai_insights` and `charts`. Everything is accessed defensively so partial or
    evolving overviews still ground the answer.
    """
    if not overview:
        return "### Dashboard Analytics\n(no analytics available yet)"

    lines: list[str] = []
    for key, label in (
        ("total_campaigns", "Total campaigns"),
        ("active_campaigns", "Active campaigns"),
        ("total_candidates", "Total candidates"),
        ("analyzed_candidates", "Analyzed candidates"),
        ("awaiting_analysis", "Awaiting analysis"),
        ("average_match_score", "Average match score"),
        ("average_ats_score", "Average ATS score"),
        ("high_quality_candidates", "High-quality candidates"),
    ):
        if overview.get(key) is not None:
            lines.append(f"- {label}: {overview[key]}")

    block = "### Dashboard Analytics\n" + ("\n".join(lines) or "(no metrics)")

    insights = overview.get("ai_insights") or {}
    if isinstance(insights, dict):
        strongest = insights.get("strongest_candidate")
        if isinstance(strongest, dict):
            block += (
                "\n\n### Strongest Candidate\n"
                f"- {strongest.get('name') or 'Candidate'}: overall "
                f"{_num(strongest.get('overall_score'))}/100"
                + (f" ({strongest.get('campaign_title')})" if strongest.get("campaign_title") else "")
            )
        missing = insights.get("common_missing_skills") or []
        miss_rows = [
            f"- {m.get('skill')}: {m.get('count')} candidate(s)"
            for m in missing[:8] if isinstance(m, dict) and m.get("skill")
        ]
        if miss_rows:
            block += "\n\n### Common Missing Skills\n" + "\n".join(miss_rows)
        review_count = insights.get("candidates_requiring_review_count")
        if review_count:
            block += f"\n\n### Attention\n- {review_count} candidate(s) awaiting review."

    charts = overview.get("charts") or {}
    funnel = charts.get("hiring_funnel") if isinstance(charts, dict) else None
    if isinstance(funnel, list) and funnel:
        stages = ", ".join(
            f"{s.get('stage')}: {s.get('count')}" for s in funnel if isinstance(s, dict)
        )
        block += "\n\n### Hiring Funnel\n- " + stages

    return block


# ── Lightweight intent classification ───────────────────────────────────────
# Selects a versioned task instruction to sharpen the answer. Keyword-based and
# deliberately conservative — falls back to "general" so the copilot always
# answers even for unforeseen phrasings.
_INTENT_KEYWORDS: list[tuple[str, tuple[str, ...]]] = [
    ("top_candidates", ("top candidate", "strongest candidate", "best candidate", "who are my", "shortlist", "strongest applicant")),
    ("hiring_recommendation", ("should i hire", "hire this", "recommendation", "would you hire", "go ahead")),
    ("match_explanation", ("why did", "why does", "score of", "% match", "match score", "scored", "explain the score", "explain their score")),
    ("skill_gap", ("missing skill", "skills missing", "skill gap", "gaps", "lacking", "what skills")),
    ("candidate_strengths", ("strength", "strong area", "strongest area", "best at", "good at")),
    ("candidate_weaknesses", ("weakness", "concern", "red flag", "risk", "worried")),
    ("interview_questions", ("interview question", "generate question", "ask in the interview", "interview pack")),
    ("candidate_ranking", ("ranked above", "ranked higher", "why is", "rank above", "compare their rank", "ranking")),
    ("campaign_summary", ("summarize this campaign", "summarise this campaign", "campaign summary", "how is this campaign", "campaign health")),
    ("dashboard_summary", ("today's activity", "recruiting activity", "summarize today", "summarise today", "dashboard", "across campaigns", "my pipeline")),
    ("candidate_summary", ("summarize this candidate", "summarise this candidate", "summarize the candidate", "tell me about this candidate", "candidate summary")),
]


def classify_intent(question: str, page_type: str = "global") -> str:
    """Best-effort intent classification for task-instruction selection."""
    q = (question or "").lower()
    for intent, needles in _INTENT_KEYWORDS:
        if any(n in q for n in needles):
            return intent
    # Sensible page-based defaults when no keyword matches.
    if page_type == "candidate":
        return "candidate_summary"
    if page_type == "campaign":
        return "campaign_summary"
    if page_type in ("dashboard", "analytics"):
        return "dashboard_summary"
    return "general"
