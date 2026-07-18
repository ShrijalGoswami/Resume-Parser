import tempfile
from pathlib import Path
# pyrefly: ignore [missing-import]
from pydantic_settings import BaseSettings, SettingsConfigDict

PROJECT_ROOT = Path(__file__).resolve().parents[3]
BACKEND_DIR = Path(__file__).resolve().parents[2]

# Application version and API version, surfaced by the /health endpoint.
APP_VERSION = "1.2.0"
API_VERSION = "v1"


class Settings(BaseSettings):
    """Application settings loaded from environment variables or .env.local file."""

    GROQ_API_KEY: str = ""
    UPLOAD_DIR: Path = PROJECT_ROOT / "uploads"
    MAX_FILE_SIZE_MB: int = 10
    ALLOWED_EXTENSIONS: list[str] = [".pdf", ".docx"]
    # Comma-separated list of allowed CORS origins, or "*" for any (no credentials).
    ALLOWED_ORIGINS: str = "*"
    # Deployment environment label ("development", "staging", "production").
    ENVIRONMENT: str = "development"
    # Where uploads are written while being processed. Defaults to the OS temp
    # directory so the app works on read-only/serverless filesystems (Vercel /tmp)
    # as well as Railway/Render. Override with TEMP_UPLOAD_DIR if needed.
    TEMP_UPLOAD_DIR: Path = Path(tempfile.gettempdir()) / "hirelens_uploads"

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
    def upload_path(self) -> Path:
        """Resolved absolute path to the (legacy) upload directory under PROJECT_ROOT.

        Used only by the legacy stateful /upload + /test-* endpoints.
        """
        path = Path(self.UPLOAD_DIR)
        if path.is_absolute():
            return path.resolve()
        return (PROJECT_ROOT / path).resolve()

    @property
    def temp_upload_path(self) -> Path:
        """Resolved absolute path to the ephemeral per-request upload directory."""
        return Path(self.TEMP_UPLOAD_DIR).resolve()


# Singleton instance of settings
settings = Settings()
