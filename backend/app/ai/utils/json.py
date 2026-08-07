"""Structured-output parsing helpers (shared by the orchestrator)."""

from __future__ import annotations

import json
import re
from typing import Any

_FENCE_OPEN = re.compile(r"^```(?:json)?\s*\n?")
_FENCE_CLOSE = re.compile(r"\n?```\s*$")


def strip_fences(raw: str) -> str:
    """Remove markdown code fences LLMs sometimes emit despite instructions."""
    cleaned = raw.strip()
    cleaned = _FENCE_OPEN.sub("", cleaned)
    cleaned = _FENCE_CLOSE.sub("", cleaned)
    return cleaned.strip()


def parse_json_object(raw: str) -> dict[str, Any]:
    """Strip fences and parse a JSON object. Raises json.JSONDecodeError on failure."""
    return json.loads(strip_fences(raw))


#: Appended to the USER prompt on a JSON re-attempt — never on the first one (C6).
#:
#: Before this, a parse failure was retried with a byte-identical prompt, up to
#: six times: the model was asked the same question the same way and expected to
#: answer differently. That is not a retry, it is a coin flip paid for in tokens.
#:
#: It is deliberately short, names only the failure, and adds no schema detail.
#: A longer instruction would be a prompt change in all but name, and prompt text
#: is behaviour (§9A rule 6). Because it is appended only from the second attempt,
#: the first request is byte-identical to what it was before C6 — which is what
#: keeps deterministic evaluation and the fake's prompt fingerprint intact.
JSON_REPAIR_INSTRUCTION = (
    "\n\nYour previous response could not be parsed as JSON. "
    "Respond with a single valid JSON object and nothing else — "
    "no explanation, no markdown code fences."
)


def with_repair_instruction(user: str, attempt: int) -> str:
    """The user prompt for JSON attempt `attempt` (0-based).

    Attempt 0 returns the prompt unchanged. That is the load-bearing half.
    """
    return user if attempt == 0 else f"{user}{JSON_REPAIR_INSTRUCTION}"
