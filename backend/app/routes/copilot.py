"""
AI Recruiter Copilot routes.

Stateless (legacy, unauthenticated — used by the batch/results UI):
    POST /api/v1/copilot/chat        — grounded Q&A about a client-supplied candidate
    GET  /api/v1/copilot/suggestions — configurable quick-action questions

Persistent (V5, authenticated — the cross-page Recruiter Copilot):
    POST   /api/v1/copilot/conversations                      — new conversation
    GET    /api/v1/copilot/conversations                      — list conversations
    PATCH  /api/v1/copilot/conversations/{id}                 — rename
    DELETE /api/v1/copilot/conversations/{id}                 — delete
    GET    /api/v1/copilot/conversations/{id}/messages        — full history
    POST   /api/v1/copilot/conversations/{id}/messages        — ask (context-aware)

Every AI answer flows through the AIOrchestrator (Capability.RECRUITER_COPILOT);
context is resolved server-side from the recruiter's own data (RLS-scoped), so
one recruiter can never read another's conversations or candidates.
"""

import logging

from fastapi import APIRouter, HTTPException, status
from fastapi.concurrency import run_in_threadpool

from app.core.deps import (
    ActivityRepoDep,
    AgentRepoDep,
    AnalyticsRepoDep,
    CampaignRepoDep,
    CandidateRepoDep,
    ConversationRepoDep,
    EmbeddingRepoDep,
    NoteRepoDep,
)
from app.enterprise.deps import OrgIdDep
from app.knowledge.service import safe_ingest as knowledge_ingest
from app.ai.services.copilot_service import generate_copilot_answer
from app.llm.copilot import answer_question
from app.llm.copilot_prompts import SUGGESTION_GROUPS
from app.schemas.campaign import CopilotConversation, CopilotMessageRecord
from app.schemas.copilot import (
    ConversationCreateRequest,
    ConversationMessagePublic,
    ConversationRenameRequest,
    CopilotRequest,
    CopilotResponse,
    CopilotStructuredResponse,
    PostMessageRequest,
    PostMessageResponse,
    SuggestionGroup,
    SuggestionsResponse,
)
from app.services.copilot_agent import safe_try_agent
from app.services.copilot_comparison import safe_try_comparison
from app.services.copilot_interview import safe_try_interview
from app.services.copilot_prediction import safe_try_prediction
from app.services.copilot_report import safe_try_report
from app.services.copilot_resolver import deterministic_fallback, resolve_context
from app.services.copilot_search import safe_try_search

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/copilot", tags=["Copilot"])

_MAX_MESSAGE_CHARS = 4000


# ── Stateless (legacy) ──────────────────────────────────────────────────────
@router.post("/chat", response_model=CopilotResponse, status_code=status.HTTP_200_OK)
async def copilot_chat(request: CopilotRequest):
    if not request.message or not request.message.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Message cannot be empty.")
    # answer_question degrades gracefully; run off the event loop (sync LLM call).
    return await run_in_threadpool(answer_question, request)


@router.get("/suggestions", response_model=SuggestionsResponse)
async def copilot_suggestions():
    return SuggestionsResponse(
        groups=[SuggestionGroup(category=g["category"], questions=g["questions"]) for g in SUGGESTION_GROUPS]
    )


# ── Persistent conversations (V5, authenticated) ────────────────────────────
def _to_public(rec: CopilotMessageRecord) -> ConversationMessagePublic:
    structured = None
    if rec.role == "assistant" and rec.metadata:
        try:
            structured = CopilotStructuredResponse(**rec.metadata)
        except Exception:  # pragma: no cover — tolerate older metadata shapes
            structured = None
    return ConversationMessagePublic(
        id=rec.id,
        role=rec.role,
        content=rec.content,
        created_at=rec.created_at.isoformat() if rec.created_at else None,
        structured=structured,
    )


def _auto_title(message: str) -> str:
    words = message.strip().split()
    title = " ".join(words[:8])
    return (title[:80] + "…") if len(title) > 80 else (title or "New conversation")


@router.post("/conversations", response_model=CopilotConversation, status_code=status.HTTP_201_CREATED)
async def create_conversation(payload: ConversationCreateRequest, conv_repo: ConversationRepoDep):
    ctx = payload.context
    return conv_repo.create(
        title=payload.title or "New conversation",
        candidate_id=ctx.candidate_id,
        campaign_id=ctx.campaign_id,
        context_type=ctx.type or "global",
    )


@router.get("/conversations", response_model=list[CopilotConversation])
async def list_conversations(conv_repo: ConversationRepoDep):
    return conv_repo.list_for_recruiter()


@router.patch("/conversations/{conversation_id}", response_model=CopilotConversation)
async def rename_conversation(
    conversation_id: str, payload: ConversationRenameRequest, conv_repo: ConversationRepoDep
):
    conv_repo.get(conversation_id)  # 404 if not owned
    return conv_repo.rename(conversation_id, payload.title)


@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(conversation_id: str, conv_repo: ConversationRepoDep):
    conv_repo.get(conversation_id)  # 404 if not owned
    conv_repo.delete(conversation_id)


@router.get("/conversations/{conversation_id}/messages", response_model=list[ConversationMessagePublic])
async def list_conversation_messages(conversation_id: str, conv_repo: ConversationRepoDep):
    conv_repo.get(conversation_id)  # 404 if not owned
    return [_to_public(m) for m in conv_repo.list_messages(conversation_id)]


@router.post("/conversations/{conversation_id}/messages", response_model=PostMessageResponse)
async def post_conversation_message(
    conversation_id: str,
    payload: PostMessageRequest,
    conv_repo: ConversationRepoDep,
    campaign_repo: CampaignRepoDep,
    candidate_repo: CandidateRepoDep,
    note_repo: NoteRepoDep,
    analytics_repo: AnalyticsRepoDep,
    embedding_repo: EmbeddingRepoDep,
    agent_repo: AgentRepoDep,
    activity: ActivityRepoDep,
    org_id: OrgIdDep,
):
    message = (payload.message or "").strip()[:_MAX_MESSAGE_CHARS]
    if not message:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Message cannot be empty.")

    conv = conv_repo.get(conversation_id)  # 404 if not owned / deleted

    # 6. Conversation history (prior turns only).
    prior = conv_repo.list_messages(conversation_id)
    history = [{"role": m.role, "content": m.content} for m in prior]

    # 1–5. Resolve grounded, priority-ordered platform context (degrades gracefully).
    resolved = resolve_context(
        payload.context,
        message,
        campaign_repo=campaign_repo,
        candidate_repo=candidate_repo,
        note_repo=note_repo,
        analytics_repo=analytics_repo,
    )

    # Persist the recruiter turn.
    user_rec = conv_repo.add_message(
        conversation_id, "user", message, metadata={"context": payload.context.model_dump()}
    )

    # Comparison + semantic-search requests reuse the SHARED engines (no duplicated
    # logic). Comparison is checked first, then semantic retrieval, then the general
    # grounded copilot answer.
    structured = None
    asst_metadata: dict = {}

    comparison_pair = await run_in_threadpool(
        safe_try_comparison, message, payload.context, campaign_repo, candidate_repo, note_repo
    )
    if comparison_pair is not None:
        report, structured = comparison_pair
        asst_metadata = {**structured.model_dump(), "comparison": report.model_dump()}

    if structured is None:
        # Interview requests reuse the SHARED Interview Intelligence engine.
        interview_pair = await run_in_threadpool(
            safe_try_interview, message, payload.context, candidate_repo, campaign_repo, note_repo
        )
        if interview_pair is not None:
            packs, structured = interview_pair
            asst_metadata = {**structured.model_dump(), "interviews": [p.model_dump() for p in packs]}

    if structured is None:
        # Proactive "what needs my attention" questions reuse the SHARED agent engine.
        agent_pair = await run_in_threadpool(
            safe_try_agent, message, payload.context, agent_repo, campaign_repo, candidate_repo,
            note_repo, analytics_repo, activity, embedding_repo,
        )
        if agent_pair is not None:
            agent_result, structured = agent_pair
            asst_metadata = {**structured.model_dump(), "agent": agent_result.model_dump()}

    if structured is None:
        # "What happens if…" / forecasts reuse the SHARED prediction engine (deterministic).
        prediction_pair = await run_in_threadpool(
            safe_try_prediction, message, payload.context, org_id, analytics_repo, campaign_repo, activity
        )
        if prediction_pair is not None:
            pred_result, structured = prediction_pair
            asst_metadata = {**structured.model_dump(), "prediction": pred_result}

    if structured is None:
        # Executive-level questions reuse the SHARED report engine (no candidate scope).
        report_pair = await run_in_threadpool(
            safe_try_report, message, payload.context, analytics_repo, campaign_repo, activity
        )
        if report_pair is not None:
            report, structured = report_pair
            asst_metadata = {**structured.model_dump(), "report": report.model_dump()}

    if structured is None:
        # Semantic retrieval (embeddings, NO LLM) reused from the search engine.
        search_pair = await run_in_threadpool(
            safe_try_search, message, payload.context, candidate_repo, embedding_repo
        )
        if search_pair is not None:
            search_resp, structured = search_pair
            asst_metadata = {**structured.model_dump(), "search": search_resp.model_dump()}

    if structured is None:
        # Orchestrated grounded answer (off the event loop — synchronous provider call).
        structured = await run_in_threadpool(
            generate_copilot_answer,
            question=message,
            context_text=resolved.context_text,
            available_sources=resolved.available_sources,
            sources=resolved.sources,
            history_messages=history,
            intent=resolved.intent,
            fallback=deterministic_fallback(resolved),
        )
        asst_metadata = structured.model_dump()

    # Persist the assistant turn (full structured payload for lossless reload).
    asst_rec = conv_repo.add_message(
        conversation_id, "assistant", structured.answer, metadata=asst_metadata
    )
    conv_repo.touch(conversation_id)

    # Accumulate organizational memory from this exchange (incremental, best-effort).
    knowledge_ingest(org_id, "copilot", source_id=conversation_id, question=message, answer=structured.answer)

    # Auto-name a fresh conversation from the first question.
    if (conv.title or "").strip() in ("", "New conversation") and not prior:
        try:
            conv_repo.rename(conversation_id, _auto_title(message))
        except Exception:  # pragma: no cover — non-critical
            pass

    activity.record(
        "copilot_message",
        summary=message[:120],
        campaign_id=payload.context.campaign_id,
        candidate_id=payload.context.candidate_id,
    )

    return PostMessageResponse(
        conversation_id=conversation_id,
        user_message=_to_public(user_rec),
        assistant_message=_to_public(asst_rec),
        response=structured,
    )
