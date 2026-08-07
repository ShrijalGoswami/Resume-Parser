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
    #: Output vector dimensionality. A provider whose model determines its own
    #: width (NVIDIA NIM) leaves this 0 until the first live response sets it.
    dimensions: int = 0
    #: Whether `embed()` accepts an `input_type` keyword. Asymmetric retrieval
    #: models embed a QUERY and a PASSAGE with different projections, and using
    #: the wrong one degrades ranking silently rather than raising. Providers
    #: that do not distinguish the two leave this False and are called
    #: positionally, so their signature is unaffected.
    supports_input_type: bool = False

    @abstractmethod
    def embed(self, texts: list[str]) -> list[list[float]]:
        """Embed a batch of texts. One attempt; raise on failure."""

    def embed_one(self, text: str) -> list[float]:
        return self.embed([text])[0]
