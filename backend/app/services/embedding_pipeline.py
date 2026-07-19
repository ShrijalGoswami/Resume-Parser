"""
Candidate embedding pipeline.

Builds a normalised, noise-free profile text from a candidate's stored analysis
(resume text, skills, experience, education, projects, certifications, AI summary,
ATS signals), embeds it, and upserts the vector — but only when the content
actually changed. A content hash (over the normalised text) plus the active model
identity gate regeneration, so re-indexing is cheap and idempotent.

Excludes noisy metadata (emails, phones, ids, raw dates) that would dilute
semantic similarity.
"""

from __future__ import annotations

import hashlib
import logging
from typing import Any, Optional

from app.ai.embeddings import active_embedding_model, embed_texts
from app.schemas.batch import CandidateResult

logger = logging.getLogger(__name__)


def _join(items: Optional[list[str]]) -> str:
    return ", ".join(i.strip() for i in (items or []) if i and i.strip())


def normalize_profile(result: CandidateResult) -> str:
    """Compose a normalised, retrieval-focused profile text (no noisy metadata)."""
    r = result
    parts: list[str] = []
    if r.summary:
        parts.append(f"Summary: {r.summary}")
    if r.match_category:
        parts.append(f"Seniority/fit: {r.match_category}; {r.years_experience} years experience.")

    resume = r.resume_data
    skills = list(dict.fromkeys((r.top_skills or []) + (resume.skills if resume else []) + (r.matching_skills or [])))
    if skills:
        parts.append("Skills: " + _join(skills))

    if resume and resume.experience:
        exp_lines = []
        for e in resume.experience:
            header = " ".join(x for x in [e.role, "at", e.company] if x) if e.company else (e.role or "")
            desc = " ".join(e.description) if e.description else ""
            exp_lines.append(f"{header}. {desc}".strip())
        parts.append("Experience: " + " ".join(exp_lines))

    if resume and resume.projects:
        proj = []
        for p in resume.projects:
            desc = " ".join(p.description) if p.description else ""
            proj.append(f"{p.title}. {desc}".strip())
        parts.append("Projects: " + " ".join(proj))

    if resume and resume.education:
        edu = [" ".join(x for x in [e.degree, e.institution] if x) for e in resume.education]
        parts.append("Education: " + _join(edu))

    certs = resume.certifications if resume else []
    if certs:
        parts.append("Certifications: " + _join(certs))

    if r.strengths:
        parts.append("Strengths: " + _join(r.strengths))
    if r.experience_relevance:
        parts.append("Relevance: " + r.experience_relevance)

    return "\n".join(parts).strip()


def profile_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def ensure_candidate_embedding(
    candidate_id: str,
    campaign_id: str,
    result: CandidateResult,
    *,
    embedding_repo: Any,
    force: bool = False,
) -> bool:
    """(Re)embed a candidate only if its normalised profile or model changed.

    Returns True if an embedding was (re)generated, False if skipped as unchanged.
    """
    text = normalize_profile(result)
    if not text:
        return False
    content_hash = profile_hash(text)
    model = active_embedding_model()

    if not force:
        meta = embedding_repo.get_meta(candidate_id)
        if meta and meta.get("content_hash") == content_hash and meta.get("model") == model:
            return False  # unchanged — avoid unnecessary regeneration

    result_vec = embed_texts([text])
    vector = result_vec.vectors[0] if result_vec.vectors else []
    if not vector:
        return False
    embedding_repo.upsert(
        candidate_id, campaign_id,
        embedding=vector, content_hash=content_hash,
        model=model, dimensions=result_vec.dimensions,
    )
    return True


def reindex_campaign(campaign_id: str, *, candidate_repo: Any, embedding_repo: Any, force: bool = False) -> dict:
    """Embed all analysed candidates in a campaign (skipping unchanged). No N+1."""
    candidates = candidate_repo.list_for_campaign_with_analysis(campaign_id)
    indexed = 0
    considered = 0
    for c in candidates:
        la = getattr(c, "latest_analysis", None)
        result_dict = la.get("result") if isinstance(la, dict) else None
        if not isinstance(result_dict, dict):
            continue
        try:
            result = CandidateResult(**result_dict)
        except Exception as exc:  # pragma: no cover
            logger.warning("Reindex: bad analysis for %s: %s", c.id, exc)
            continue
        considered += 1
        if ensure_candidate_embedding(c.id, campaign_id, result, embedding_repo=embedding_repo, force=force):
            indexed += 1
    logger.info("Reindex campaign %s | considered=%d (re)indexed=%d", campaign_id, considered, indexed)
    return {"considered": considered, "indexed": indexed, "total": len(candidates)}
