"""
Core AI types: capabilities, chat messages, provider responses, execution
metadata, and the generic AIResult wrapper.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Generic, Optional, TypeVar

T = TypeVar("T")


class Capability(str, Enum):
    """Every distinct AI task in the product. Prompts/schemas are keyed by these."""

    RESUME_ANALYSIS = "resume_analysis"
    JOB_MATCHING = "job_matching"
    BATCH_CANDIDATE = "batch_candidate"
    RECRUITER_COPILOT = "recruiter_copilot"
    CANDIDATE_COMPARISON = "candidate_comparison"
    INTERVIEW_GENERATION = "interview_generation"
    RESUME_SUMMARIZATION = "resume_summarization"
    EXECUTIVE_REPORT = "executive_report"
    AGENT_REASONING = "agent_reasoning"


class Role(str, Enum):
    system = "system"
    user = "user"
    assistant = "assistant"


@dataclass
class ChatMessage:
    """A single message in a (possibly multi-turn) conversation."""

    role: Role
    content: str


@dataclass
class TokenUsage:
    prompt_tokens: Optional[int] = None
    completion_tokens: Optional[int] = None
    total_tokens: Optional[int] = None

    @classmethod
    def from_raw(cls, usage: Any) -> "TokenUsage":
        """Build from a provider usage object/dict, tolerating missing fields."""
        if usage is None:
            return cls()

        def g(key: str) -> Optional[int]:
            if isinstance(usage, dict):
                return usage.get(key)
            return getattr(usage, key, None)

        return cls(
            prompt_tokens=g("prompt_tokens"),
            completion_tokens=g("completion_tokens"),
            total_tokens=g("total_tokens"),
        )


@dataclass
class ProviderResponse:
    """
    The normalized result of a single provider completion — identical shape for
    every provider so downstream code never branches on the vendor.

    `content` is an alias for `text` (both are always populated). `latency_ms`
    and `cost_usd` are attached by the orchestrator when known; providers that
    surface a native finish reason set `finish_reason`.
    """

    text: str
    model: str
    provider: str
    usage: TokenUsage = field(default_factory=TokenUsage)
    finish_reason: Optional[str] = None
    latency_ms: Optional[int] = None
    cost_usd: Optional[float] = None
    raw: Any = None

    @property
    def content(self) -> str:
        return self.text


@dataclass
class AIExecution:
    """Observability metadata captured for every orchestrated AI call."""

    capability: str
    provider: str
    model: str
    success: bool
    latency_ms: int
    network_attempts: int = 0
    json_attempts: int = 0
    schema_attempts: int = 0
    usage: TokenUsage = field(default_factory=TokenUsage)
    degraded: bool = False
    error: Optional[str] = None

    @property
    def retry_count(self) -> int:
        return max(0, self.network_attempts - 1) + max(0, self.json_attempts - 1) + max(0, self.schema_attempts - 1)


@dataclass
class AIResult(Generic[T]):
    """A validated structured result plus its execution metadata."""

    data: T
    execution: AIExecution
