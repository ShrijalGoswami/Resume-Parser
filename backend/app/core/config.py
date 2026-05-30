from pathlib import Path
# pyrefly: ignore [missing-import]
from pydantic_settings import BaseSettings, SettingsConfigDict

PROJECT_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    """Application settings loaded from environment variables or .env.local file."""

    GROQ_API_KEY: str = ""
    UPLOAD_DIR: Path = PROJECT_ROOT / "uploads"
    MAX_FILE_SIZE_MB: int = 10
    ALLOWED_EXTENSIONS: list[str] = [".pdf", ".docx"]

    model_config = SettingsConfigDict(env_file=(".env.local", "../.env.local"), env_file_encoding="utf-8", extra="ignore")

    @property
    def upload_path(self) -> Path:
        """Resolved absolute path to the upload directory, always under PROJECT_ROOT."""
        path = Path(self.UPLOAD_DIR)
        if path.is_absolute():
            return path.resolve()
        return (PROJECT_ROOT / path).resolve()


# Singleton instance of settings
settings = Settings()
