"""
Copilot grounding when the recruiter is NOT inside a role (the /ask surface).

The bug these lock down: `_resolve_dispatch`'s global branch returned a fixed
string — "(No specific page context … ask the recruiter to open a campaign or
candidate for grounded, data-backed answers.)" — and queried nothing at all,
even though `campaign_repo` was passed in. "The recruiter is not on a role page"
was being reported to the model as "this organization has no roles", so Ask
answered "No campaign or candidate is currently selected" to a workspace holding
four roles and sixteen analysed candidates.

That sentence exists nowhere in the codebase. The model was obeying its prompt,
which is why this is tested at the CONTEXT layer: a prompt-level patch telling
the model to try harder would leave the resolver still fetching nothing.

Runnable without pytest:  python -m tests.test_copilot_workspace_context
(from backend/, with the project venv active)
"""
from __future__ import annotations

import sys
from types import SimpleNamespace

from app.ai.context.copilot_context import build_workspace_context
from app.schemas.copilot import CopilotPageContext
from app.services import copilot_resolver
from app.services.copilot_resolver import _resolve_global

FORBIDDEN = "ask the recruiter to open a campaign"


def _campaign(cid: str, title: str, status: str = "active", role_title: str | None = None):
    return SimpleNamespace(id=cid, title=title, status=status, role_title=role_title)


class FakeCampaignRepo:
    def __init__(self, campaigns, counts=None, raise_on_list=False):
        self._campaigns = campaigns
        self._counts = counts or {}
        self._raise = raise_on_list
        self.get_calls: list[str] = []

    def list(self, status_filter=None):
        if self._raise:
            raise RuntimeError("supabase unavailable")
        return self._campaigns

    def count_candidates(self, cid):
        return self._counts.get(cid, 0)

    def get(self, cid):
        self.get_calls.append(cid)
        match = next((c for c in self._campaigns if c.id == cid), None)
        if match is None:
            raise KeyError(cid)
        return SimpleNamespace(
            model_dump=lambda: {"title": match.title, "status": match.status},
            title=match.title,
        )


class FakeCandidateRepo:
    def __init__(self, rows=None):
        self._rows = rows or []

    def list_for_campaign_with_analysis(self, cid):
        return self._rows


def _resolve(campaign_repo, candidate_repo=None):
    # `resolve_context` prepends org memory via a live client; the dispatch-level
    # function is the unit under test.
    return _resolve_global(
        CopilotPageContext(type="global"), "Which candidates should I shortlist next?",
        campaign_repo, candidate_repo or FakeCandidateRepo(),
    )


def test_multiple_campaigns_are_listed_not_denied():
    repo = FakeCampaignRepo(
        [_campaign("a", "Senior Backend Engineer"), _campaign("b", "Product Designer")],
        counts={"a": 8, "b": 5},
    )
    resolved = _resolve(repo)
    text = resolved.context_text
    assert "Senior Backend Engineer" in text, text
    assert "Product Designer" in text, text
    assert "8 candidate(s)" in text and "5 candidate(s)" in text, text
    assert FORBIDDEN not in text.lower(), "the old ungrounded string is back"
    assert "Workspace" in resolved.available_sources


def test_single_campaign_is_auto_selected():
    """One role means nothing to disambiguate — ground in it and answer."""
    repo = FakeCampaignRepo([_campaign("only", "Senior Backend Engineer")], counts={"only": 8})
    resolved = _resolve(repo)
    assert repo.get_calls == ["only"], "the single role should be fetched in full"
    assert "selected automatically" in resolved.context_text.lower(), resolved.context_text
    assert FORBIDDEN not in resolved.context_text.lower()


def test_empty_workspace_says_so_honestly():
    """Zero roles is the ONE case where 'nothing to analyse' is true."""
    resolved = _resolve(FakeCampaignRepo([]))
    assert "no roles yet" in resolved.context_text.lower(), resolved.context_text


def test_repo_failure_does_not_claim_the_workspace_is_empty():
    """Unknown is not empty — a failed fetch must not be reported as no data."""
    resolved = _resolve(FakeCampaignRepo([], raise_on_list=True))
    text = resolved.context_text.lower()
    assert "could not be loaded" in text, text
    assert "no roles yet" not in text, "a fetch failure was rendered as an empty workspace"


def test_role_list_is_bounded_but_reports_the_true_total():
    """A large workspace must not become 200 queries or a truncated lie."""
    many = [_campaign(str(i), f"Role {i}") for i in range(40)]
    resolved = _resolve(FakeCampaignRepo(many))
    assert "40 role(s)" in resolved.context_text, resolved.context_text
    assert resolved.context_text.count("[role_id:") == copilot_resolver.MAX_WORKSPACE_ROLES


def test_status_is_rendered_as_a_value_not_an_enum_repr():
    """`str(CampaignStatus.draft)` is 'CampaignStatus.draft' — the model echoes it."""
    import enum

    class Status(enum.Enum):
        draft = "draft"

    repo = FakeCampaignRepo([_campaign("a", "Engineering Manager", status=Status.draft)])
    text = _resolve(repo).context_text
    assert "Status.draft" not in text, text
    assert "draft" in text


def test_builder_never_emits_a_denial_when_roles_exist():
    """Belt and braces at the pure-function layer."""
    text = build_workspace_context(
        [{"id": "a", "title": "Senior Backend Engineer", "status": "active", "candidate_count": 8}], 1
    )
    assert "never claim that no role or campaign exists" in text.lower()


TESTS = [v for k, v in sorted(globals().items()) if k.startswith("test_")]

if __name__ == "__main__":
    failures = 0
    for fn in TESTS:
        try:
            fn()
            print(f"  ok   {fn.__name__}")
        except AssertionError as exc:
            failures += 1
            print(f"  FAIL {fn.__name__}: {exc}")
    print(f"\n{len(TESTS) - failures}/{len(TESTS)} passed")
    sys.exit(1 if failures else 0)
