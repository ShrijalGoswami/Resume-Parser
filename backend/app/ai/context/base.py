"""
Context building primitives.

A context builder turns domain objects (resume, campaign, notes, JD) into the
named variables a prompt template renders from. Future AI features compose these
builders instead of manually assembling strings.

The existing copilot grounding sources in `app.services.candidate_context`
(CandidateProfileSource, JobDescriptionSource, …) are the richer, multi-source
variant this layer will converge on when the Copilot is built in a later sprint.
"""

from __future__ import annotations

from typing import Any, Protocol


class ContextBuilder(Protocol):
    """Produces the variable mapping a PromptTemplate.render(**vars) consumes."""

    def __call__(self, *args: Any, **kwargs: Any) -> dict[str, Any]: ...
