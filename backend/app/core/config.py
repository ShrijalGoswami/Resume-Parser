import tempfile
from pathlib import Path
# pyrefly: ignore [missing-import]
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]

# Application version and API version, surfaced by the /health endpoint.
APP_VERSION = "1.2.0"
API_VERSION = "v1"


class Settings(BaseSettings):
    """Application settings loaded from environment variables or .env.local file."""

    GROQ_API_KEY: str = ""
    MAX_FILE_SIZE_MB: int = 10
    ALLOWED_EXTENSIONS: list[str] = [".pdf", ".docx"]
    # Maximum number of resumes accepted in a single recruiter batch request.
    MAX_BATCH_SIZE: int = 100
    # Comma-separated list of allowed CORS origins, or "*" for any (no credentials).
    ALLOWED_ORIGINS: str = "*"
    # Deployment environment label ("development", "staging", "production").
    ENVIRONMENT: str = "development"
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
    # Storage bucket names (overridable, but defaults match migration 0003).
    STORAGE_BUCKET_RESUMES: str = "resumes"
    STORAGE_BUCKET_JD: str = "job-descriptions"
    STORAGE_BUCKET_PACKS: str = "interview-packs"
    STORAGE_BUCKET_AVATARS: str = "avatars"
    # Lifetime (seconds) for generated signed download URLs.
    SIGNED_URL_TTL_SECONDS: int = 3600

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
    model_config = SettingsConfigDict(
        env_file=(BACKEND_DIR / ".env", BACKEND_DIR / ".env.local"),
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
        key = self.GROQ_API_KEY
        return bool(key) and key != "gsk_placeholder_key"

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
            or self.SUPABASE_JWKS_URL
            or (self.SUPABASE_URL and self.supabase_anon_key)
        )


# Singleton instance of settings
settings = Settings()
