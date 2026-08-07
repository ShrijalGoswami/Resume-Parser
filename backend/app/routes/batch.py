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

import hashlib
import json
import logging
import uuid
from pathlib import Path

from fastapi import APIRouter, File, Form, UploadFile, HTTPException, status

from app.ai.utils.limits import job_description_error
from app.core.config import settings
from app.schemas.batch import RankingWeights, BatchAnalysisResponse
from app.services.upload_utils import save_upload_to_temp
from app.services.batch_service import process_batch
from app.enterprise.deps import OrgContextDep, RequireAiUse

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


@router.post("/batch-analysis", status_code=status.HTTP_200_OK, response_model=BatchAnalysisResponse, dependencies=[RequireAiUse])
async def batch_analysis(
    ctx: OrgContextDep,
    job_description: str = Form(...),
    files: list[UploadFile] = File(...),
    weights: str | None = Form(default=None),
):
    if not job_description or not job_description.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Job description cannot be empty.")

    jd_error = job_description_error(job_description)
    if jd_error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=jd_error)

    if not files:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="At least one resume file is required.")

    if len(files) > settings.MAX_BATCH_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Too many files: {len(files)}. Maximum per batch is {settings.MAX_BATCH_SIZE}.",
        )

    # Quota BEFORE any AI call. This is the earliest point at which the batch
    # size is known, and it is deliberately ahead of parsing and analysis: a FREE
    # organization that has used its credits must be stopped before the tokens
    # are spent, not after. Checking only at persist time would let an exhausted
    # account burn the AI budget on a 200-résumé batch and then be told no.
    #
    # The whole batch is checked as one unit — `can_upload_resume(len(files))`,
    # not one call per file — so a partial allowance answers "you have 3 of 10
    # left" instead of silently analysing three and dropping seven.
    ctx.plan_service().can_upload_resume(len(files)).raise_for_denied()

    parsed_weights = _parse_weights(weights)

    valid_items: list[tuple[str, str, Path]] = []
    failed_items: list[tuple[str, str, str]] = []
    # candidate_id -> (sha256_hex, size_bytes) for content-based dedup downstream.
    content_meta: dict[str, tuple[str, int]] = {}

    try:
        # Save each upload; validation failures become failed candidates, not a
        # whole-batch failure.
        for f in files:
            candidate_id = uuid.uuid4().hex[:12]
            filename = f.filename or f"resume-{candidate_id}"
            try:
                path = await save_upload_to_temp(f)
                valid_items.append((candidate_id, filename, path))
                # SHA-256 of the exact bytes on disk — the content identity used
                # for idempotent persistence (independent of filename).
                data = path.read_bytes()
                content_meta[candidate_id] = (hashlib.sha256(data).hexdigest(), len(data))
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
        # Attach content hash + size to each candidate result by id.
        for c in result.candidates:
            meta = content_meta.get(c.candidate_id)
            if meta:
                c.file_hash, c.file_size = meta
        logger.info(f"Batch: complete | ranked={result.analytics.succeeded} "
                    f"failed={result.analytics.failed}")
        return result
    finally:
        for _cid, _name, path in valid_items:
            path.unlink(missing_ok=True)
