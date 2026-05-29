import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.routes import upload, test

# Configure logging format
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

logger = logging.getLogger("app")
logger.info(f"Resolved upload directory: {settings.upload_path.as_posix()}")

app = FastAPI(
    title="AI Resume Parser API",
    description="Backend API for AI-powered Resume Parsing and Analysis",
    version="1.0.0"
)

# Configure CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(upload.router, prefix="/api/v1", tags=["Upload"])
app.include_router(test.router, prefix="/api/v1", tags=["Test"])

@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "allowed_extensions": settings.ALLOWED_EXTENSIONS,
        "max_file_size_mb": settings.MAX_FILE_SIZE_MB
    }
