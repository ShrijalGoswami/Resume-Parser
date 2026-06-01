"""
Export Report Route — generates and returns a downloadable PDF.

Endpoint:
    POST /api/v1/export-report

Input:
    JSON body matching ExportReportRequest (analysis + resume data).

Output:
    application/pdf  — streamed as a file download.
"""

import logging
import re

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import Response
from pydantic import BaseModel, Field

from app.schemas.analysis import AnalysisResponse, ScoreBreakdown
from app.services.report_generator import generate_report, generate_match_report

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Request schema ────────────────────────────────────────────────────────────

class ResumeDataPayload(BaseModel):
    """Subset of resume data needed for the PDF report."""
    name: str = ""
    email: str = ""
    phone: str = ""


class ExportReportRequest(BaseModel):
    """
    Payload sent by the frontend when the user clicks "Export Report".
    Contains the full analysis result plus candidate contact info.
    """
    analysis: AnalysisResponse = Field(default_factory=AnalysisResponse)
    resume_data: ResumeDataPayload = Field(default_factory=ResumeDataPayload)


# ── Endpoint ──────────────────────────────────────────────────────────────────

def _sanitize_filename(name: str) -> str:
    """Turn a candidate name into a safe filename component."""
    safe = re.sub(r"[^\w\s-]", "", name).strip()
    safe = re.sub(r"[\s]+", "_", safe)
    return safe or "Candidate"


@router.post("/export-report", status_code=status.HTTP_200_OK)
async def export_report(payload: ExportReportRequest):
    """
    Generate a PDF report from the provided analysis data.

    Returns the PDF as an ``application/pdf`` response with a
    ``Content-Disposition`` header so the browser triggers a download.
    """
    try:
        analysis_dict = payload.analysis.model_dump()
        resume_dict   = payload.resume_data.model_dump()

        pdf_bytes = generate_report(analysis_dict, resume_dict)

        candidate_name = _sanitize_filename(payload.resume_data.name)
        filename = f"ATS_Report_{candidate_name}.pdf"

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
            },
        )

    except Exception as e:
        logger.exception("Export Report Endpoint: PDF generation failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate PDF report: {str(e)}",
        )


# ── Match Report Export ───────────────────────────────────────────────────────

class ExportMatchReportRequest(BaseModel):
    """Payload for match report PDF export."""
    match_analysis: dict = Field(default_factory=dict)
    resume_data: ResumeDataPayload = Field(default_factory=ResumeDataPayload)


@router.post("/export-match-report", status_code=status.HTTP_200_OK)
async def export_match_report(payload: ExportMatchReportRequest):
    """
    Generate a PDF recruiter match report from the provided match analysis data.
    """
    try:
        pdf_bytes = generate_match_report(
            payload.match_analysis, payload.resume_data.model_dump()
        )

        candidate_name = _sanitize_filename(payload.resume_data.name)
        filename = f"Match_Report_{candidate_name}.pdf"

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
            },
        )

    except Exception as e:
        logger.exception("Export Match Report: PDF generation failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate match report: {str(e)}",
        )
