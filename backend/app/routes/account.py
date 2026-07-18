"""
Recruiter account routes — profile + global activity feed.
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Query, status
from pydantic import BaseModel

from app.core.auth import CurrentRecruiter
from app.core.deps import ActivityRepoDep, RecruiterDep

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Account"])


class RecruiterProfile(BaseModel):
    id: str
    email: str
    full_name: str | None = None
    company: str | None = None
    job_title: str | None = None
    avatar_url: str | None = None
    onboarded: bool = False


class ProfileUpdate(BaseModel):
    full_name: str | None = None
    company: str | None = None
    job_title: str | None = None
    onboarded: bool | None = None


def _repo(recruiter: CurrentRecruiter):
    from app.db.supabase_client import get_user_client

    return get_user_client(recruiter.access_token).table("recruiters")


@router.get("/me", response_model=RecruiterProfile)
async def get_me(recruiter: RecruiterDep):
    """Return the authenticated recruiter profile, provisioning it if missing."""
    table = _repo(recruiter)
    resp = table.select("*").eq("id", recruiter.id).limit(1).execute()
    rows: list[dict[str, Any]] = getattr(resp, "data", []) or []
    if rows:
        return RecruiterProfile(**{k: rows[0].get(k) for k in RecruiterProfile.model_fields})
    # Self-heal: create the profile if the auth trigger didn't (e.g. local dev).
    table.insert({"id": recruiter.id, "email": recruiter.email}).execute()
    return RecruiterProfile(id=recruiter.id, email=recruiter.email)


@router.patch("/me", response_model=RecruiterProfile)
async def update_me(payload: ProfileUpdate, recruiter: RecruiterDep):
    table = _repo(recruiter)
    patch = payload.model_dump(exclude_unset=True)
    if patch:
        table.update(patch).eq("id", recruiter.id).execute()
    resp = table.select("*").eq("id", recruiter.id).limit(1).execute()
    rows = getattr(resp, "data", []) or []
    row = rows[0] if rows else {"id": recruiter.id, "email": recruiter.email}
    return RecruiterProfile(**{k: row.get(k) for k in RecruiterProfile.model_fields})


@router.get("/activity")
async def global_activity(activity: ActivityRepoDep, limit: int = Query(default=50, le=200)):
    return activity.recent(limit=limit)
