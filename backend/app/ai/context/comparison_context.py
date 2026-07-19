"""
Comparison context builder.

Composes the stored data for 2–5 candidates (resume, analysis, ATS, match,
recruiter notes) with the job description and campaign metadata into a single
labelled context block for the comparison prompt — plus a candidate roster the
model must use verbatim (real ids/names).

Pure and side-effect free: the service fetches from repositories and passes
already-materialised `CandidateResult` objects here. Per-candidate detail is
condensed to keep multi-candidate prompts within provider limits.
"""

from __future__ import annotations

from typing import Any, Optional

from app.schemas.batch import CandidateResult

_MAX_SKILLS = 16
_MAX_LIST = 6
_MAX_ROLES = 3
_MAX_PROJECTS = 3
_MAX_JD_CHARS = 1800
_MAX_NOTE_CHARS = 400


def _cap(items: Optional[list[str]], n: int) -> list[str]:
    return [i for i in (items or []) if i and str(i).strip()][:n]


def _campaign_header(campaign: dict[str, Any]) -> str:
    lines = [f"Title: {campaign.get('title') or 'Untitled campaign'}"]
    for key, label in (
        ("role_title", "Role"),
        ("department", "Department"),
        ("location", "Location"),
        ("employment_type", "Employment type"),
    ):
        if campaign.get(key):
            lines.append(f"{label}: {campaign[key]}")
    return "### Campaign\n" + "\n".join(lines)


def _job_description(campaign: dict[str, Any]) -> str:
    jd = (campaign.get("job_description") or "").strip()
    return "### Job Description\n" + (jd[:_MAX_JD_CHARS] if jd else "(none on file)")


def _candidate_block(index: int, entry: dict[str, Any]) -> str:
    name = entry.get("name") or "Unnamed candidate"
    cid = entry.get("candidate_id") or ""
    c: Optional[CandidateResult] = entry.get("result")
    notes: list[str] = entry.get("notes") or []

    head = f"### Candidate {index}: {name} (id: {cid})"
    if c is None:
        return head + "\n(No stored analysis for this candidate — scores unavailable.)"

    lines = [
        head,
        f"Scores: overall {c.overall_score}/100, ATS {c.ats_score}/100, "
        f"AI match {round((c.semantic_similarity or 0) * 100)}%, "
        f"category: {c.match_category or 'n/a'}",
        f"Experience: {c.years_experience} years",
    ]
    if c.recommendation:
        rec = f"Recommendation: {c.recommendation}"
        if c.recommendation_explanation:
            rec += f" — {c.recommendation_explanation}"
        lines.append(rec)

    resume = c.resume_data
    if resume and resume.experience:
        roles = []
        for e in resume.experience[:_MAX_ROLES]:
            roles.append(" | ".join(x for x in [e.role, e.company, e.duration] if x))
        lines.append("Recent roles: " + "; ".join(r for r in roles if r))

    skills = _cap(c.top_skills or (resume.skills if resume else []), _MAX_SKILLS)
    if skills:
        lines.append("Skills: " + ", ".join(skills))
    if c.matching_skills:
        lines.append("Skills matching JD: " + ", ".join(_cap(c.matching_skills, _MAX_SKILLS)))
    if c.missing_skills:
        lines.append("Missing/gap skills: " + ", ".join(_cap(c.missing_skills, _MAX_SKILLS)))
    if c.strengths:
        lines.append("Strengths: " + "; ".join(_cap(c.strengths, _MAX_LIST)))
    if c.weaknesses:
        lines.append("Weaknesses: " + "; ".join(_cap(c.weaknesses, _MAX_LIST)))
    if resume and resume.projects:
        projects = [p.title for p in resume.projects[:_MAX_PROJECTS] if p.title]
        if projects:
            lines.append("Key projects: " + ", ".join(projects))
    if resume and resume.education:
        edu = [
            " ".join(x for x in [e.degree, e.institution] if x)
            for e in resume.education
        ]
        lines.append("Education: " + "; ".join(e for e in edu if e))
    if c.experience_relevance:
        lines.append(f"Experience relevance: {c.experience_relevance}")
    if notes:
        clipped = [n[:_MAX_NOTE_CHARS] for n in notes[:_MAX_LIST]]
        lines.append("Recruiter notes: " + " | ".join(clipped))

    return "\n".join(lines)


def build_comparison_context(
    campaign: dict[str, Any], entries: list[dict[str, Any]]
) -> tuple[str, str]:
    """
    Return (context_text, roster_text).

    `entries` is an ordered list of {candidate_id, name, result: CandidateResult|None,
    notes: list[str]}.
    """
    parts = [_campaign_header(campaign), _job_description(campaign)]
    for i, entry in enumerate(entries, start=1):
        parts.append(_candidate_block(i, entry))
    context_text = "\n\n".join(parts)

    roster_text = "\n".join(
        f"- {e.get('name') or 'Unnamed'} (id: {e.get('candidate_id')})" for e in entries
    )
    return context_text, roster_text
