"""
AI Recruiter Copilot routes.

    POST /api/v1/copilot/chat        — grounded, explainable Q&A about a candidate
    GET  /api/v1/copilot/suggestions — configurable quick-action questions

Stateless: the frontend sends the candidate context (already computed by the
batch pipeline — no re-parsing or re-ranking), the job description, and the
recent conversation history on each request.
"""

import logging

from fastapi import APIRouter, HTTPException, status
from fastapi.concurrency import run_in_threadpool

from app.schemas.copilot import (
    CopilotRequest, CopilotResponse, SuggestionsResponse, SuggestionGroup,
)
from app.llm.copilot import answer_question
from app.llm.copilot_prompts import SUGGESTION_GROUPS

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/copilot", tags=["Copilot"])


@router.post("/chat", response_model=CopilotResponse, status_code=status.HTTP_200_OK)
async def copilot_chat(request: CopilotRequest):
    if not request.message or not request.message.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Message cannot be empty.")

    # answer_question never raises (it degrades gracefully); run off the event loop
    # since it performs a synchronous Groq call.
    response = await run_in_threadpool(answer_question, request)
    return response


@router.get("/suggestions", response_model=SuggestionsResponse)
async def copilot_suggestions():
    return SuggestionsResponse(
        groups=[SuggestionGroup(category=g["category"], questions=g["questions"]) for g in SUGGESTION_GROUPS]
    )
