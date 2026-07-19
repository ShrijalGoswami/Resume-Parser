"""
Google Gemini embedding provider (optional).

Activated with EMBEDDING_PROVIDER=gemini + GEMINI_API_KEY. Lazily imports the
`google-generativeai` SDK. `text-embedding-004` is 768-dim.
"""

from __future__ import annotations

from app.ai.embeddings.base import EmbeddingProvider
from app.ai.utils.errors import AIConfigError, AIProviderError


class GeminiEmbeddingProvider(EmbeddingProvider):
    name = "gemini"

    def __init__(self, api_key: str, model: str = "text-embedding-004", dimensions: int = 768):
        if not api_key:
            raise AIConfigError("GEMINI_API_KEY is required for the Gemini embedding provider.")
        self._api_key = api_key
        self.model = model
        self.dimensions = dimensions

    def embed(self, texts: list[str]) -> list[list[float]]:
        try:
            import google.generativeai as genai  # lazy
        except ImportError as exc:  # pragma: no cover
            raise AIConfigError("The 'google-generativeai' package is not installed.") from exc
        try:
            genai.configure(api_key=self._api_key)
            model_id = self.model if self.model.startswith("models/") else f"models/{self.model}"
            out: list[list[float]] = []
            for t in texts:
                r = genai.embed_content(model=model_id, content=t)
                out.append(r["embedding"] if isinstance(r, dict) else r.embedding)
            return out
        except Exception as exc:  # pragma: no cover
            raise AIProviderError(f"Gemini embedding call failed: {exc}") from exc
