"""
Match Analysis Route — JD + Resume → Recruiter Match Report.

Endpoint:
    POST /api/v1/match-analysis
    Content-Type: multipart/form-data

Input:
    - job_description: str  (form text field)
    - file: UploadFile      (resume PDF or DOCX)

Output:
    JSON with match_analysis (MatchAnalysisResponse) and resume_data (ResumeData).
"""

import logging

from fastapi import APIRouter, File, Form, UploadFile, HTTPException, status
from fastapi.concurrency import run_in_threadpool

from app.services.resume_service import ResumeService
from app.services.upload_utils import save_upload_to_temp
from app.parser.exceptions import ParserError
from app.llm.match_analyzer import analyze_match

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/match-analysis", status_code=status.HTTP_200_OK)
async def match_analysis(
    job_description: str = Form(...),
    file: UploadFile = File(...),
):
    """
    Single-endpoint match analysis pipeline:
        1. Validate and save resume file
        2. Parse and extract structured resume data
        3. Run JD-resume match analysis (Groq + deterministic scoring)
        4. Return match results + resume data
    """
    # ── Validate inputs ───────────────────────────────────────────────────
    if not job_description or not job_description.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Job description cannot be empty.",
        )

    # ── Save file to a unique temp path ───────────────────────────────────
    file_path = await save_upload_to_temp(file)

    try:
        # ── Parse resume ──────────────────────────────────────────────────
        try:
            resume_data = await run_in_threadpool(ResumeService.process_resume, file_path)
            logger.info(f"Match Analysis: Resume parsed for '{resume_data.name}'")
        except ParserError as pe:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=str(pe),
            )
        except Exception:
            logger.exception("Match Analysis: Resume parsing failed")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to parse resume.",
            )

        # ── Run match analysis ────────────────────────────────────────────
        try:
            match_result = await run_in_threadpool(
                analyze_match, resume_data, job_description.strip()
            )
            logger.info(f"Match Analysis: Complete | score={match_result.job_match_score}")
        except RuntimeError as re_err:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=str(re_err),
            )
        except Exception:
            logger.exception("Match Analysis: Unexpected failure")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An unexpected error occurred during match analysis.",
            )

        return {
            "resume_data": resume_data.model_dump(),
            "match_analysis": match_result.model_dump(),
        }
    finally:
        file_path.unlink(missing_ok=True)
