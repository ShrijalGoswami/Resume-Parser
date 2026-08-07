"""
PromptTemplate — a versioned, variable-driven prompt for one capability.

A template owns its `system` prompt and a `render(**variables)` function that
builds the user prompt. Rendering logic can reuse existing prompt builders, so
prompts stay in one place (never embedded in route handlers) and gain explicit
versioning without duplicating the historical prompt text.

THIS CLASS IS THE MANDATORY PATH FOR UNTRUSTED INPUT (S-1)
-----------------------------------------------------------
Every capability declares which of its variables carry attacker-controlled text.
`build_user()` fences those variables before the render function ever sees them,
and the untrusted-input guardrail is appended to `system` automatically. **A
prompt builder therefore never handles untrusted text itself, and cannot.**

The security audit found `fence()` used by exactly ONE of eight capabilities.
The other seven interpolated candidate-authored text behind plain
`=== MARKER ===` separators — which `app/ai/utils/untrusted.py` names as the
thing that is not a boundary, since the marker is text the document can also
contain. That is not seven bugs; it is one architectural gap that produced
seven instances, and the fix has to be shaped so the eighth cannot happen.

**`untrusted` has no default, on purpose.** Adding a capability without deciding
what is attacker-controlled is a `TypeError` at import time, not a code review
someone might pass. A capability with genuinely no untrusted input declares
`untrusted=frozenset()` — an explicit statement on the record, not a silence.

That is the whole design: the protection is not something a builder remembers to
call, it is something the type will not let it skip.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable

from app.ai.utils.errors import AIConfigError
from app.ai.utils.limits import clamp_prompt_variable
from app.ai.utils.untrusted import (
    CANDIDATE_DOCUMENT,
    UNTRUSTED_INPUT_GUARDRAIL,
    UntrustedSource,
    fence,
)


@dataclass(frozen=True)
class PromptTemplate:
    id: str
    version: str
    system: str
    #: Builds the user prompt from named variables — which are ALREADY fenced by
    #: `build_user` when declared untrusted. A render function must never call
    #: `fence()`, `scrub()` or any other security helper itself: duplicated
    #: security logic is what let seven capabilities drift out of protection.
    render: Callable[..., str]
    #: Names of the variables carrying attacker-controlled text. REQUIRED — see
    #: the module docstring. `frozenset()` is a valid, deliberate answer.
    untrusted: frozenset[str]
    #: Optional per-variable description of WHAT KIND of untrusted text this
    #: is. Defaults to a candidate document, which is the strict reading —
    #: forgetting it yields protection with a slightly-off description, never
    #: no protection. Only the wording varies; the boundary is identical.
    untrusted_sources: dict[str, UntrustedSource] = field(default_factory=dict)
    description: str = ""

    def __post_init__(self) -> None:
        if not isinstance(self.untrusted, (frozenset, set)):
            raise AIConfigError(
                f"Prompt '{self.id}': `untrusted` must be a set of variable names "
                f"(got {type(self.untrusted).__name__}). Use frozenset() to declare "
                f"that this capability takes no untrusted input."
            )
        object.__setattr__(self, "untrusted", frozenset(self.untrusted))
        # The guardrail belongs to the mechanism, not to eight hand-maintained
        # system prompts. Appended only when there IS untrusted input, and only
        # when a prompt has not already stated it — `batch_candidate` carried it
        # by hand before this class existed.
        if self.untrusted and UNTRUSTED_INPUT_GUARDRAIL not in self.system:
            object.__setattr__(
                self, "system", f"{self.system}\n\n{UNTRUSTED_INPUT_GUARDRAIL}"
            )

    def build_user(self, **variables: Any) -> str:
        """Render the user prompt, fencing every declared untrusted variable first.

        Fencing here rather than inside each builder is the point: the builders
        are unchanged and unaware, so there is one implementation of the boundary
        and one place to review it.
        """
        prepared = dict(variables)
        for name in self.untrusted:
            if name not in prepared:
                # A declared untrusted variable that the caller did not supply is
                # a wiring mistake, and the safe reading is that the protection
                # silently did nothing. Fail loudly (§9A rule 9).
                raise AIConfigError(
                    f"Prompt '{self.id}' declares '{name}' as untrusted but it was "
                    f"not supplied. Either pass it or stop declaring it."
                )
            value = prepared[name]
            if value is None or value == "":
                continue  # nothing to fence; an empty block would only add noise
            if not isinstance(value, str):
                raise AIConfigError(
                    f"Prompt '{self.id}': untrusted variable '{name}' must be a "
                    f"string, got {type(value).__name__}. Serialise it before "
                    f"passing it in — fencing a structure would hide its contents "
                    f"from the boundary."
                )
            # Clamp BEFORE fencing (S-4), so the delimiter can never be the
            # thing that gets cut. Truncation carries a notice into the block:
            # a fragment must never read as a whole document.
            prepared[name] = fence(
                clamp_prompt_variable(value, name=f"{self.id}.{name}"),
                source=self.untrusted_sources.get(name, CANDIDATE_DOCUMENT),
            )
        return self.render(**prepared)
