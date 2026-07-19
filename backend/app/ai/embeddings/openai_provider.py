"""
OpenAI embedding provider (optional).

Activated with EMBEDDING_PROVIDER=openai + OPENAI_API_KEY. Lazily imports the
`openai` SDK so the dependency is only required when this provider is used.
`text-embedding-3-small` is 1536-dim by default, matching EMBEDDING_DIMENSIONS.
"""

from __future__ import annotations

from app.ai.embeddings.base import EmbeddingProvider
from app.ai.utils.errors import AIConfigError, AIProviderError


class OpenAIEmbeddingProvider(EmbeddingProvider):
    name = "openai"

    def __init__(self, api_key: str, model: str = "text-embedding-3-small", dimensions: int = 1536):
        if not api_key:
            raise AIConfigError("OPENAI_API_KEY is required for the OpenAI embedding provider.")
        self._api_key = api_key
        self.model = model
        self.dimensions = dimensions

    def embed(self, texts: list[str]) -> list[list[float]]:
        try:
            from openai import OpenAI  # lazy import — only needed for this provider
        except ImportError as exc:  # pragma: no cover
            raise AIConfigError("The 'openai' package is not installed.") from exc
        try:
            client = OpenAI(api_key=self._api_key)
            resp = client.embeddings.create(model=self.model, input=texts, dimensions=self.dimensions)
            return [item.embedding for item in resp.data]
        except Exception as exc:  # pragma: no cover — wrap vendor errors
            raise AIProviderError(f"OpenAI embedding call failed: {exc}") from exc
