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
