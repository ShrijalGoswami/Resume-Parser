import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings, APP_VERSION, API_VERSION
from app.core.observability import (
    configure_logging,
    RequestContextMiddleware,
    SecurityHeadersMiddleware,
    MaxBodySizeMiddleware,
    RateLimitMiddleware,
)
from app.core.startup import validate_startup
from app.db.supabase_client import close_transport, init_transport
from app.db.supabase_client import supabase_available
from fastapi import Depends
from fastapi.openapi.docs import get_swagger_ui_html
from app.routes import export, match, analyze, batch, copilot, campaigns, account, analytics, search, admin, reports, agent, org, integrations, knowledge, prediction, billing
from app.enterprise.deps import require_entitlement
from app.enterprise.entitlements import PlanError

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
    # Warm the shared Supabase connection pool before serving traffic, so the
    # first requests don't race each other into building it.
    init_transport()
    yield
    close_transport()
    logger.info("Hirevo API shutting down.")


# ── API documentation surface (A1) ───────────────────────────────────────────
# The interactive docs publish every route, parameter and schema this service
# has. That is exactly what you want while building it and exactly what you do
# not want facing the internet: it is free reconnaissance for anyone deciding
# where to push.
#
# `docs_url=None` alone was NOT enough, and that was the defect. It disables
# FastAPI's built-in handler, but the custom `/docs` route further down re-served
# Swagger UI unconditionally, and `redoc_url` / `openapi_url` were never set at
# all — so they kept their framework defaults and answered 200 in production.
# Three doors, one of them closed.
#
# All three are now gated on the same flag, so they can only ever be open or
# closed together. Development is unchanged.
DOCS_ENABLED = settings.ENVIRONMENT != "production"

app = FastAPI(
    title="AI Resume Parser API",
    description="Backend API for AI-powered Resume Parsing and Analysis",
    version=APP_VERSION,
    lifespan=lifespan,
    # Always None: when docs are enabled they are served by the custom handler
    # below (which pins the Swagger UI asset versions).
    docs_url=None,
    redoc_url="/redoc" if DOCS_ENABLED else None,
    openapi_url="/openapi.json" if DOCS_ENABLED else None,
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

# ── Entitlement (402) responses ───────────────────────────────────────────────
# `PlanError` carries a structured decision — which capability, which plan lifts
# it, how much quota is left. FastAPI's default HTTPException handler would nest
# all of that under `detail`, forcing the client to reach through a wrapper for
# every field. This handler emits it FLAT, so the upgrade surface reads
# `code` / `required_plan` / `used` / `limit` directly and never parses prose.
#
# `detail` is still present and human-readable, so a client that knows nothing
# about entitlements (or an ad-hoc curl) still shows a sensible message.
@app.exception_handler(PlanError)
async def _plan_error_handler(request: Request, exc: PlanError) -> JSONResponse:
    logger.info(
        "entitlement.denied | code=%s feature=%s metric=%s plan=%s required=%s used=%s limit=%s path=%s",
        exc.decision.reason, exc.decision.feature, exc.decision.metric,
        exc.decision.current_plan, exc.decision.required_plan,
        exc.decision.used, exc.decision.limit, request.url.path,
    )
    return JSONResponse(status_code=exc.status_code, content=exc.decision.as_error())


# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(analyze.router, prefix="/api/v1", tags=["Analyze"])
app.include_router(match.router, prefix="/api/v1", tags=["Match"])
app.include_router(batch.router, prefix="/api/v1", tags=["Batch"])
app.include_router(
    copilot.router, prefix="/api/v1",
    dependencies=[Depends(require_entitlement("ai_copilot", action="copilot.accessed"))],
)
app.include_router(export.router, prefix="/api/v1", tags=["Export"])
# ── V4 persistence layer (additive; requires Supabase config to function) ─────
app.include_router(campaigns.router, prefix="/api/v1")
app.include_router(account.router, prefix="/api/v1")
app.include_router(analytics.router, prefix="/api/v1")
app.include_router(
    search.router, prefix="/api/v1",
    dependencies=[Depends(require_entitlement("semantic_search", action="search.accessed"))],
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
    dependencies=[Depends(require_entitlement("executive_reports", action="report.generated"))],
)
# `autonomous_agent` is gated PER-ENDPOINT inside the agent router, not here. The
# router-level gate also covered `GET /agent/recommendations`, which is the Decision
# Ledger's only data source — so the Ledger returned 403 and rendered an error for
# every free- and professional-plan org, and a downgrade would have made an org's
# permanent decision record unreadable. See the module docstring in routes/agent.py.
app.include_router(agent.router, prefix="/api/v1")
app.include_router(org.router, prefix="/api/v1")
# ── Subsystems gated by the monetization audit (1 Aug 2026) ───────────────────
# These three shipped before the plan matrix existed and were therefore reachable
# by every organization on every plan. The audit found them; the placements are
# product decisions, recorded here and in the catalog.
#
# Integrations is gated at the ROUTER on `integrations` (Pro). The webhook
# endpoints inside it additionally require `webhooks` (Enterprise) per the
# approved matrix — a per-endpoint gate, because this router also serves the
# ordinary ATS/calendar connections that Pro includes.
app.include_router(
    integrations.router, prefix="/api/v1",
    dependencies=[Depends(require_entitlement("integrations"))],
)
app.include_router(
    knowledge.router, prefix="/api/v1",
    dependencies=[Depends(require_entitlement("org_knowledge"))],
)
app.include_router(
    prediction.router, prefix="/api/v1",
    dependencies=[Depends(require_entitlement("predictive_intelligence"))],
)
# ── Billing (Phase 4 Step 4) ──────────────────────────────────────────────────
# NO ROUTER-LEVEL DEPENDENCY, and that is deliberate. This router carries two
# incompatible security models: the customer-facing endpoints are owner-only via
# `require_permission(ORG_MANAGE)` declared per route, while
# `/billing/webhook/razorpay` must be reachable by Razorpay, which has no session
# and no bearer token. Its identity is the HMAC signature over the raw body.
#
# A router-level auth dependency here would 401 every webhook, and the symptom
# would be silent: Razorpay would retry, give up, and the subscriptions of
# paying customers would simply never activate.
#
# There is also NO `require_entitlement` on this router. Billing is how an
# organization ACQUIRES a plan — gating it on the plan it does not yet have
# would be a lock on the door to the shop.
app.include_router(billing.router, prefix="/api/v1")


# Registered only outside production (A1). Not registering the route is what
# makes production return a genuine 404 — a handler that exists and returns 403
# still confirms the endpoint is there.
#
# This also retires A7 with no separate change: the Swagger UI assets load from
# a third-party CDN (cdnjs), and a route that is never registered never fetches
# them. The CDN is now reachable only from a developer's own machine.
if DOCS_ENABLED:

    @app.get("/docs", include_in_schema=False)
    async def custom_swagger_ui_html():
        return get_swagger_ui_html(
            openapi_url=app.openapi_url,
            title=app.title + " - Swagger UI",
            oauth2_redirect_url=app.swagger_ui_oauth2_redirect_url,
            swagger_js_url="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.18.2/swagger-ui-bundle.js",
            swagger_css_url="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.18.2/swagger-ui.css",
        )


def _llm_dependency_state() -> str:
    """`configured` · `misconfigured` · `not_configured` — three distinct answers.

    `misconfigured` is the one C9 added, and the distinction is operational: a
    missing API key means AI is switched off and everything else works, while a
    misconfiguration means the configuration names something that cannot work.
    Reporting both as `not_configured` sent an operator looking for a key that
    was never the problem.

    Liveness is deliberately NOT folded in here. Whether a provider is answering
    right now is `provider_health` on the admin snapshot; a probe that fails on a
    provider's temporary outage is worse than no probe.
    """
    from app.ai.gateway.validation import FATAL, check_provider_configuration

    if any(p.severity == FATAL for p in check_provider_configuration()):
        return "misconfigured"
    return "configured" if settings.is_llm_configured else "not_configured"


# GET is the documented health contract. HEAD is registered separately and kept
# out of the schema: a single handler serving both methods made FastAPI derive an
# operationId per method from the same function name, colliding ("Duplicate
# Operation ID health_check_health_get/_head") and emitting an OpenAPI document
# with non-unique operationIds — enough to break generated clients. Uptime probes
# that issue HEAD still get a 200 with identical headers and no body.
@app.head("/health", include_in_schema=False)
@app.get("/health", tags=["Health"])
async def health_check(check: str | None = None):
    """Lightweight operational health check. Never exposes secrets.

    `?check=billing` additionally verifies that every active organization has
    exactly one subscription row. It is OPT-IN because it reads three tables,
    and a liveness probe that fails on a slow query is worse than no probe.
    See `app/billing/health.py` and `docs/rca/SUBSCRIPTION_ROWS_MISSING.md`.
    """
    uptime_seconds = round(time.time() - _START_TIME, 1)
    payload = {
        "status": "healthy",
        "service": "hirelens-api",
        "version": APP_VERSION,
        "api_version": API_VERSION,
        "environment": settings.ENVIRONMENT,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "uptime_seconds": uptime_seconds,
        "dependencies": {
            "llm": _llm_dependency_state(),
            "persistence": "configured" if supabase_available() else "not_configured",
            "auth": "configured" if settings.is_auth_configured else "not_configured",
        },
        "limits": {
            "max_file_size_mb": settings.MAX_FILE_SIZE_MB,
            "allowed_extensions": settings.ALLOWED_EXTENSIONS,
        },
    }

    if check == "billing":
        from app.billing.health import billing_integrity_status

        billing = billing_integrity_status()
        payload["billing_integrity"] = billing
        # A missing subscription row silently demotes a grandfathered customer,
        # so it must be visible to something that watches status codes rather
        # than only to something that reads bodies.
        if not billing.get("healthy", True):
            payload["status"] = "degraded"
            return JSONResponse(status_code=503, content=payload)

    return payload
