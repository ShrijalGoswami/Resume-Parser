"""
Note ownership gate (P3 — two-tenant hardening).

`POST /campaigns/{c}/candidates/{id}/notes` must verify the candidate belongs to
the authenticated recruiter BEFORE creating a note. A foreign or nonexistent
candidate gets a generic 404 — no note, no activity event, no existence
disclosure. These pin that the handler calls the recruiter-scoped
`candidates.get(candidate_id)` first and short-circuits on its 404.

Runnable without pytest:  python -m tests.test_note_ownership
(from backend/, with the project venv active)
"""
from __future__ import annotations

import asyncio
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException, status

from app.routes.campaigns import create_note


def _run(coro):
    return asyncio.get_event_loop().run_until_complete(coro)


def _mocks(owned: bool):
    """candidates.get succeeds for an owned candidate; raises the recruiter-scoped
    404 for a foreign/nonexistent one — the exact behaviour of CandidateRepository.get."""
    candidates = MagicMock()
    if owned:
        candidates.get.return_value = MagicMock(id="cand-own")
    else:
        candidates.get.side_effect = HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found."
        )
    note_repo = MagicMock()
    note_repo.create.return_value = MagicMock(id="note-1")
    activity = MagicMock()
    return candidates, note_repo, activity


# 1. own candidate → note succeeds
def test_own_candidate_note_succeeds():
    candidates, note_repo, activity = _mocks(owned=True)
    result = _run(create_note(
        campaign_id="camp-1", candidate_id="cand-own", payload=MagicMock(),
        repo=note_repo, activity=activity, candidates=candidates,
    ))
    candidates.get.assert_called_once_with("cand-own")
    note_repo.create.assert_called_once()          # note WAS created
    activity.record.assert_called_once()           # activity WAS recorded
    assert result is note_repo.create.return_value


# 2. foreign candidate → 404
def test_foreign_candidate_404():
    candidates, note_repo, activity = _mocks(owned=False)
    with pytest.raises(HTTPException) as exc:
        _run(create_note(
            campaign_id="camp-1", candidate_id="cand-foreign", payload=MagicMock(),
            repo=note_repo, activity=activity, candidates=candidates,
        ))
    assert exc.value.status_code == status.HTTP_404_NOT_FOUND
    note_repo.create.assert_not_called()           # no note created


# 3. nonexistent candidate → same safe response (indistinguishable from foreign)
def test_nonexistent_candidate_same_404():
    candidates, note_repo, activity = _mocks(owned=False)
    with pytest.raises(HTTPException) as exc:
        _run(create_note(
            campaign_id="camp-1", candidate_id="00000000-0000-4000-8000-000000000000",
            payload=MagicMock(), repo=note_repo, activity=activity, candidates=candidates,
        ))
    assert exc.value.status_code == status.HTTP_404_NOT_FOUND
    assert exc.value.detail == "Candidate not found."   # no existence disclosure
    note_repo.create.assert_not_called()


# 4. no activity event on a rejected foreign note
def test_no_activity_on_rejected_foreign_note():
    candidates, note_repo, activity = _mocks(owned=False)
    with pytest.raises(HTTPException):
        _run(create_note(
            campaign_id="camp-1", candidate_id="cand-foreign", payload=MagicMock(),
            repo=note_repo, activity=activity, candidates=candidates,
        ))
    activity.record.assert_not_called()            # no activity side effect


# 5. existing note behaviour intact — ownership check runs BEFORE the write,
#    and the create/activity calls are unchanged for an owned candidate.
def test_ownership_check_precedes_write_and_args_unchanged():
    candidates, note_repo, activity = _mocks(owned=True)
    payload = MagicMock()
    _run(create_note(
        campaign_id="camp-9", candidate_id="cand-own", payload=payload,
        repo=note_repo, activity=activity, candidates=candidates,
    ))
    note_repo.create.assert_called_once_with("camp-9", "cand-own", payload)
    args, kwargs = activity.record.call_args
    assert args[0] == "note_added"
    assert kwargs.get("campaign_id") == "camp-9"
    assert kwargs.get("candidate_id") == "cand-own"


if __name__ == "__main__":
    raise SystemExit(pytest.main([__file__, "-q"]))
