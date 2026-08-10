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

    # 2. CORS — fail closed in production. A prod deployment must pin
    # ALLOWED_ORIGINS to its frontend domain(s).
    #
    # TWO failure modes, not one (A2). The wildcard was already refused here;
    # what was not, until now, was the variable being *absent* — which used to
    # resolve to "*" through the old default and so never reached this check at
    # all. Both are now the same refusal, because "explicitly insecure" and
    # "accidentally insecure" are the same outage and the second is likelier.
    if settings.ENVIRONMENT == "production":
        origins = settings.allowed_origins
        if not origins:
            raise RuntimeError(
                "ALLOWED_ORIGINS is not set in production. Set it to your explicit "
                "frontend domain(s) (comma-separated) before deploying. There is "
                "deliberately no default — an unset value must not silently allow "
                "every origin."
            )
        if "*" in origins:
            raise RuntimeError(
                "CORS is set to allow all origins ('*') in production. "
                "Set ALLOWED_ORIGINS to your explicit frontend domain(s) before deploying."
            )

    # 3. LLM configuration — non-fatal; parsing endpoints still work without it.
    # Reported per provider, not per key: naming GROQ_API_KEY here was the visible
    # half of C8, and it told an operator running any other provider to go and set
    # a variable their deployment does not use.
    from app.ai.gateway.gateway import configured_reasoning_providers, routable_providers

    configured = configured_reasoning_providers()
    if configured:
        logger.info(
            "Reasoning provider(s) configured: %s. AI analysis endpoints enabled.",
            ", ".join(configured),
        )
    else:
        logger.warning(
            "No configured reasoning provider (chain: %s). LLM analysis endpoints "
            "(/ats-analysis, /match-analysis) will return 503 until one of their "
            "API keys is set.",
            ", ".join(routable_providers()) or "none",
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

    # 4. AI configuration — FATAL on a configuration error, in ONE call (C9).
    #
    # Covers the provider chain (unknown names, a provider that cannot reason,
    # the fake in production) and the capability→model routing table. Fatal is
    # reserved for closed sets: a provider name outside the registry can never
    # work, so it should fail a deploy rather than every request afterwards.
    #
    # NOT fatal, deliberately: a missing API key, an entirely disabled chain, or
    # an unregistered role-model override. Each is either a supported state or an
    # operator's own choice, and refusing to boot would take the whole product
    # down over a feature that is merely off. Those are logged as warnings by the
    # validator and reported in `config_snapshot()`. See `app/ai/gateway/validation.py`.
    from app.ai.gateway.capability_routing import RoutingConfigError
    from app.ai.gateway.validation import AIConfigurationError, validate_ai_configuration
    try:
        validate_ai_configuration()
        if settings.AI_CAPABILITY_MODELS:
            logger.info("Capability→model routing validated (enabled=%s).",
                        settings.AI_ENABLE_CAPABILITY_ROUTING)
    except (AIConfigurationError, RoutingConfigError) as e:
        raise StartupError(str(e)) from e

    # Billing integrity: every active organization must have exactly one
    # subscription. Reports and continues — a service that refuses to boot over
    # one organization's row takes the product down for everyone else, and the
    # failure being guarded against is a SILENT demotion, not an unsafe one.
    try:
        from app.billing.health import log_integrity_on_startup

        log_integrity_on_startup()
    except Exception as exc:  # noqa: BLE001 - never block startup on a check
        logger.warning("Billing integrity check skipped: %s", exc)

    # Plan bindings: what the gateway CHARGES must equal what the page ADVERTISES.
    #
    # FATAL in production, and this is the one billing check that should be.
    # `lib/pricing.ts` publishes ₹999 and the Razorpay plan object carries its own
    # amount; the two are separate systems that can drift, and a mismatch between
    # what a customer is shown and what leaves their card is the single worst
    # defect this integration can produce. It should fail a deploy, not a card.
    #
    # Skipped when no bindings are configured — checkout is simply unavailable
    # then, which `start_checkout` reports honestly, and a stateless or
    # billing-less deployment is a configuration this app supports.
    _validate_plan_bindings()

    # Billing webhook secret — fatal in production when checkout is live. The
    # webhook is how a paid plan actually activates; without the secret every
    # webhook is rejected (verify_webhook_signature returns False on an empty
    # secret, and load_settings refuses to build the provider), so a customer
    # would pay and never be upgraded. That fail-closed behaviour is correct, but
    # a deploy should discover the missing secret at boot, not on the first
    # customer. Only fires in production AND only when self-serve checkout is
    # configured — a billing-less production deployment is supported.
    _validate_billing_webhook_secret()

    # Embedding store integrity: are the stored vectors from the model that is
    # actually serving queries? Placed last because it is a data-state check,
    # not a configuration one, and because it needs the AI config above to be
    # valid before "the active model" means anything.
    _validate_embedding_integrity()

    logger.info("Startup validation complete.")


def _validate_embedding_integrity() -> None:
    """Make an incomplete reindex loud instead of invisible.

    A stale store does not break anything that raises — it makes semantic search
    quietly return fewer and worse results. See `app.ai.embeddings.integrity`.
    Whether that refuses the boot is the operator's call
    (`EMBEDDING_STALENESS_ACTION`), because the right answer differs: for a
    search-led deployment stale data is an outage, for one where search is a
    secondary feature, refusing to boot would be self-inflicted downtime.
    """
    action = (settings.EMBEDDING_STALENESS_ACTION or "warn").strip().lower()
    if action == "off":
        logger.info("Embedding integrity check disabled (EMBEDDING_STALENESS_ACTION=off).")
        return

    try:
        from app.ai.embeddings.integrity import report_embedding_integrity

        report = report_embedding_integrity()
    except Exception as exc:  # noqa: BLE001 - never block startup on a check
        logger.warning("Embedding integrity check skipped: %s", exc)
        return

    # COULD NOT ASK ≠ GOT A BAD ANSWER. `skipped` and `unavailable` must never
    # fail a boot: a database blip would otherwise be indistinguishable from a
    # genuinely stale store and would take the whole service down.
    if action == "fail" and report.is_stale:
        raise StartupError(
            f"Embedding store is stale: {report.stale_rows} of {report.total_rows} rows "
            f"were produced by a model other than the active {report.active_model!r}. "
            f"Those candidates are invisible to semantic search. Reindex the affected "
            f"campaigns, or set EMBEDDING_STALENESS_ACTION=warn to boot anyway."
        )


def _validate_billing_webhook_secret() -> None:
    """Fail the boot in production if checkout is live but the webhook secret is
    absent. No-op in non-production and when no plan bindings are configured."""
    if settings.ENVIRONMENT != "production":
        return
    try:
        import os

        from app.billing.providers.razorpay import plans
        from app.billing.providers.razorpay.config import WEBHOOK_SECRET_ENV
    except Exception as exc:  # noqa: BLE001 - never block boot on an import problem
        logger.warning("Billing webhook secret not checked: %s", exc)
        return

    if not plans.configured_plans():
        # Self-serve checkout is not configured — a billing-less prod deploy.
        return

    if not os.environ.get(WEBHOOK_SECRET_ENV, "").strip():
        raise StartupError(
            f"{WEBHOOK_SECRET_ENV} is not set, but self-serve checkout is configured "
            "in production. Razorpay webhooks are how a paid plan activates; without "
            "the secret every webhook is rejected, so customers would pay and never be "
            "upgraded. Set the webhook secret before deploying."
        )


def _validate_plan_bindings() -> None:
    """Assert the gateway's prices match the published ones."""
    try:
        from app.billing.providers.razorpay import plans
    except Exception as exc:  # noqa: BLE001
        logger.warning("Razorpay plan bindings not checked: %s", exc)
        return

    configured = plans.configured_plans()
    if not configured:
        logger.info(
            "No Razorpay plan bindings configured — self-serve checkout is "
            "unavailable. Set %s to enable it.",
            " / ".join(sorted(plans.PLAN_ENV_VARS.values())),
        )
        return

    # COULD NOT ASK ≠ GOT A WRONG ANSWER, and conflating them here would be a
    # serious bug: `verify_bindings` catches a failed fetch internally and
    # reports it in the same list as a genuine price mismatch, so a Razorpay
    # outage would look identical to a misbound plan and would REFUSE TO BOOT
    # THE ENTIRE PRODUCT — for every customer, including the ones who never
    # touch billing. That inverts the standing rule that entitlement must
    # survive a gateway incident.
    #
    # So transport failures are recorded separately as they happen, and their
    # presence downgrades the whole check to "unverified" rather than "wrong".
    transport_errors: list[str] = []

    def fetch(plan_id: str) -> dict:
        from app.billing.providers.razorpay.provider import RazorpayProvider

        try:
            return RazorpayProvider()._client().plan.fetch(plan_id)
        except Exception as exc:  # noqa: BLE001
            transport_errors.append(f"{plan_id}: {exc}")
            raise

    try:
        problems = plans.verify_bindings(fetch)
    except Exception as exc:  # noqa: BLE001
        logger.warning(
            "Could not verify Razorpay plan bindings (%s). Prices are UNVERIFIED "
            "this boot.", exc,
        )
        return

    if transport_errors:
        logger.warning(
            "Could not reach Razorpay to verify plan bindings (%s). Prices are "
            "UNVERIFIED this boot; the check runs again on the next one.",
            "; ".join(transport_errors),
        )
        return

    if not problems:
        logger.info("Razorpay plan bindings verified: %s", ", ".join(sorted(configured)))
        return

    message = "Razorpay plan bindings disagree with the published prices: " + "; ".join(problems)
    if settings.ENVIRONMENT == "production":
        raise StartupError(
            message
            + ". Refusing to boot: charging a customer an amount the pricing page "
              "does not show is worse than being unavailable."
        )
    logger.error("%s (non-production: booting anyway)", message)
