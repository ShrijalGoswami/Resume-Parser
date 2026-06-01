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
from pathlib import Path

from fastapi import APIRouter, File, Form, UploadFile, HTTPException, status

from app.core.config import settings
from app.services.resume_service import ResumeService
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

    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No filename provided in upload.",
        )

    filename = Path(file.filename).name
    file_ext = Path(filename).suffix.lower()

    if file_ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file extension '{file_ext}'. "
                   f"Allowed: {', '.join(settings.ALLOWED_EXTENSIONS)}",
        )

    # ── Save file ─────────────────────────────────────────────────────────
    upload_dir = settings.upload_path
    upload_dir.mkdir(parents=True, exist_ok=True)

    # Clear previous uploads so test endpoints always pick the latest file
    for old_file in upload_dir.iterdir():
        if old_file.is_file() and old_file.suffix.lower() in settings.ALLOWED_EXTENSIONS:
            old_file.unlink(missing_ok=True)

    file_path = upload_dir / filename
    max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    bytes_written = 0

    try:
        with open(file_path, "wb") as f:
            while chunk := await file.read(1024 * 1024):
                bytes_written += len(chunk)
                if bytes_written > max_bytes:
                    f.close()
                    file_path.unlink(missing_ok=True)
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"File exceeds maximum allowed size of {settings.MAX_FILE_SIZE_MB}MB.",
                    )
                f.write(chunk)
    except HTTPException:
        raise
    except Exception as e:
        if file_path.exists():
            file_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error saving file: {str(e)}",
        )

    logger.info(f"Match Analysis: File saved ({bytes_written} bytes): {filename}")

    # ── Parse resume ──────────────────────────────────────────────────────
    try:
        resume_data = ResumeService.process_resume(file_path)
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

    # ── Run match analysis ────────────────────────────────────────────────
    try:
        match_result = analyze_match(resume_data, job_description.strip())
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
