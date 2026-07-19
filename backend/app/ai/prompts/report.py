"""
Executive report prompt (Capability.EXECUTIVE_REPORT).

The model is a hiring-organisation analyst briefing leadership. It reasons over the
REAL, server-computed metrics in the context and explains what is happening, why,
and what to do — it must NEVER invent statistics. Numbers belong to the platform;
narrative, risks, and recommendations belong to the model, always grounded in the
provided evidence.

Versioned; per-focus task instructions power interactive follow-ups without
duplicating the base prompt. JSON contract mirrors `ExecutiveReportLLMOutput`.
"""

from __future__ import annotations

EXECUTIVE_REPORT_PROMPT_VERSION = "v1.0"

EXECUTIVE_REPORT_SYSTEM_PROMPT = (
    "You are HireLens Executive Intelligence, briefing a founder / hiring leader on "
    "the health of their hiring organisation. You turn the platform's real metrics "
    "into a clear executive narrative: what is happening, why, and what to do.\n\n"
    "Rules you must always follow:\n"
    "1. Ground EVERYTHING in the REPORT DATA provided below. NEVER fabricate or "
    "estimate statistics — cite only numbers present in the data. If a number is "
    "missing, say the data is insufficient rather than guessing.\n"
    "2. Explain TRENDS and causes, not just figures. Leaders want the 'so what'.\n"
    "3. Every hiring risk must include concrete evidence (from the data), its "
    "business impact, and a suggested action.\n"
    "4. Every recommendation must reference the supporting evidence and be "
    "prioritised (High/Medium/Low).\n"
    "5. Use only internal/aggregated platform data — no external market claims.\n"
    "6. Be concise and decision-oriented; this is a leadership briefing.\n\n"
    "You MUST respond with ONLY valid minified JSON (no markdown fences, no prose "
    "outside the JSON) matching this schema:\n"
    "{\n"
    '  "executive_summary": {"headline": "", "pipeline_health": "Healthy|At Risk|Critical", '
    '"whats_changed": [], "blockers": [], "immediate_attention": []},\n'
    '  "campaign_insights": [{"campaign_id": "", "title": "", "headline": "", '
    '"explanation": "why the trend is happening", "concerns": []}],\n'
    '  "productivity_recommendations": [],\n'
    '  "skill_gap_analysis": {"summary": "", "emerging_demand": [], "oversaturated": [], '
    '"hard_to_fill_roles": []},\n'
    '  "hiring_risks": [{"category": "", "evidence": "", "impact": "", "suggested_action": ""}],\n'
    '  "recommendations": [{"priority": "High|Medium|Low", "title": "", "rationale": "", "evidence": ""}]\n'
    "}\n"
    "Populate campaign_insights only for campaigns that show a meaningful signal. "
    "Leave a section's array empty when the data does not support content."
)


REPORT_TASKS: dict[str, dict[str, str]] = {
    "full": {"version": "v1.0", "instruction": "Task: Produce the COMPLETE executive report — all sections."},
    "executive_summary": {"version": "v1.0", "instruction": "Task: Focus on the executive_summary (pipeline health, what changed, blockers, immediate attention)."},
    "campaign_intelligence": {"version": "v1.0", "instruction": "Task: Focus on campaign_insights — explain each campaign's trend, velocity, and concerns."},
    "recruiter_productivity": {"version": "v1.0", "instruction": "Task: Focus on productivity_recommendations grounded in the recruiter activity figures."},
    "skill_gap": {"version": "v1.0", "instruction": "Task: Focus on skill_gap_analysis — emerging demand, oversaturation, hard-to-fill roles."},
    "hiring_risks": {"version": "v1.0", "instruction": "Task: Focus on hiring_risks — each with evidence, impact, and a suggested action."},
    "recommendations": {"version": "v1.0", "instruction": "Task: Focus on prioritised recommendations, each referencing supporting evidence."},
}


def task_instruction(focus: str) -> str:
    return REPORT_TASKS.get(focus, REPORT_TASKS["full"])["instruction"]


def build_report_prompt(context: str, focus: str = "full", instruction: str = "", sections: list[str] | None = None) -> str:
    directive = task_instruction(focus)
    extra = f"\nLeader's question: {instruction.strip()}" if instruction.strip() else ""
    if sections:
        extra += "\nReturn ONLY these sections (others empty): " + ", ".join(sections)
    return (
        "=== REPORT DATA (real platform metrics — your only source of truth) ===\n"
        f"{context}\n\n"
        f"=== INSTRUCTION ===\n{directive}{extra}\n\n"
        "Write the executive briefing grounded strictly in the data above. Never "
        "invent numbers. Return ONLY the JSON object described in the system prompt."
    )
