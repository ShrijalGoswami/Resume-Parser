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
