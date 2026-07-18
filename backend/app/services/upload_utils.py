"""
Shared helpers for validating and persisting uploaded resume files.

Used by the stateless analysis endpoints (/ats-analysis, /match-analysis)
which save each upload under a unique temporary name and delete it when
the request finishes, so concurrent users never see each other's files.

Uploads are written to the OS temp directory (settings.temp_upload_path)
so the app works on read-only / serverless filesystems as well as
container hosts (Railway/Render).
"""

import logging
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

from app.core.config import settings

logger = logging.getLogger(__name__)

# Magic byte signatures for the formats we accept. Extension checks can be
# spoofed, so we also sniff the leading bytes as defense in depth.
#   PDF  → "%PDF"
#   DOCX → ZIP container, starts with "PK\x03\x04" (also "PK\x05\x06"/"PK\x07\x08")
_MAGIC_SIGNATURES = {
    ".pdf": [b"%PDF"],
    ".docx": [b"PK\x03\x04", b"PK\x05\x06", b"PK\x07\x08"],
}


def validate_resume_upload(file: UploadFile) -> str:
    """Validate filename and extension. Returns the sanitized extension."""
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No filename provided in upload.",
        )

    file_ext = Path(Path(file.filename).name).suffix.lower()
    if file_ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file extension '{file_ext}'. "
                   f"Allowed: {', '.join(settings.ALLOWED_EXTENSIONS)}",
        )
    return file_ext


def _verify_magic_bytes(head: bytes, file_ext: str) -> bool:
    """Return True if the leading bytes match the expected format signature."""
    signatures = _MAGIC_SIGNATURES.get(file_ext)
    if not signatures:
        # No signature registered for this extension → don't block.
        return True
    return any(head.startswith(sig) for sig in signatures)


async def save_upload_to_temp(file: UploadFile) -> Path:
    """
    Save an already-validated upload under a unique name in the temp upload dir.

    Enforces the configured size limit during a chunked write and validates the
    file's magic bytes. The caller is responsible for deleting the returned path
    when processing is done (use a try/finally).
    """
    file_ext = validate_resume_upload(file)

    tmp_dir = settings.temp_upload_path
    try:
        tmp_dir.mkdir(parents=True, exist_ok=True)
    except Exception as e:
        logger.exception("Could not create temp upload directory")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not create upload directory: {str(e)}",
        )

    file_path = tmp_dir / f"{uuid.uuid4().hex}{file_ext}"
    max_bytes = settings.max_file_size_bytes
    bytes_written = 0
    head = b""

    try:
        with open(file_path, "wb") as f:
            while chunk := await file.read(1024 * 1024):
                if not head:
                    head = chunk[:8]
                    if not _verify_magic_bytes(head, file_ext):
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"File content does not match a valid {file_ext} document.",
                        )
                bytes_written += len(chunk)
                if bytes_written > max_bytes:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"File exceeds maximum allowed size of {settings.MAX_FILE_SIZE_MB}MB.",
                    )
                f.write(chunk)
    except HTTPException:
        file_path.unlink(missing_ok=True)
        raise
    except Exception as e:
        file_path.unlink(missing_ok=True)
        logger.exception("Error saving uploaded file")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error saving file: {str(e)}",
        )

    if bytes_written == 0:
        file_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    return file_path
