"""
ATS Analysis Route — stateless single-request resume analysis.

Endpoint:
    POST /api/v1/ats-analysis
    Content-Type: multipart/form-data

Input:
    - file: UploadFile  (resume PDF or DOCX)

Output:
    JSON with resume_data (ResumeData) and analysis (AnalysisResponse).

Unlike the legacy upload + /test-analysis flow, this endpoint carries the
file through the whole pipeline in one request, so concurrent users can
never receive each other's results.
"""

import logging

from fastapi import APIRouter, File, UploadFile, HTTPException, status
from fastapi.concurrency import run_in_threadpool

from app.services.resume_service import ResumeService
from app.services.upload_utils import save_upload_to_temp
from app.parser.exceptions import ParserError
from app.llm.analyzer import analyze_resume

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/ats-analysis", status_code=status.HTTP_200_OK)
async def ats_analysis(file: UploadFile = File(...)):
    """
    Stateless ATS analysis pipeline:
        1. Validate and save the resume to a unique temp file
        2. Parse and extract structured resume data
        3. Run deterministic ATS scoring + Groq explanation
        4. Delete the temp file and return the results
    """
    file_path = await save_upload_to_temp(file)

    try:
        try:
            resume_data = await run_in_threadpool(ResumeService.process_resume, file_path)
            # Avoid logging candidate PII (name); log a non-identifying signal only.
            logger.info(f"ATS Analysis: resume parsed ({len(resume_data.skills)} skills extracted)")
        except ParserError as pe:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=str(pe),
            )
        except Exception:
            logger.exception("ATS Analysis: Resume parsing failed")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to parse resume.",
            )

        try:
            analysis = await run_in_threadpool(analyze_resume, resume_data)
            logger.info(f"ATS Analysis: Complete | ATS={analysis.ats_score}")
        except RuntimeError as err:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=str(err),
            )
        except Exception:
            logger.exception("ATS Analysis: Unexpected failure")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An unexpected error occurred during resume analysis.",
            )

        return {
            "resume_data": resume_data.model_dump(),
            "analysis": analysis.model_dump(),
        }
    finally:
        file_path.unlink(missing_ok=True)
