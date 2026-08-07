"""
Semantic search must be rate limited (final audit).

A5 rate-limited the endpoints that spend at the LLM. `/api/v1/search/*` spends
at the EMBEDDING provider instead — every call embeds the query through NVIDIA
before it can rank anything — so it is a different vendor bill and was missed.
Twelve rapid authenticated calls all returned 200 during the audit.

Being authenticated is not a rate limit: it bounds WHO can spend, not how fast.
"""

from __future__ import annotations

import pytest

from app.core.observability import RateLimitMiddleware


@pytest.fixture
def rule():
    mw = RateLimitMiddleware.__new__(RateLimitMiddleware)
    return mw._rule


@pytest.mark.parametrize("path", ["/api/v1/search/talent", "/api/v1/search/similar"])
def test_search_endpoints_are_limited(rule, path):
    assert rule(path) is not None, f"{path} spends at NVIDIA on every call and must be limited"


def test_search_limit_is_the_expected_budget(rule):
    assert rule("/api/v1/search/talent") == (30, 60)


@pytest.mark.parametrize(
    "path",
    [
        "/api/v1/batch-analysis",
        "/api/v1/ats-analysis",
        "/api/v1/match-analysis",
        "/api/v1/copilot/chat",
        "/api/v1/export-report",
        "/api/v1/agent/scan",
        "/api/v1/campaigns/abc/compare",
        "/api/v1/campaigns/abc/candidates/def/interview",
        "/api/v1/campaigns/abc/embeddings/reindex",
    ],
)
def test_previously_covered_paths_are_still_covered(rule, path):
    """No regression in A5's coverage."""
    assert rule(path) is not None


@pytest.mark.parametrize(
    "path",
    ["/health", "/api/v1/me", "/api/v1/campaigns", "/api/v1/org/context"],
)
def test_cheap_paths_remain_unlimited(rule, path):
    """The limiter must not start throttling ordinary reads."""
    assert rule(path) is None


def test_resume_url_is_not_caught_by_the_resume_suffix(rule):
    """"/resume-url" is a cheap GET and must not inherit the upload limit."""
    assert rule("/api/v1/campaigns/a/candidates/b/resume-url") is None
