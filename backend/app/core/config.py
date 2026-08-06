import os
import tempfile
from pathlib import Path
# pyrefly: ignore [missing-import]
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]

#: The env files this application reads, lowest precedence first.
ENV_FILES = (BACKEND_DIR / ".env", BACKEND_DIR / ".env.local")


def _export_env_files_to_environ() -> None:
    """Put the env files into `os.environ` as well as into `Settings`.

    THE GAP THIS CLOSES, which cost nothing to find and would have cost an
    afternoon to debug:

    `pydantic-settings` reads `.env` / `.env.local` into the `Settings` OBJECT.
    It does not touch `os.environ`. That is fine for every setting declared on
    the model — but the billing modules deliberately read `os.environ` directly
    (`billing/providers/razorpay/config.py`, `plans.py`), because credentials
    for a payment gateway should come from the process environment and have no
    business being a typed application setting with a default.

    The result was that `RAZORPAY_KEY_ID` written into `.env.local` was
    invisible to billing. The failure is the worst kind: the operator is told
    "missing environment variable: RAZORPAY_KEY_ID" while looking straight at a
    file that plainly contains it.

    `override=False` is the important argument. A real process environment
    variable always wins over a file — that is what makes a production
    deployment, a CI run and a `docker run -e` behave the way everyone expects,
    and it means a stale `.env.local` on someone's laptop cannot silently
    displace the value a deployment actually set.
    """
    try:
        from dotenv import load_dotenv
    except ImportError:  # pragma: no cover - python-dotenv ships with pydantic-settings
        return
    for path in ENV_FILES:
        if path.exists():
            load_dotenv(path, override=False)


_export_env_files_to_environ()

# Application version and API version, surfaced by the /health endpoint.
# Reported by /health. Keep in step with the top entry in CHANGELOG.md and the git
# tag — a version string that lags gives a wrong answer during an incident, which
# is exactly when it gets read.
APP_VERSION = "4.3.0"
API_VERSION = "v1"


class Settings(BaseSettings):
    """Application settings loaded from environment variables or .env.local file."""

    GROQ_API_KEY: str = ""
    MAX_FILE_SIZE_MB: int = 10
    ALLOWED_EXTENSIONS: list[str] = [".pdf", ".docx"]
    # Maximum number of resumes accepted in a single recruiter batch request.
    MAX_BATCH_SIZE: int = 100
    # Monetization enforcement. "on" (default) means plan limits and feature
    # entitlements are enforced with a 402; "off" disables every gate without a
    # deploy. This is the ROLLBACK LEVER — if a quota misfires against real
    # customers, one environment variable restores the previous behaviour while
    # the cause is found. It is deliberately not a per-feature switch: a partial
    # enforcement state is harder to reason about than either extreme.
    ENTITLEMENT_ENFORCEMENT: str = "on"
    # Comma-separated list of allowed CORS origins, or "*" for any (no credentials).
    ALLOWED_ORIGINS: str = "*"
    # Deployment environment label ("development", "staging", "production").
    ENVIRONMENT: str = "development"
    # Root log level. Default INFO matches the behaviour this was extracted from,
    # so nothing changes unless it is set. It exists because the level was
    # hardcoded: during an incident there was no way to turn on DEBUG without a
    # code change and redeploy, which is the worst possible moment to need one.
    LOG_LEVEL: str = "INFO"
    # Where uploads are written while being processed. Defaults to the OS temp
    # directory so the app works on read-only/serverless filesystems (Vercel /tmp)
    # as well as Railway/Render. Override with TEMP_UPLOAD_DIR if needed.
    TEMP_UPLOAD_DIR: Path = Path(tempfile.gettempdir()) / "hirelens_uploads"

    # ── Supabase (persistence layer — V4) ────────────────────────────────────
    # All optional so the stateless AI endpoints keep working with zero config.
    # Persistence + auth features activate only when these are set.
    #   SUPABASE_URL              e.g. https://<ref>.supabase.co
    #   SUPABASE_ANON_KEY         public anon key (client-facing; RLS enforced)
    #   SUPABASE_SERVICE_ROLE_KEY trusted server key (bypasses RLS — backend only)
    #   SUPABASE_JWT_SECRET       HS256 secret used to verify user access tokens
    # Newer Supabase projects rename these keys; we accept both so either config
    # activates the layer without hand-editing the env:
    #   SUPABASE_PUBLISHABLE_KEY  == anon key (new name)
    #   SUPABASE_SECRET_KEY       == service-role key (new name)
    #   SUPABASE_JWKS_URL         asymmetric (ES256/RS256) verification endpoint
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_JWT_SECRET: str = ""
    # Alternate/newer key names (fallbacks resolved by the properties below).
    SUPABASE_PUBLISHABLE_KEY: str = ""
    SUPABASE_SECRET_KEY: str = ""
    SUPABASE_JWKS_URL: str = ""
    NEXT_PUBLIC_SUPABASE_ANON_KEY: str = ""
    # Expected JWT audience for Supabase user tokens.
    SUPABASE_JWT_AUD: str = "authenticated"
    # How long a fetched JWKS key set stays cached (seconds). Supabase rotates
    # signing keys rarely; a miss on an unknown `kid` refetches immediately, so
    # this only bounds how long a *revoked* key could still verify.
    JWKS_CACHE_SECONDS: int = 600
    # Storage bucket names (overridable, but defaults match migration 0003).
    STORAGE_BUCKET_RESUMES: str = "resumes"
    STORAGE_BUCKET_JD: str = "job-descriptions"
    STORAGE_BUCKET_PACKS: str = "interview-packs"
    STORAGE_BUCKET_AVATARS: str = "avatars"
    # Lifetime (seconds) for generated signed download URLs.
    SIGNED_URL_TTL_SECONDS: int = 3600

    # Trust `X-Forwarded-For` when deriving the client IP for rate limiting.
    # Enable ONLY when a proxy that overwrites the header sits in front of the app
    # (Render, Vercel, an ALB). Behind such a proxy, `request.client.host` is the
    # proxy's own address for every request, so all traffic shares one rate-limit
    # bucket and one abusive client can lock out everybody. Left off by default so
    # a directly-exposed instance cannot be fooled by a spoofed header.
    TRUST_PROXY_HEADERS: bool = False

    # ── AI Foundation Layer (V5 / Sprint 3) ──────────────────────────────────
    # Centralized AI configuration consumed by app.ai.config.AIConfig. Defaults
    # preserve the historical Groq behavior exactly (llama-3.3-70b, temp 0.2).
    AI_DEFAULT_PROVIDER: str = "groq"
    AI_DEFAULT_MODEL: str = "llama-3.3-70b-versatile"
    AI_TEMPERATURE: float = 0.2
    AI_MAX_TOKENS: int = 2048
    AI_TIMEOUT_SECONDS: int = 30
    AI_MAX_NETWORK_RETRIES: int = 3
    AI_MAX_JSON_RETRIES: int = 3
    AI_MAX_SCHEMA_RETRIES: int = 2
    # Retry backoff (A4 reliability). Network/timeout retries wait an exponential,
    # jittered delay between attempts; transient rate-limits (RPM/TPM) get a small
    # bounded number of extra retries honoring Retry-After. Quota exhaustion is
    # never retried. All delays are capped so total added latency stays bounded.
    AI_RETRY_BASE_DELAY_MS: int = 250        # base for exponential backoff
    AI_RETRY_MAX_DELAY_MS: int = 5000        # per-attempt delay cap
    AI_MAX_RATE_LIMIT_RETRIES: int = 2       # bounded retries for transient 429s

    # ── AI Gateway & Model Management (V5 / Sprint 7.5) ───────────────────────
    # The whole platform switches providers/models by configuration only — no
    # feature-level code changes. `AI_PROVIDER` (if set) is the primary reasoning
    # provider; it falls back to AI_DEFAULT_PROVIDER for backward compatibility.
    AI_PROVIDER: str = ""                     # groq | gemini | anthropic | openai | openrouter (blank → AI_DEFAULT_PROVIDER)
    # Configurable, comma-separated fallback provider chain (empty = no fallback).
    AI_FALLBACK_PROVIDERS: str = ""           # e.g. "groq,gemini"
    AI_ENABLE_FALLBACK: bool = True
    # Providers explicitly disabled (comma list) — never routed to, even if keyed.
    AI_DISABLED_PROVIDERS: str = ""           # e.g. "openrouter,gemini"
    # Health cooldowns: how long to skip a provider after a failure before
    # probing it again (auto-recovery). Rate-limits get a longer cooldown.
    AI_HEALTH_COOLDOWN_SECONDS: int = 30      # timeout / temporary failure
    AI_RATE_LIMIT_COOLDOWN_SECONDS: int = 60  # rate-limited / quota
    AI_UNAVAILABLE_COOLDOWN_SECONDS: int = 120  # config/unavailable
    # Per-logical-role model overrides (blank → the provider's registered default).
    DEFAULT_REASONING_MODEL: str = ""
    FAST_REASONING_MODEL: str = ""
    CHEAP_REASONING_MODEL: str = ""
    LONG_CONTEXT_MODEL: str = ""
    PREMIUM_REASONING_MODEL: str = ""
    # Provider API keys (server-side only; never exposed to the frontend).
    GEMINI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    OPENROUTER_API_KEY: str = ""
    MOONSHOT_API_KEY: str = ""                # Kimi / Moonshot AI

    # ── Per-provider configuration (overrides the global AI_* defaults) ──────
    # A JSON map of provider-name → overrides. Only the keys present override;
    # anything omitted falls back to the global defaults above. API keys stay in
    # their dedicated env vars (above) for clarity — this block is timeout/retry/
    # model policy. Keys accept provider names or aliases (e.g. "claude").
    #   AI_PROVIDERS={"groq":{"timeout_seconds":30,"max_network_retries":3,
    #                         "default_model":"llama-3.3-70b-versatile"},
    #                 "claude":{"timeout_seconds":60}}
    AI_PROVIDERS: dict = {}

    # ── Capability→MODEL routing (model-first; disabled by default) ──────────
    # Pin a capability to a MODEL; the provider is inferred from the model
    # registry (a model already knows its provider). This is the single routing
    # mechanism. A value may be one model, or a LIST (primary first) so future
    # fallback chains need no config-schema change (only the primary is used today).
    # Inert until AI_ENABLE_CAPABILITY_ROUTING=true. Validated strictly at startup.
    #   AI_CAPABILITY_MODELS={"resume_analysis":"gemini-2.0-flash",
    #                         "interview_generation":["claude-opus-4-8","claude-sonnet-5"]}
    AI_CAPABILITY_MODELS: dict = {}
    AI_ENABLE_CAPABILITY_ROUTING: bool = False

    # ── Fake provider (offline evaluation — app/ai/providers/fake_provider) ──
    # Selected with AI_PROVIDER=fake. These pick its behaviour WITHOUT editing
    # provider code, so a reviewer can reproduce a timeout or a malformed-JSON
    # response from the environment alone. Ignored unless the fake is selected,
    # and the provider refuses to construct at all when ENVIRONMENT=production.
    #   AI_FAKE_BEHAVIOUR: success | invalid_json | schema_mismatch | empty |
    #                      unicode_edge | timeout | rate_limit | quota |
    #                      provider_error | config_error
    AI_FAKE_BEHAVIOUR: str = "success"
    AI_FAKE_LATENCY_MS: int = 0               # simulated latency per call
    AI_FAKE_PROMPT_TOKENS: int = 0            # 0 → derive deterministically from length
    AI_FAKE_COMPLETION_TOKENS: int = 0        # 0 → derive deterministically from length

    # ── Integration Platform (V6 / Sprint 11) ────────────────────────────────
    # Fernet key used to encrypt integration credentials (OAuth refresh tokens are
    # NEVER stored in plaintext). If unset, a stable key is derived from the JWT
    # secret for dev; set a dedicated 32-byte urlsafe-base64 key in production.
    INTEGRATION_ENCRYPTION_KEY: str = ""
    # Per-provider client secrets for OAuth (server-side only).
    GOOGLE_OAUTH_CLIENT_ID: str = ""
    GOOGLE_OAUTH_CLIENT_SECRET: str = ""
    MICROSOFT_OAUTH_CLIENT_ID: str = ""
    MICROSOFT_OAUTH_CLIENT_SECRET: str = ""
    SLACK_OAUTH_CLIENT_ID: str = ""
    SLACK_OAUTH_CLIENT_SECRET: str = ""
    ZOOM_OAUTH_CLIENT_ID: str = ""
    ZOOM_OAUTH_CLIENT_SECRET: str = ""

    @property
    def reasoning_provider(self) -> str:
        """The configured primary reasoning provider (AI_PROVIDER wins)."""
        return (self.AI_PROVIDER or self.AI_DEFAULT_PROVIDER or "groq").strip().lower()

    @property
    def fallback_providers(self) -> list[str]:
        return [p.strip().lower() for p in self.AI_FALLBACK_PROVIDERS.split(",") if p.strip()]

    @property
    def disabled_providers(self) -> set[str]:
        return {p.strip().lower() for p in self.AI_DISABLED_PROVIDERS.split(",") if p.strip()}

    # ── Semantic Search / Embeddings (V5 / Sprint 6) ─────────────────────────
    # Retrieval is separate from the LLM: candidate profiles are embedded and
    # searched by vector similarity; the LLM only explains results afterwards.
    # Default provider is dependency-free (deterministic hashing) so semantic
    # search works out of the box; swap to a real model (OpenAI/Voyage/…) via env.
    EMBEDDING_PROVIDER: str = "hashing"          # hashing | openai
    EMBEDDING_MODEL: str = "hashing-v1"          # e.g. text-embedding-3-small
    EMBEDDING_DIMENSIONS: int = 1536
    OPENAI_API_KEY: str = ""

    # Absolute paths so the env file is found regardless of the launch CWD.
    # Same tuple `_export_env_files_to_environ()` uses, so the two views of
    # configuration can never read different files.
    model_config = SettingsConfigDict(
        env_file=ENV_FILES,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def allowed_origins(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

    @property
    def max_file_size_bytes(self) -> int:
        return self.MAX_FILE_SIZE_MB * 1024 * 1024

    @property
    def is_llm_configured(self) -> bool:
        """True when ANY provider in the active reasoning chain is configured.

        This used to be `bool(GROQ_API_KEY)` (C8) — one vendor's key standing in
        for "can this service reason at all", which reported an OpenAI-only
        deployment as `llm: not_configured` while it served every AI request
        correctly. The question belongs to the gateway, which owns the chain;
        the import is deferred because the AI layer reads this module.
        """
        from app.ai.gateway.gateway import is_reasoning_configured

        return is_reasoning_configured()

    @property
    def temp_upload_path(self) -> Path:
        """Resolved absolute path to the ephemeral per-request upload directory."""
        return Path(self.TEMP_UPLOAD_DIR).resolve()

    @property
    def supabase_anon_key(self) -> str:
        """Resolve the public/anon key across legacy and new naming schemes."""
        return (
            self.SUPABASE_ANON_KEY
            or self.SUPABASE_PUBLISHABLE_KEY
            or self.NEXT_PUBLIC_SUPABASE_ANON_KEY
        )

    @property
    def supabase_service_key(self) -> str:
        """Resolve the trusted server key across legacy and new naming schemes."""
        return self.SUPABASE_SERVICE_ROLE_KEY or self.SUPABASE_SECRET_KEY

    @property
    def is_supabase_configured(self) -> bool:
        """
        True when the persistence layer can serve recruiter requests. The app
        talks to Postgres/Storage as the end user (RLS enforced), which needs
        only the URL + anon key. The service-role key is optional (admin ops).
        """
        return bool(self.SUPABASE_URL and self.supabase_anon_key)

    @property
    def is_auth_configured(self) -> bool:
        """
        True when user-token verification is possible — either locally (HS256
        shared secret or a JWKS endpoint for asymmetric tokens) or via the
        remote Supabase Auth fallback (needs URL + anon key).
        """
        return bool(
            self.SUPABASE_JWT_SECRET
            or self.jwks_url
            or (self.SUPABASE_URL and self.supabase_anon_key)
        )

    @property
    def jwks_url(self) -> str:
        """JWKS endpoint for verifying asymmetric (ES256/RS256) Supabase tokens.

        Derived from SUPABASE_URL when not set explicitly, because every Supabase
        project exposes it at a fixed path. Without this, projects issuing ES256
        tokens (the current default) had no local verification path at all and
        fell back to a network call to Supabase Auth on *every* request.
        """
        if self.SUPABASE_JWKS_URL:
            return self.SUPABASE_JWKS_URL
        if self.SUPABASE_URL:
            return f"{self.SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json"
        return ""


# Singleton instance of settings
settings = Settings()
