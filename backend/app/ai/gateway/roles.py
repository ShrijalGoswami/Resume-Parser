"""
Logical model roles.

The application references ROLES, never hardcoded model names. The gateway maps a
role → (provider, model) from configuration, so switching vendors/models is a
config change, not a code change.
"""

from __future__ import annotations

from enum import Enum


class ModelRole(str, Enum):
    DEFAULT_REASONING = "default_reasoning"   # the everyday reasoning workhorse
    FAST_REASONING = "fast_reasoning"         # low-latency, smaller model
    CHEAP_REASONING = "cheap_reasoning"       # cost-optimised
    LONG_CONTEXT = "long_context"             # large context window (long docs)
    PREMIUM_REASONING = "premium_reasoning"   # highest quality
    EMBEDDINGS = "embeddings"                 # vectorisation (retrieval)


#: Env setting name that overrides each reasoning role's model.
ROLE_MODEL_SETTING: dict[ModelRole, str] = {
    ModelRole.DEFAULT_REASONING: "DEFAULT_REASONING_MODEL",
    ModelRole.FAST_REASONING: "FAST_REASONING_MODEL",
    ModelRole.CHEAP_REASONING: "CHEAP_REASONING_MODEL",
    ModelRole.LONG_CONTEXT: "LONG_CONTEXT_MODEL",
    ModelRole.PREMIUM_REASONING: "PREMIUM_REASONING_MODEL",
}
