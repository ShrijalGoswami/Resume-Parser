"""
Embedding provider abstraction.

Mirrors the `LLMProvider` design: a common interface so the rest of the app is
provider-agnostic. Retrieval uses embeddings — never the LLM — so this layer is
deliberately separate from `app.ai.providers`.

Add a provider by subclassing `EmbeddingProvider` and registering it in
`app.ai.embeddings.registry`; callers are unchanged.
"""

from __future__ import annotations

from abc import ABC, abstractmethod


class EmbeddingProvider(ABC):
    #: Registry key.
    name: str = "base"
    #: Model identifier (stored with each embedding so staleness is detectable).
    model: str = ""
    #: Output vector dimensionality.
    dimensions: int = 0

    @abstractmethod
    def embed(self, texts: list[str]) -> list[list[float]]:
        """Embed a batch of texts. One attempt; raise on failure."""

    def embed_one(self, text: str) -> list[float]:
        return self.embed([text])[0]
