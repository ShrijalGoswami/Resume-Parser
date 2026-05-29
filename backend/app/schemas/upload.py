from pydantic import BaseModel

class UploadResponse(BaseModel):
    """
    Response schema for successful resume file upload.
    """
    filename: str
    content_type: str
    file_size_kb: float
    saved_path: str
    message: str
