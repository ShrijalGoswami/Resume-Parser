"""
Deterministic, dependency-free embedding provider (the default).

Uses a signed feature-hashing bag-of-words (unigrams + bigrams) into a fixed-size
vector, L2-normalised. It is NOT a neural embedding, but it produces a real vector
space where profiles/queries sharing vocabulary have higher cosine similarity — so
semantic-ish talent search works out of the box with no external API key, and the
whole retrieval pipeline is testable offline.

Swap `EMBEDDING_PROVIDER=openai` (or any future provider) for true neural
embeddings; nothing else in the app changes.
"""

from __future__ import annotations

import hashlib
import math
import re

from app.ai.embeddings.base import EmbeddingProvider

_TOKEN_RE = re.compile(r"[a-z0-9][a-z0-9+#.\-]*")
# Very common words carry little retrieval signal.
_STOP = frozenset(
    "the a an and or of to in on for with at by from as is are was were be been "
    "this that these those it its their his her our your my we you they he she "
    "have has had do does did will would can could should".split()
)


class HashingEmbeddingProvider(EmbeddingProvider):
    name = "hashing"

    def __init__(self, dimensions: int = 1536, model: str = "hashing-v1"):
        self.dimensions = dimensions
        self.model = model

    def _tokens(self, text: str) -> list[str]:
        toks = [t for t in _TOKEN_RE.findall((text or "").lower()) if t not in _STOP and len(t) > 1]
        bigrams = [f"{a}_{b}" for a, b in zip(toks, toks[1:])]
        return toks + bigrams

    def _vector(self, text: str) -> list[float]:
        vec = [0.0] * self.dimensions
        for tok in self._tokens(text):
            h = int(hashlib.md5(tok.encode("utf-8")).hexdigest(), 16)
            idx = h % self.dimensions
            sign = 1.0 if (h >> 17) & 1 else -1.0
            vec[idx] += sign
        norm = math.sqrt(sum(x * x for x in vec)) or 1.0
        return [x / norm for x in vec]

    def embed(self, texts: list[str]) -> list[list[float]]:
        return [self._vector(t) for t in texts]
