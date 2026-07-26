"""
Startup validation. Runs once when the application boots and fails fast on
conditions that would make the service non-functional (e.g. no writable temp
directory). Non-fatal misconfigurations (e.g. missing LLM key) are logged as
loud warnings so the service still boots and reports status via /health.
"""

import logging

from app.core.config import settings

logger = logging.getLogger("app.startup")


class StartupError(RuntimeError):
    """Raised when a critical startup precondition is not met."""


def validate_startup() -> None:
    """Validate critical runtime preconditions. Raises StartupError if fatal."""
    logger.info(
        f"Starting HireLens API | env={settings.ENVIRONMENT} "
        f"| max_upload={settings.MAX_FILE_SIZE_MB}MB "
        f"| allowed_ext={settings.ALLOWED_EXTENSIONS}"
    )

    # 1. Temp upload directory must be creatable and writable — this is fatal.
    tmp_dir = settings.temp_upload_path
    try:
        tmp_dir.mkdir(parents=True, exist_ok=True)
        probe = tmp_dir / ".write_probe"
        probe.write_text("ok", encoding="utf-8")
        probe.unlink(missing_ok=True)
        logger.info(f"Temp upload directory is writable: {tmp_dir.as_posix()}")
    except Exception as e:
        raise StartupError(
            f"Temp upload directory is not writable ({tmp_dir}): {e}. "
            f"Set TEMP_UPLOAD_DIR to a writable path."
        ) from e

    # 2. CORS — fail closed on the insecure wildcard in production. A prod
    # deployment must pin ALLOWED_ORIGINS to its frontend domain(s).
    if settings.ENVIRONMENT == "production" and "*" in settings.allowed_origins:
        raise RuntimeError(
            "CORS is set to allow all origins ('*') in production. "
            "Set ALLOWED_ORIGINS to your explicit frontend domain(s) before deploying."
        )

    # 3. LLM configuration — non-fatal; parsing endpoints still work without it.
    if settings.is_llm_configured:
        logger.info("Groq LLM is configured. AI analysis endpoints enabled.")
    else:
        logger.warning(
            "GROQ_API_KEY is not configured. LLM analysis endpoints "
            "(/ats-analysis, /match-analysis) will return 503 until it is set."
        )

    # 3b. Persistence/auth — non-fatal, because a stateless deployment (public
    # résumé analysis only, no accounts) is a configuration this app deliberately
    # supports. But in production the far more likely cause is a forgotten env
    # var, and the symptom is silent: the service returns 200 from /health while
    # sign-in and every authenticated route are dead. So say so, loudly, at boot.
    if settings.ENVIRONMENT == "production":
        missing = []
        if not settings.is_supabase_configured:
            missing.append("SUPABASE_URL / SUPABASE_ANON_KEY")
        if not settings.is_auth_configured:
            missing.append("SUPABASE_JWT_SECRET or a reachable JWKS URL")
        if missing:
            logger.error(
                "PRODUCTION WITHOUT PERSISTENCE: %s not configured. The service "
                "will boot and report healthy, but sign-in, roles, candidates and "
                "every authenticated route are unavailable. If a stateless "
                "deployment is intended this is expected; otherwise set the "
                "missing variables and redeploy.",
                " and ".join(missing),
            )

    # 4. Capability→model routing — FATAL on misconfiguration (unknown model,
    # un-inferable/unregistered provider, missing key, invalid capability).
    from app.ai.gateway.capability_routing import RoutingConfigError, validate_capability_routing
    try:
        validate_capability_routing()
        if settings.AI_CAPABILITY_MODELS:
            logger.info("Capability→model routing validated (enabled=%s).",
                        settings.AI_ENABLE_CAPABILITY_ROUTING)
    except RoutingConfigError as e:
        raise StartupError(str(e)) from e

    logger.info("Startup validation complete.")
