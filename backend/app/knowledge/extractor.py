"""
Knowledge Extractor.

Turns platform documents/events into STRUCTURED knowledge (facts, preferences,
decisions, outcomes) + graph edges — storing structured knowledge instead of raw
text wherever possible. Each source has its own extraction rule; adding a source =
one function + a dispatcher entry.
"""

from __future__ import annotations

from typing import Any

from app.knowledge.models import KnowledgeEdge, KnowledgeItem, entity


def _skills(items: list[str]) -> list[dict]:
    return [entity("skill", s) for s in items if s]


# ── Per-source extraction rules ─────────────────────────────────────────────
def from_interview_pack(pack: dict, *, campaign_title: str = "", candidate_name: str = "") -> tuple[list[KnowledgeItem], list[KnowledgeEdge]]:
    items: list[KnowledgeItem] = []
    edges: list[KnowledgeEdge] = []
    rec = (pack.get("final_recommendation") or {}).get("recommendation", "")
    ents = [entity("candidate", candidate_name)] if candidate_name else []
    if campaign_title:
        ents.append(entity("campaign", campaign_title))
    if rec:
        items.append(KnowledgeItem(
            kind="decision", source="interview", value_text=f"Interview recommendation for {candidate_name or 'candidate'}: {rec}.",
            subject=candidate_name, predicate="interview_recommendation", object=rec, confidence=70, entities=ents,
        ))
    for sv in (pack.get("skill_verifications") or [])[:8]:
        skill = sv.get("skill")
        if skill:
            items.append(KnowledgeItem(kind="fact", source="interview",
                value_text=f"{skill} was flagged for verification in an interview.",
                subject=skill, predicate="verified_for", object=campaign_title, confidence=55,
                entities=[entity("skill", skill)] + ([entity("campaign", campaign_title)] if campaign_title else [])))
            if campaign_title:
                edges.append(KnowledgeEdge("technology", skill, "assessed_in", "campaign", campaign_title))
    return items, edges


def from_comparison(report: dict) -> tuple[list[KnowledgeItem], list[KnowledgeEdge]]:
    items, edges = [], []
    es = report.get("executive_summary") or {}
    best = es.get("best_candidate_name")
    if best:
        items.append(KnowledgeItem(kind="decision", source="comparison",
            value_text=f"In a comparison, {best} was assessed strongest: {es.get('overall_recommendation','')}.",
            subject=best, predicate="rated_strongest", object=es.get("overall_recommendation", ""),
            confidence=es.get("comparison_confidence", 60) or 60, entities=[entity("candidate", best)]))
    return items, edges


def from_report(report: dict) -> tuple[list[KnowledgeItem], list[KnowledgeEdge]]:
    items, edges = [], []
    ts = report.get("talent_snapshot") or {}
    for t in (ts.get("top_technologies") or [])[:8]:
        skill = t.get("skill")
        if skill:
            items.append(KnowledgeItem(kind="pattern", source="report",
                value_text=f"{skill} is among the most common technologies across candidates ({t.get('count')} mentions).",
                subject=skill, predicate="demand", object=str(t.get("count")), confidence=65,
                entities=[entity("technology", skill)], metadata={"count": t.get("count")}))
    for r in (report.get("hiring_risks") or [])[:5]:
        cat = r.get("category")
        if cat:
            items.append(KnowledgeItem(kind="outcome", source="report",
                value_text=f"Hiring risk observed: {cat} — {r.get('evidence','')}.",
                subject=cat, predicate="risk", object=r.get("impact", ""), confidence=60,
                entities=[entity("risk", cat)]))
    return items, edges


def from_agent_recommendation(rec: dict) -> tuple[list[KnowledgeItem], list[KnowledgeEdge]]:
    items, edges = [], []
    title = rec.get("title", "")
    items.append(KnowledgeItem(kind="decision", source="agent",
        value_text=f"Agent recommendation approved: {title}. {rec.get('recommended_action','')}",
        subject=rec.get("workflow", ""), predicate="approved_action", object=title, confidence=70,
        entities=[e for e in [
            entity("candidate", rec.get("candidate_name")) if rec.get("candidate_name") else None,
            entity("campaign", rec.get("campaign_title")) if rec.get("campaign_title") else None,
        ] if e]))
    if rec.get("candidate_name") and rec.get("campaign_title"):
        edges.append(KnowledgeEdge("candidate", rec["candidate_name"], "in_campaign", "campaign", rec["campaign_title"]))
    return items, edges


def from_note(body: str, *, candidate_name: str = "", campaign_title: str = "") -> tuple[list[KnowledgeItem], list[KnowledgeEdge]]:
    items = [KnowledgeItem(kind="fact", source="note",
        value_text=f"Recruiter note on {candidate_name or 'candidate'}: {body[:280]}",
        subject=candidate_name, predicate="note", object="", confidence=50,
        entities=[entity("candidate", candidate_name)] if candidate_name else [])]
    edges = []
    if candidate_name and campaign_title:
        edges.append(KnowledgeEdge("candidate", candidate_name, "in_campaign", "campaign", campaign_title))
    return items, edges


def from_decision(*, candidate_name: str, decision: str, reason: str = "", campaign_title: str = "") -> tuple[list[KnowledgeItem], list[KnowledgeEdge]]:
    items = [KnowledgeItem(kind="decision", source="decision",
        value_text=f"Hiring decision for {candidate_name}: {decision}. {reason}".strip(),
        subject=candidate_name, predicate="hiring_decision", object=decision, confidence=85,
        entities=[entity("candidate", candidate_name)] + ([entity("campaign", campaign_title)] if campaign_title else []))]
    edges = []
    if campaign_title:
        edges.append(KnowledgeEdge("candidate", candidate_name, "decision_in", "campaign", campaign_title))
    return items, edges


def from_copilot(question: str, answer: str) -> tuple[list[KnowledgeItem], list[KnowledgeEdge]]:
    # Only capture substantive Q&A (short greetings carry no lasting knowledge).
    if len(answer) < 80:
        return [], []
    return [KnowledgeItem(kind="fact", source="copilot",
        value_text=f"Copilot insight: Q '{question[:120]}' → {answer[:280]}",
        subject=question[:80], predicate="copilot_answer", object="", confidence=45)], []


_DISPATCH = {
    "interview": from_interview_pack,
    "comparison": from_comparison,
    "report": from_report,
    "agent": from_agent_recommendation,
    "note": from_note,
    "decision": from_decision,
    "copilot": from_copilot,
}


def extract(source: str, **payload: Any) -> tuple[list[KnowledgeItem], list[KnowledgeEdge]]:
    fn = _DISPATCH.get(source)
    if fn is None:
        return [], []
    try:
        items, edges = fn(**payload)
    except Exception:
        return [], []
    for it in items:
        it.source = it.source or source
    return items, edges
