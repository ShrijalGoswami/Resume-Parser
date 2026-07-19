"""
PromptTemplate — a versioned, variable-driven prompt for one capability.

A template owns its `system` prompt and a `render(**variables)` function that
builds the user prompt. Rendering logic can reuse existing prompt builders, so
prompts stay in one place (never embedded in route handlers) and gain explicit
versioning without duplicating the historical prompt text.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable


@dataclass(frozen=True)
class PromptTemplate:
    id: str
    version: str
    system: str
    #: Builds the user prompt from named variables.
    render: Callable[..., str]
    description: str = ""

    def build_user(self, **variables: Any) -> str:
        return self.render(**variables)
