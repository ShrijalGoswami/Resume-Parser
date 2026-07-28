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
    RateLimitMiddleware,
)
from app.core.startup import validate_startup
from app.db.supabase_client import supabase_available
from fastapi import Depends
from fastapi.openapi.docs import get_swagger_ui_html
from app.routes import export, match, analyze, batch, copilot, campaigns, account, analytics, search, admin, reports, agent, org, integrations, knowledge, prediction
from app.enterprise.deps import feature_gate

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
    docs_url=None,
)

# ── Middleware (executed in reverse registration order for requests) ──────────
# Security headers on every response.
app.add_middleware(SecurityHeadersMiddleware)
# Per-request ID + access logging + guaranteed clean 500s.
app.add_middleware(RequestContextMiddleware)
# Early rejection of oversized bodies.
app.add_middleware(MaxBodySizeMiddleware)

# Per-IP rate limit for expensive/unauthenticated endpoints (cost/DoS safety net).
app.add_middleware(RateLimitMiddleware)

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
app.include_router(analyze.router, prefix="/api/v1", tags=["Analyze"])
app.include_router(match.router, prefix="/api/v1", tags=["Match"])
app.include_router(batch.router, prefix="/api/v1", tags=["Batch"])
app.include_router(
    copilot.router, prefix="/api/v1",
    dependencies=[Depends(feature_gate("ai_copilot", action="copilot.accessed"))],
)
app.include_router(export.router, prefix="/api/v1", tags=["Export"])
# ── V4 persistence layer (additive; requires Supabase config to function) ─────
app.include_router(campaigns.router, prefix="/api/v1")
app.include_router(account.router, prefix="/api/v1")
app.include_router(analytics.router, prefix="/api/v1")
app.include_router(
    search.router, prefix="/api/v1",
    dependencies=[Depends(feature_gate("semantic_search", action="search.accessed"))],
)
app.include_router(admin.router, prefix="/api/v1")
# ── Feature-flag gated + audited AI capabilities ──────────────────────────────
# Every capability in `enterprise/feature_flags.FEATURES` must be enforced
# somewhere, or its Settings toggle is a control that controls nothing and a
# lower-plan org keeps a capability its plan does not include. `ai_copilot` and
# `semantic_search` are gated at the router above; `candidate_comparison` and
# `interview_intelligence` are gated per-endpoint inside the campaigns router
# (that router also serves ungated campaign CRUD, so it cannot be gated whole).
app.include_router(
    reports.router, prefix="/api/v1",
    dependencies=[Depends(feature_gate("executive_reports", action="report.generated"))],
)
# `autonomous_agent` is gated PER-ENDPOINT inside the agent router, not here. The
# router-level gate also covered `GET /agent/recommendations`, which is the Decision
# Ledger's only data source — so the Ledger returned 403 and rendered an error for
# every free- and professional-plan org, and a downgrade would have made an org's
# permanent decision record unreadable. See the module docstring in routes/agent.py.
app.include_router(agent.router, prefix="/api/v1")
app.include_router(org.router, prefix="/api/v1")
app.include_router(integrations.router, prefix="/api/v1")
app.include_router(knowledge.router, prefix="/api/v1")
app.include_router(prediction.router, prefix="/api/v1")


@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui_html():
    return get_swagger_ui_html(
        openapi_url=app.openapi_url,
        title=app.title + " - Swagger UI",
        oauth2_redirect_url=app.swagger_ui_oauth2_redirect_url,
        swagger_js_url="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.18.2/swagger-ui-bundle.js",
        swagger_css_url="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.18.2/swagger-ui.css",
    )


# GET is the documented health contract. HEAD is registered separately and kept
# out of the schema: a single handler serving both methods made FastAPI derive an
# operationId per method from the same function name, colliding ("Duplicate
# Operation ID health_check_health_get/_head") and emitting an OpenAPI document
# with non-unique operationIds — enough to break generated clients. Uptime probes
# that issue HEAD still get a 200 with identical headers and no body.
@app.head("/health", include_in_schema=False)
@app.get("/health", tags=["Health"])
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
            "persistence": "configured" if supabase_available() else "not_configured",
            "auth": "configured" if settings.is_auth_configured else "not_configured",
        },
        "limits": {
            "max_file_size_mb": settings.MAX_FILE_SIZE_MB,
            "allowed_extensions": settings.ALLOWED_EXTENSIONS,
        },
    }
