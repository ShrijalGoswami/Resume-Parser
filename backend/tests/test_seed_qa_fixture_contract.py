"""
The QA seeder's analysis blob must satisfy the product's own `CandidateResult`.

WHY THIS TEST EXISTS
--------------------
`scripts/seed_qa_org.py` writes `candidate_analyses.result` directly. The
embedding pipeline parses that blob back into a `CandidateResult` before
embedding a candidate, and every seeded row failed that parse — `candidate_id`
and `filename` are required and neither was written.

The failure was invisible from every direction that anyone actually looked:

  * `reindex_campaign` skips an unparseable row and answers
    `{"considered": 0, "indexed": 0, "total": 5}` with HTTP 200. Nothing errors.
  * Talent search then returns nothing, because a candidate with no embedding
    scores 0.0 against every query.
  * The seeder's own docstring blamed this on "nothing writes
    candidate_embeddings", which was true but not the whole cause — running a
    reindex, the documented fix, still produced no embeddings.

So a browser QA pass could "cover" Talent search against a seeded org, see an
empty result list, and record it as an empty state rather than a broken fixture.
That is the specific way this bug wasted a QA cycle, and it will do it again if
a field is added to `CandidateResult` and not to the seeder.

This asserts the contract rather than the field names, so it keeps holding when
the schema changes.
"""

from __future__ import annotations

import ast
from pathlib import Path

import pytest

from app.schemas.batch import CandidateResult

SEEDER = Path(__file__).resolve().parents[1] / "scripts" / "seed_qa_org.py"


def _result_keys_written_by_seeder() -> set[str]:
    """The literal keys of the `result` dict in the seeder, read from its AST.

    Parsed rather than imported: importing the seeder pulls in Supabase
    configuration and would make this test require an environment it has no
    business needing.
    """
    tree = ast.parse(SEEDER.read_text(encoding="utf-8"))
    for node in ast.walk(tree):
        if not isinstance(node, ast.Dict):
            continue
        for key, value in zip(node.keys, node.values):
            if (
                isinstance(key, ast.Constant)
                and key.value == "result"
                and isinstance(value, ast.Dict)
            ):
                return {
                    k.value
                    for k in value.keys
                    if isinstance(k, ast.Constant) and isinstance(k.value, str)
                }
    raise AssertionError("no literal `result` dict found in seed_qa_org.py")


def test_seeded_result_supplies_every_required_candidate_result_field() -> None:
    required = {
        name for name, field in CandidateResult.model_fields.items() if field.is_required()
    }
    written = _result_keys_written_by_seeder()
    missing = required - written
    assert not missing, (
        f"seed_qa_org.py writes an analysis blob missing {sorted(missing)}. "
        "reindex_campaign will skip every seeded candidate silently, and Talent "
        "search will return nothing that looks exactly like an empty state."
    )


def test_a_seeded_shaped_blob_actually_parses() -> None:
    """The keys being present is necessary but not sufficient — parse one."""
    blob = {
        "candidate_id": "0f9c2a1e-7b3d-4c5e-9a8b-1d2e3f4a5b6c",
        "filename": "amara_okafor_resume.pdf",
        "name": "Amara Okafor",
        "email": "amara.okafor@example.com",
        "overall_score": 88,
        "ats_score": 81,
        "years_experience": 7.5,
        "match_category": "Strong match",
        "recommendation": "Strong Hire",
        "recommendation_explanation": "Covers the core requirements.",
        "summary": "A strong match for Senior Backend Engineer.",
        "top_skills": ["Python", "PostgreSQL"],
        "matching_skills": ["Python"],
        "missing_skills": ["Kafka"],
        "strengths": ["Deep hands-on experience with Python"],
        "weaknesses": ["No Kafka exposure"],
        "resume_data": None,
    }
    result = CandidateResult(**blob)
    assert result.candidate_id == blob["candidate_id"]
    assert result.filename == blob["filename"]


@pytest.mark.parametrize("field", ["candidate_id", "filename"])
def test_dropping_either_field_breaks_the_parse(field: str) -> None:
    """Guards the guard: proves these two are the fields that actually bite."""
    blob = {
        "candidate_id": "0f9c2a1e-7b3d-4c5e-9a8b-1d2e3f4a5b6c",
        "filename": "x.pdf",
        "name": "X",
        "overall_score": 50,
    }
    blob.pop(field)
    with pytest.raises(Exception):
        CandidateResult(**blob)
