from pathlib import Path
from fastapi import APIRouter, File, UploadFile, HTTPException, status
from app.core.config import settings
from app.schemas.upload import UploadResponse

router = APIRouter()

@router.post("/upload", response_model=UploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_resume(file: UploadFile = File(...)) -> UploadResponse:
    """
    Upload a resume file (PDF or DOCX).
    Validates file extension and size before saving.
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No filename provided in upload."
        )

    # Sanitize and validate extension
    filename = Path(file.filename).name
    file_ext = Path(filename).suffix.lower()

    if file_ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file extension '{file_ext}'. Allowed extensions are: {', '.join(settings.ALLOWED_EXTENSIONS)}"
        )

    # Prepare upload directory
    upload_dir = settings.upload_path
    try:
        upload_dir.mkdir(parents=True, exist_ok=True)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not create upload directory: {str(e)}"
        )

    file_path = upload_dir / filename
    max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024

    # Save file and validate size during chunked write
    bytes_written = 0
    try:
        with open(file_path, "wb") as f:
            while chunk := await file.read(1024 * 1024):  # Read in 1MB chunks
                bytes_written += len(chunk)
                if bytes_written > max_bytes:
                    # Close and clean up the file
                    f.close()
                    file_path.unlink(missing_ok=True)
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"File exceeds maximum allowed size of {settings.MAX_FILE_SIZE_MB}MB."
                    )
                f.write(chunk)
    except HTTPException:
        raise
    except Exception as e:
        # Clean up in case of other write errors
        if file_path.exists():
            file_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error saving file: {str(e)}"
        )

    # Calculate relative saved path if possible
    try:
        saved_path = str(file_path.relative_to(upload_dir.parent))
    except (ValueError, Exception):
        saved_path = str(file_path)

    return UploadResponse(
        filename=filename,
        content_type=file.content_type or "application/octet-stream",
        file_size_kb=round(bytes_written / 1024, 2),
        saved_path=saved_path,
        message="Resume uploaded successfully."
    )
