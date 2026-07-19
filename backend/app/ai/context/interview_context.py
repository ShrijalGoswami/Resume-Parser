"""
Interview context composition.

Pure helpers that assemble the labelled context block the interview prompt
consumes. The product service materialises the rich candidate block (reusing the
existing multi-source `build_candidate_context`, which already composes resume,
analysis, ATS, ranking, JD, and recruiter notes) and passes it here together with
optional comparison findings, semantic-peer findings, and campaign requirements.

Composition lives here (not in routes), so the interview prompt never sees hand-
concatenated strings.
"""

from __future__ import annotations

from typing import Any, Optional


def campaign_requirements_block(campaign: dict[str, Any]) -> str:
    lines = [f"Title: {campaign.get('title') or 'Untitled campaign'}"]
    for key, label in (
        ("role_title", "Role"),
        ("department", "Department"),
        ("location", "Location"),
        ("employment_type", "Employment type"),
    ):
        if campaign.get(key):
            lines.append(f"{label}: {campaign[key]}")
    return "### Campaign Requirements\n" + "\n".join(lines)


def candidate_line(name: str, candidate_id: str) -> str:
    return f"{name or 'Unnamed candidate'} (id: {candidate_id})"


def compose_interview_context(
    *,
    candidate_block: str,
    campaign: Optional[dict[str, Any]] = None,
    comparison_text: Optional[str] = None,
    semantic_text: Optional[str] = None,
) -> str:
    """Compose the final interview context from its labelled parts."""
    parts: list[str] = []
    if campaign:
        parts.append(campaign_requirements_block(campaign))
    if candidate_block:
        parts.append(candidate_block)
    if comparison_text and comparison_text.strip():
        parts.append("### Candidate Comparison Findings\n" + comparison_text.strip())
    if semantic_text and semantic_text.strip():
        parts.append("### Semantic Peer Findings\n" + semantic_text.strip())
    return "\n\n".join(parts)
