"""
Copilot intent-routing gates.

The chat route tries the specialized engines in a fixed ladder (comparison →
interview → agent → prediction → report → search) before the normal grounded
copilot. Three of those engines are 4096-token LLM calls, so the gates decide
real money: a false positive turns a conversational question into the most
expensive path the copilot has. These tests pin the gates — especially the
report gate, which was tightened after ordinary questions ("any recommendations
on her notice period?") were observed escalating into the report engine.
"""

from __future__ import annotations

from app.schemas.copilot import CopilotPageContext
from app.services.copilot_comparison import _is_comparison
from app.services.copilot_interview import _is_interview
from app.services.copilot_report import _is_report, try_report
from app.services.copilot_search import _is_search


class TestSearchStaysDeterministic:
    def test_find_candidates_with_skill_is_search(self):
        assert _is_search("find candidates with NLP")

    def test_search_query_is_not_a_report(self):
        assert not _is_report("find candidates with NLP")

    def test_search_query_is_not_interview_or_comparison(self):
        assert not _is_interview("find candidates with NLP")
        assert not _is_comparison("find candidates with NLP")


class TestNormalQuestionsStayInNormalCopilot:
    """Conversational questions must not enter any 4096-token engine."""

    CONVERSATIONAL = (
        "why is Priya ranked above Rahul?",
        "what does the ATS score mean?",
        "summarise this candidate's experience",
        # Incidental "recommendation" — the word alone is not a report request.
        "do you have any recommendations about her notice period?",
        "why did you make that recommendation?",
        # Word-boundary: "reported"/"reporting" are not "report".
        "she reported to the CTO in her last role",
        "who is she reporting to?",
        # Incidental campaign/risk phrasing.
        "which campaign is Priya in?",
        "what's the biggest risk with hiring Jane?",
        "is there a skill gap between the JD and her resume?",
    )

    def test_conversational_questions_are_not_reports(self):
        for q in self.CONVERSATIONAL:
            assert not _is_report(q), f"escalated to report engine: {q!r}"

    def test_try_report_returns_none_for_conversational_question(self):
        page = CopilotPageContext()
        result = try_report(
            "do you have any recommendations about her notice period?",
            page,
            analytics_repo=None, campaign_repo=None, activity_repo=None,
        )
        assert result is None


class TestExplicitReportRequestsStillRoute:
    EXPLICIT = (
        "generate an executive report",
        "give me the executive summary",
        "create a hiring report for this quarter",
        "how healthy is our pipeline?",
        "pipeline health?",
        "show me recruiter productivity",
        "generate a skill gap report",
        "give me your recommendations across all campaigns",
        "what are the biggest hiring risks?",
        # Canonical docstring example: executive by construction, no verb needed.
        "which campaign is underperforming?",
    )

    def test_explicit_report_requests_route_to_report_engine(self):
        for q in self.EXPLICIT:
            assert _is_report(q), f"no longer reaches report engine: {q!r}"

    def test_candidate_scope_never_reports(self):
        # A selected candidate belongs to the normal copilot even on an
        # explicit report ask — pre-existing rule, must survive the tightening.
        page = CopilotPageContext(candidate_id="cand-1")
        result = try_report(
            "generate an executive report",
            page,
            analytics_repo=None, campaign_repo=None, activity_repo=None,
        )
        assert result is None


class TestSiblingGatesUnchanged:
    """Interview and comparison gates were deliberately NOT modified —
    lock in their current behavior so the report tightening stays isolated."""

    def test_explicit_interview_request_routes(self):
        assert _is_interview("generate interview questions for Priya")
        assert _is_interview("what should I ask this candidate?")

    def test_explicit_comparison_request_routes(self):
        assert _is_comparison("compare Priya vs Rahul")
        assert _is_comparison("who is better, Priya or Rahul?")

    def test_plain_questions_do_not_compare(self):
        assert not _is_comparison("summarise Priya's experience")
