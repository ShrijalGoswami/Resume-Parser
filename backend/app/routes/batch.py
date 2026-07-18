"""
Recruiter Batch Analysis Route.

Endpoint:
    POST /api/v1/batch-analysis
    Content-Type: multipart/form-data

Input:
    - job_description: str            (form text field, required)
    - files: list[UploadFile]         (2+ resume PDFs/DOCXs)
    - weights: str (optional JSON)    (override ranking weights)

Output:
    BatchAnalysisResponse — ranked candidates + dashboard analytics.

Each upload is saved to a unique temp file, processed concurrently, and the
temp files are always deleted. One invalid resume never fails the batch.
"""

import json
import logging
import uuid
from pathlib import Path

from fastapi import APIRouter, File, Form, UploadFile, HTTPException, status

from app.core.config import settings
from app.schemas.batch import RankingWeights, BatchAnalysisResponse
from app.services.upload_utils import save_upload_to_temp
from app.services.batch_service import process_batch

logger = logging.getLogger(__name__)
router = APIRouter()


def _parse_weights(raw: str | None) -> RankingWeights:
    """Parse optional weights JSON; fall back to defaults on any problem."""
    if not raw or not raw.strip():
        return RankingWeights()
    try:
        return RankingWeights(**json.loads(raw))
    except Exception as e:
        logger.warning(f"Batch: invalid weights payload, using defaults: {e}")
        return RankingWeights()


@router.post("/batch-analysis", status_code=status.HTTP_200_OK, response_model=BatchAnalysisResponse)
async def batch_analysis(
    job_description: str = Form(...),
    files: list[UploadFile] = File(...),
    weights: str | None = Form(default=None),
):
    if not job_description or not job_description.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Job description cannot be empty.")

    if not files:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="At least one resume file is required.")

    if len(files) > settings.MAX_BATCH_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Too many files: {len(files)}. Maximum per batch is {settings.MAX_BATCH_SIZE}.",
        )

    parsed_weights = _parse_weights(weights)

    valid_items: list[tuple[str, str, Path]] = []
    failed_items: list[tuple[str, str, str]] = []

    try:
        # Save each upload; validation failures become failed candidates, not a
        # whole-batch failure.
        for f in files:
            candidate_id = uuid.uuid4().hex[:12]
            filename = f.filename or f"resume-{candidate_id}"
            try:
                path = await save_upload_to_temp(f)
                valid_items.append((candidate_id, filename, path))
            except HTTPException as he:
                failed_items.append((candidate_id, filename, str(he.detail)))

        if not valid_items:
            # Every file was rejected at upload time.
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No valid resumes were uploaded. " +
                       (failed_items[0][2] if failed_items else ""),
            )

        logger.info(f"Batch: processing {len(valid_items)} resumes "
                    f"({len(failed_items)} rejected at upload)")

        result = await process_batch(
            job_description.strip(), valid_items, failed_items, parsed_weights
        )
        logger.info(f"Batch: complete | ranked={result.analytics.succeeded} "
                    f"failed={result.analytics.failed}")
        return result
    finally:
        for _cid, _name, path in valid_items:
            path.unlink(missing_ok=True)
