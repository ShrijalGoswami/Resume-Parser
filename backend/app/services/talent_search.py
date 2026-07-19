"""
Semantic Talent Search service — the reusable retrieval engine.

Pipeline (NO LLM anywhere): embed the query → cosine-rank recruiter-scoped
candidate embeddings → hydrate names/scores → highlight matching concepts. Used by
the search routes AND the Recruiter Copilot, so retrieval logic lives in one place.

Everything is recruiter-scoped (repositories + RLS): no cross-tenant leakage.
"""

from __future__ import annotations

import logging
import math
import re
from typing import Any, Optional

from app.ai.embeddings import embed_texts
from app.schemas.batch import CandidateResult
from app.schemas.search import SearchFilters, SearchResultItem, TalentSearchResponse
from app.services.embedding_pipeline import ensure_candidate_embedding, reindex_campaign
from app.services.vector_search import SupabaseVectorStore

logger = logging.getLogger(__name__)

_WORD_RE = re.compile(r"[a-z0-9+#.]{2,}")
_STOP = frozenset(
    "find show me with and or the for who candidates people someone strong "
    "experience experienced similar to a an of in on skills skilled".split()
)

# Recruiter-vocabulary expansion. The default embedding provider is a
# dependency-free *hashing* model that cannot bridge synonyms (fresher↔graduate,
# AI↔machine learning, cloud↔AWS). Explicit expansion restores recall/precision
# for these common queries without needing a neural embedding key.
_SYNONYMS: dict[str, list[str]] = {
    "fresher": ["entry level", "junior", "graduate", "intern", "trainee", "recent graduate"],
    "freshers": ["entry level", "junior", "graduate", "intern", "trainee", "recent graduate"],
    "junior": ["entry level", "graduate", "fresher", "intern"],
    "senior": ["lead", "staff", "principal", "experienced"],
    "ai": ["machine learning", "ml", "deep learning", "nlp", "artificial intelligence", "neural", "pytorch", "tensorflow"],
    "ml": ["machine learning", "ai", "deep learning", "nlp", "pytorch", "tensorflow"],
    "cloud": ["aws", "gcp", "azure", "kubernetes", "cloud"],
    "devops": ["devops", "kubernetes", "terraform", "ci/cd", "jenkins", "infrastructure", "ansible"],
    "backend": ["backend", "server", "api", "microservices"],
    "frontend": ["frontend", "react", "vue", "angular", "ui"],
    "communication": ["communication", "collaboration", "stakeholder", "presentation", "leadership", "led"],
    "database": ["postgresql", "mysql", "mongodb", "redis", "sql", "database"],
}


def _query_concepts(text: str) -> set[str]:
    return {w for w in _WORD_RE.findall((text or "").lower()) if w not in _STOP}


def _concept_variants(concept: str) -> list[str]:
    """A query concept plus its recruiter-vocabulary synonyms (all lowercase)."""
    return [concept, *_SYNONYMS.get(concept, [])]


def _candidate_blobs(cand: Any, result: Optional[CandidateResult]) -> tuple[str, str]:
    """
    Two-tier searchable text for lexical matching:

      * strong — structured, high-confidence signal: the candidate's actual
        skills list plus a seniority signal derived from years of experience.
        A concept found here is genuinely possessed by the candidate.
      * weak   — free-text prose (AI summary, strengths, experience relevance).
        Useful for recall but noisy: it also contains negations ("no Python
        experience") and aspirations ("eager to learn backend"), so matches here
        count at a reduced weight and never dominate.

    Keeping them separate stops generic prose terms from saturating the score.
    """
    # Seniority signal. The estimated years count is noisy, so prefer explicit
    # résumé wording (title/summary) and only fall back to years. This keeps a
    # mis-parsed year count from mislabelling a senior as a fresher (or vice-versa).
    yrs = result.years_experience if result and result.years_experience is not None else None
    sen_text = " ".join([
        (result.name if result else "") or "",
        (result.summary if result else "") or "",
    ]).lower()
    _FRESH = ("fresher", "recent graduate", "entry-level", "entry level", "new grad", "seeking an entry")
    _SENIOR = ("senior", "staff engineer", "principal", "lead ", "tech lead", "years of experience")
    seniority = ""
    if any(m in sen_text for m in _FRESH):
        seniority = "fresher entry level junior graduate trainee"
    elif any(m in sen_text for m in _SENIOR):
        seniority = "senior experienced lead"
    elif yrs is not None and yrs <= 1:
        seniority = "fresher entry level junior graduate trainee"
    elif yrs is not None and yrs >= 6:
        seniority = "senior experienced lead"
    strong = " ".join([
        str(getattr(cand, "full_name", "") or ""),
        result.name if result else "",
        " ".join(_candidate_skills(result)),
        seniority,
    ]).lower()
    weak = ""
    if result is not None:
        weak = " ".join([
            result.summary or "",
            result.experience_relevance or "",
            result.recommendation or "",
            " ".join(result.strengths or []),
        ]).lower()
    return strong, weak


def _variant_hit(variant: str, tokens: set[str]) -> bool:
    """A synonym variant matches only if ALL its word-tokens are present as whole
    tokens — never as substrings. This prevents 'ai' matching inside 'email' or
    'api' inside 'apis'."""
    vt = _WORD_RE.findall(variant.lower())
    return bool(vt) and all(t in tokens for t in vt)


_WEAK_WEIGHT = 0.4  # a concept found only in prose counts less than a real skill


def _lexical_scores(query: str, strong: dict[str, str], weak: dict[str, str]) -> dict[str, float]:
    """
    IDF-weighted, two-tier concept coverage per candidate. Each query concept
    (expanded for synonyms) is weighted by rarity across the set (so specific
    skills like 'fastapi' dominate generic terms like 'developer'), and by tier:
    a full hit in the structured skills/seniority text, or a reduced hit in prose.
    Matching is token-exact (word boundaries), never substring. Returns id -> [0,1].
    """
    concepts = _query_concepts(query)
    ids = list(strong.keys())
    if not concepts or not ids:
        return {cid: 0.0 for cid in ids}
    n = len(ids)
    strong_tok = {cid: set(_WORD_RE.findall(strong.get(cid, ""))) for cid in ids}
    weak_tok = {cid: set(_WORD_RE.findall(weak.get(cid, ""))) for cid in ids}
    df: dict[str, int] = {}
    tier: dict[str, dict[str, float]] = {cid: {} for cid in ids}  # cid -> concept -> weight
    for c in concepts:
        variants = _concept_variants(c)
        d = 0
        for cid in ids:
            if any(_variant_hit(v, strong_tok[cid]) for v in variants):
                tier[cid][c] = 1.0
                d += 1
            elif any(_variant_hit(v, weak_tok[cid]) for v in variants):
                tier[cid][c] = _WEAK_WEIGHT
                d += 1
        df[c] = d
    idf = {c: math.log((n + 1) / (df[c] + 1)) + 1.0 for c in concepts}
    total = sum(idf.values()) or 1.0
    return {cid: sum(idf[c] * w for c, w in tier[cid].items()) / total for cid in ids}


def _candidate_skills(result: Optional[CandidateResult]) -> list[str]:
    if result is None:
        return []
    resume_skills = result.resume_data.skills if result.resume_data else []
    return list(dict.fromkeys((result.matching_skills or []) + (result.top_skills or []) + resume_skills))


def _matched_concepts(concepts: set[str], skills: list[str], limit: int = 8) -> list[str]:
    out: list[str] = []
    for s in skills:
        sl = s.lower()
        if any(c in sl or sl in c for c in concepts):
            out.append(s)
        if len(out) >= limit:
            break
    return out


def _result_from_row(row: Optional[dict]) -> Optional[CandidateResult]:
    result_dict = row.get("result") if isinstance(row, dict) else None
    if not isinstance(result_dict, dict):
        return None
    try:
        return CandidateResult(**result_dict)
    except Exception:  # pragma: no cover
        return None


def _passes_filters(item: SearchResultItem, filters: Optional[SearchFilters]) -> bool:
    if not filters:
        return True
    if filters.min_score is not None and (item.overall_score or 0) < filters.min_score:
        return False
    if filters.min_experience is not None and (item.years_experience or 0) < filters.min_experience:
        return False
    return True


class _Hydrator:
    """Resolves candidate id → display fields, minimising queries."""

    def __init__(self, candidate_repo: Any, campaign_id: Optional[str], candidate_ids: Optional[list[str]] = None):
        self._repo = candidate_repo
        self._campaign_id = campaign_id
        self._by_id: dict[str, Any] = {}
        self._analysis: dict[str, dict] = {}
        if campaign_id:
            # One batch (2 queries) instead of N.
            for c in candidate_repo.list_for_campaign_with_analysis(campaign_id):
                self._by_id[c.id] = c
                if isinstance(getattr(c, "latest_analysis", None), dict):
                    self._analysis[c.id] = c.latest_analysis
        elif candidate_ids:
            # Cross-campaign (global) search: batch-load the matched ids in 2
            # queries instead of get()+latest_analysis() per match (was N+1).
            self._by_id = candidate_repo.get_many(candidate_ids)
            self._analysis = candidate_repo.latest_analyses_for(candidate_ids)

    def blobs(self, candidate_id: str) -> tuple[str, str]:
        cand = self._by_id.get(candidate_id)
        analysis = self._analysis.get(candidate_id)
        if cand is None:
            try:
                cand = self._repo.get(candidate_id)
                analysis = self._repo.latest_analysis(candidate_id)
            except Exception:
                return "", ""
        return _candidate_blobs(cand, _result_from_row(analysis))

    def item(self, candidate_id: str, campaign_id: Optional[str], score: float, concepts: set[str]) -> Optional[SearchResultItem]:
        cand = self._by_id.get(candidate_id)
        analysis = self._analysis.get(candidate_id)
        if cand is None:
            try:
                cand = self._repo.get(candidate_id)
                analysis = self._repo.latest_analysis(candidate_id)
            except Exception:
                return None
        result = _result_from_row(analysis)
        return SearchResultItem(
            candidate_id=candidate_id,
            name=getattr(cand, "full_name", None) or (result.name if result else "") or "Unnamed candidate",
            campaign_id=campaign_id or getattr(cand, "campaign_id", None),
            similarity=round(score, 4),
            overall_score=(result.overall_score if result else None),
            ats_score=(result.ats_score if result else None),
            years_experience=(result.years_experience if result else None),
            stage=getattr(cand, "stage", None),
            matched_concepts=_matched_concepts(concepts, _candidate_skills(result)),
        )


def search_talent(
    query: str,
    *,
    campaign_id: Optional[str] = None,
    limit: int = 10,
    filters: Optional[SearchFilters] = None,
    candidate_repo: Any,
    embedding_repo: Any,
    auto_index: bool = True,
) -> TalentSearchResponse:
    """Natural-language semantic search over the recruiter's candidates."""
    indexed = 0
    # Lazily index a campaign the first time it is searched (cheap thereafter).
    if campaign_id and auto_index and not embedding_repo.list_for_recruiter(campaign_id):
        stats = reindex_campaign(campaign_id, candidate_repo=candidate_repo, embedding_repo=embedding_repo)
        indexed = stats["indexed"]

    embedded = embed_texts([query])
    qvec = embedded.vectors[0] if embedded.vectors else []
    store = SupabaseVectorStore(embedding_repo)
    # Over-fetch by embedding similarity, then hybrid re-rank. With hashing
    # embeddings the cosine is noisy, so pull a wide candidate pool.
    matches = store.search(qvec, campaign_id=campaign_id, limit=max(limit * 5, 30))

    concepts = _query_concepts(query)
    hydrator = _Hydrator(candidate_repo, campaign_id, candidate_ids=[m.candidate_id for m in matches])

    # Hybrid ranking: IDF-weighted lexical concept coverage (reliable) blended
    # with embedding cosine (weak with the hashing provider). Lexical dominates;
    # embedding breaks ties and adds fuzzy signal.
    emb_by_id = {m.candidate_id: max(0.0, min(1.0, m.score)) for m in matches}
    strong_blobs: dict[str, str] = {}
    weak_blobs: dict[str, str] = {}
    for m in matches:
        s, w = hydrator.blobs(m.candidate_id)
        strong_blobs[m.candidate_id] = s
        weak_blobs[m.candidate_id] = w
    lex_by_id = _lexical_scores(query, strong_blobs, weak_blobs)

    scored: list[tuple[float, SearchResultItem]] = []
    for m in matches:
        lex = lex_by_id.get(m.candidate_id, 0.0)
        emb = emb_by_id.get(m.candidate_id, 0.0)
        combined = 0.72 * lex + 0.28 * emb
        item = hydrator.item(m.candidate_id, m.campaign_id, combined, concepts)
        if item and _passes_filters(item, filters):
            scored.append((combined, item))

    scored.sort(key=lambda t: t[0], reverse=True)
    results = [it for _s, it in scored[:limit]]

    return TalentSearchResponse(
        query=query, provider=f"hybrid+{embedded.provider}:{embedded.model}",
        count=len(results), indexed=indexed, results=results,
    )


def search_similar(
    candidate_id: str,
    *,
    campaign_id: Optional[str] = None,
    limit: int = 10,
    candidate_repo: Any,
    embedding_repo: Any,
) -> TalentSearchResponse:
    """Vector-similarity 'find similar candidates' (independent of ATS scores)."""
    src = embedding_repo.get(candidate_id)
    if src is None:
        # Build the source embedding on demand from stored analysis.
        try:
            cand = candidate_repo.get(candidate_id)
            analysis = candidate_repo.latest_analysis(candidate_id)
            result = _result_from_row(analysis)
            if result is not None:
                ensure_candidate_embedding(
                    candidate_id, getattr(cand, "campaign_id", campaign_id) or campaign_id or "",
                    result, embedding_repo=embedding_repo,
                )
                src = embedding_repo.get(candidate_id)
        except Exception as exc:  # pragma: no cover
            logger.info("Similar search: could not build source embedding: %s", exc)

    qvec = src.get("embedding") if isinstance(src, dict) else None
    if not isinstance(qvec, list) or not qvec:
        return TalentSearchResponse(query=f"similar:{candidate_id}", count=0, results=[])

    store = SupabaseVectorStore(embedding_repo)
    matches = store.search(qvec, campaign_id=campaign_id, limit=limit, exclude_ids=[candidate_id])
    _match_ids = [m.candidate_id for m in matches]

    # Concepts = the source candidate's own skills, to highlight shared strengths.
    src_result = _result_from_row(candidate_repo.latest_analysis(candidate_id))
    concepts = {s.lower() for s in _candidate_skills(src_result)}
    hydrator = _Hydrator(candidate_repo, campaign_id, candidate_ids=_match_ids)
    results = []
    for m in matches:
        item = hydrator.item(m.candidate_id, m.campaign_id, m.score, concepts)
        if item:
            results.append(item)

    return TalentSearchResponse(
        query=f"similar:{candidate_id}", provider="vector",
        count=len(results), results=results,
    )
