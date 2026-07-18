"""
Recruiter batch analysis orchestrator.

Processes many resumes against one job description concurrently, computes an
explainable weighted rank per candidate, and aggregates dashboard analytics.

Design goals:
    - Concurrency without blocking the event loop (threadpool + semaphore).
    - Graceful per-resume failure: one bad resume never fails the batch.
    - One LLM call per resume (batch_analyzer), one parse per resume.
    - No permanent files: callers pass temp paths and clean them up.
"""

import asyncio
import logging
from collections import Counter
from pathlib import Path

from fastapi.concurrency import run_in_threadpool

from app.schemas.batch import (
    RankingWeights, CandidateResult, BatchAnalysisResponse,
    BatchAnalytics, SkillCount,
)
from app.services.resume_service import ResumeService
from app.parser.exceptions import ParserError
from app.nlp.ats_scorer import calculate_ats_score
from app.nlp.ranking_engine import (
    compute_candidate_score, semantic_similarity, resume_to_text,
    estimate_years_experience,
)
from app.llm.batch_analyzer import analyze_candidate

logger = logging.getLogger(__name__)

# Cap simultaneous resume pipelines so a large batch does not exhaust threads
# or hammer the Groq API. Each unit does one parse + one LLM call.
_MAX_CONCURRENCY = 5


def _process_one(
    job_description: str,
    candidate_id: str,
    filename: str,
    file_path: Path,
    weights: RankingWeights,
) -> CandidateResult:
    """
    Synchronous single-resume pipeline (run inside a threadpool worker):
    parse → ATS score → JD-aware LLM analysis → weighted ranking.

    Never raises: any failure is captured into a 'failed' CandidateResult.
    """
    try:
        resume_data = ResumeService.process_resume(file_path)
    except ParserError as pe:
        logger.warning(f"Batch: parse failed for {filename}: {pe}")
        return CandidateResult(candidate_id=candidate_id, filename=filename,
                               status="failed", error=f"Could not parse resume: {pe}")
    except Exception:
        logger.exception(f"Batch: unexpected parse error for {filename}")
        return CandidateResult(candidate_id=candidate_id, filename=filename,
                               status="failed", error="Failed to parse resume.")

    # Deterministic ATS scoring (never fails for valid ResumeData).
    ats_score, breakdown, _confidence = calculate_ats_score(resume_data)
    semantic = semantic_similarity(job_description, resume_to_text(resume_data))
    years = estimate_years_experience(resume_data)

    # JD-aware LLM analysis (one call). Degrade gracefully if the LLM is down.
    try:
        groq = analyze_candidate(resume_data, job_description)
        llm_ok = True
    except Exception as e:
        logger.warning(f"Batch: LLM analysis unavailable for {filename}: {e}")
        groq = None
        llm_ok = False

    matching = groq.matching_skills if groq else []
    missing = groq.missing_skills if groq else []
    relevant_projects = groq.relevant_projects if groq else []
    less_relevant = groq.less_relevant_projects if groq else []

    score = compute_candidate_score(
        ats_score=ats_score,
        ats_breakdown=breakdown,
        matching_skills=matching,
        missing_skills=missing,
        relevant_projects=relevant_projects,
        less_relevant_projects=less_relevant,
        semantic=semantic,
        weights=weights,
    )

    result = CandidateResult(
        candidate_id=candidate_id,
        filename=filename,
        status="success",
        overall_score=score.overall,
        score=score,
        name=resume_data.name or Path(filename).stem,
        email=resume_data.email,
        phone=resume_data.phone,
        ats_score=ats_score,
        ats_breakdown=breakdown,
        semantic_similarity=semantic,
        years_experience=years,
        top_skills=list(resume_data.skills[:8]),
        matching_skills=matching,
        missing_skills=missing,
        relevant_projects=relevant_projects,
        resume_data=resume_data,
    )

    if groq:
        result.summary = groq.candidate_summary
        result.strengths = groq.strengths
        result.weaknesses = groq.weaknesses
        result.experience_relevance = groq.experience_relevance
        result.recommendation = groq.hiring_recommendation
        result.recommendation_explanation = groq.recommendation_explanation
        result.interview_questions = groq.interview_questions
    else:
        result.summary = "AI insights are temporarily unavailable; scores reflect deterministic analysis only."
        result.recommendation = "Consider for Further Review"

    result.match_category = _category_for(score.overall)
    logger.info(f"Batch: scored {filename} → {score.overall} ({result.match_category}, llm={llm_ok})")
    return result


def _category_for(overall: int) -> str:
    if overall >= 85:
        return "Excellent Match"
    if overall >= 70:
        return "Strong Match"
    if overall >= 50:
        return "Moderate Match"
    return "Weak Match"


async def process_batch(
    job_description: str,
    valid_items: list[tuple[str, str, Path]],
    failed_items: list[tuple[str, str, str]],
    weights: RankingWeights,
) -> BatchAnalysisResponse:
    """
    Run all resume pipelines concurrently, rank successful candidates, and
    compute analytics.

    Args:
        valid_items:  (candidate_id, filename, temp_path) for saved uploads.
        failed_items: (candidate_id, filename, error) for uploads rejected
                      before processing (bad type, empty, too large).
    """
    semaphore = asyncio.Semaphore(_MAX_CONCURRENCY)

    async def worker(item: tuple[str, str, Path]) -> CandidateResult:
        candidate_id, filename, path = item
        async with semaphore:
            return await run_in_threadpool(
                _process_one, job_description, candidate_id, filename, path, weights
            )

    processed: list[CandidateResult] = list(await asyncio.gather(*(worker(i) for i in valid_items)))

    # Prepend upload-time failures so the recruiter sees every file.
    for candidate_id, filename, error in failed_items:
        processed.append(CandidateResult(candidate_id=candidate_id, filename=filename,
                                          status="failed", error=error))

    # Rank successful candidates by overall score (desc), tie-broken by ATS.
    succeeded = [c for c in processed if c.status == "success"]
    failed = [c for c in processed if c.status != "success"]
    succeeded.sort(key=lambda c: (c.overall_score, c.ats_score), reverse=True)
    for i, c in enumerate(succeeded, start=1):
        c.rank = i

    ordered = succeeded + failed
    analytics = _build_analytics(succeeded, failed)

    return BatchAnalysisResponse(
        job_description=job_description,
        weights=weights,
        candidates=ordered,
        analytics=analytics,
    )


def _build_analytics(succeeded: list[CandidateResult], failed: list[CandidateResult]) -> BatchAnalytics:
    total = len(succeeded) + len(failed)
    if not succeeded:
        return BatchAnalytics(total=total, succeeded=0, failed=len(failed))

    scores = [c.overall_score for c in succeeded]
    avg_score = round(sum(scores) / len(scores), 1)
    avg_years = round(sum(c.years_experience for c in succeeded) / len(succeeded), 1)
    top = max(succeeded, key=lambda c: c.overall_score)

    skill_counter: Counter[str] = Counter()
    missing_counter: Counter[str] = Counter()
    score_dist = {"Excellent Match": 0, "Strong Match": 0, "Moderate Match": 0, "Weak Match": 0}
    rec_dist: Counter[str] = Counter()

    for c in succeeded:
        skill_counter.update(s.strip() for s in c.top_skills if s.strip())
        missing_counter.update(s.strip() for s in c.missing_skills if s.strip())
        score_dist[c.match_category] = score_dist.get(c.match_category, 0) + 1
        if c.recommendation:
            rec_dist[c.recommendation] += 1

    return BatchAnalytics(
        total=total,
        succeeded=len(succeeded),
        failed=len(failed),
        average_score=avg_score,
        average_years_experience=avg_years,
        top_candidate_name=top.name,
        top_candidate_score=top.overall_score,
        top_skills=[SkillCount(skill=s, count=n) for s, n in skill_counter.most_common(10)],
        common_missing_skills=[SkillCount(skill=s, count=n) for s, n in missing_counter.most_common(10)],
        score_distribution=score_dist,
        recommendation_distribution=dict(rec_dist),
    )
