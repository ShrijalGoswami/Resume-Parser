import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings, APP_VERSION, API_VERSION
from app.core.observability import (
    configure_logging,
    RequestContextMiddleware,
    SecurityHeadersMiddleware,
    MaxBodySizeMiddleware,
)
from app.core.startup import validate_startup
from app.routes import upload, test, export, match, analyze

# Install structured, request-ID-aware logging before anything else logs.
configure_logging()
logger = logging.getLogger("app")

# Process start time, used to report uptime from /health.
_START_TIME = time.time()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Fail fast on critical misconfiguration; log (don't crash) on the rest.
    validate_startup()
    logger.info(f"Resolved temp upload directory: {settings.temp_upload_path.as_posix()}")
    yield
    logger.info("HireLens API shutting down.")


app = FastAPI(
    title="AI Resume Parser API",
    description="Backend API for AI-powered Resume Parsing and Analysis",
    version=APP_VERSION,
    lifespan=lifespan,
)

# ── Middleware (executed in reverse registration order for requests) ──────────
# Security headers on every response.
app.add_middleware(SecurityHeadersMiddleware)
# Per-request ID + access logging + guaranteed clean 500s.
app.add_middleware(RequestContextMiddleware)
# Early rejection of oversized bodies.
app.add_middleware(MaxBodySizeMiddleware)

# CORS. The spec forbids credentials with a wildcard origin, so credentials
# are only enabled when explicit origins are configured.
_origins = settings.allowed_origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials="*" not in _origins,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID", "X-Response-Time-ms"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(upload.router, prefix="/api/v1", tags=["Upload"])
app.include_router(test.router, prefix="/api/v1", tags=["Test"])
app.include_router(export.router, prefix="/api/v1", tags=["Export"])
app.include_router(match.router, prefix="/api/v1", tags=["Match"])
app.include_router(analyze.router, prefix="/api/v1", tags=["Analyze"])


@app.api_route("/health", methods=["GET", "HEAD"], tags=["Health"])
async def health_check():
    """Lightweight operational health check. Never exposes secrets."""
    uptime_seconds = round(time.time() - _START_TIME, 1)
    return {
        "status": "healthy",
        "service": "hirelens-api",
        "version": APP_VERSION,
        "api_version": API_VERSION,
        "environment": settings.ENVIRONMENT,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "uptime_seconds": uptime_seconds,
        "dependencies": {
            "llm": "configured" if settings.is_llm_configured else "not_configured",
        },
        "limits": {
            "max_file_size_mb": settings.MAX_FILE_SIZE_MB,
            "allowed_extensions": settings.ALLOWED_EXTENSIONS,
        },
    }
