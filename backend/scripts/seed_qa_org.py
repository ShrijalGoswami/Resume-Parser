"""
Provision a browser-QA organization: a confirmed account plus realistic data.

Why this exists
---------------
`docs/BROWSER_QA_CHECKLIST.md` sat BLOCKED because a browser QA pass needs two
things nobody had: a throwaway account on the `v1` ruleset (all 68 real orgs are
`founding`, so they show no locks and no meters — testing against one proves
nothing), and enough campaigns/candidates that screens render populated rather
than empty. Both were manual, so neither happened, and every monetization and
redesign surface shipped verified only by unit tests and source reading.

This makes both reproducible. Run it, sign in, and every screen has content.

Usage
-----
    python -m scripts.seed_qa_org                 # create + seed (idempotent)
    python -m scripts.seed_qa_org --reset         # delete seeded rows, re-seed
    python -m scripts.seed_qa_org --show          # print the account + ids

The account is `qa.browser@hirelens.test`. That domain is reserved by RFC 6761
and cannot receive mail, which is deliberate: this account must never be
confusable with a customer, and no invite or reset can escape to a real inbox.
It is created with `email_confirm: true` because the signup confirmation mail
would otherwise be undeliverable.

Everything written here carries `metadata.seeded = true` so `--reset` can find
its own rows and nothing else. It refuses to run against an organization that
holds rows it did not create.

NOT FOR PRODUCTION. It needs the service role key, and it writes directly to
`candidates`/`candidate_analyses`, bypassing the usage counters the résumé wall
reads — seeded résumés deliberately do not consume quota, so plan limits stay
testable on a populated org. Flip the plan with `scripts.set_org_plan`.

KNOWN GAP — Talent Search returns nothing on this data
-----------------------------------------------------
Nothing here writes `candidate_embeddings`, and semantic search matches on
embeddings. Every Talent query therefore returns zero results, however healthy
the other screens look. That blocks QA of everything behind a non-empty result
list: the result row's keyboard path, the drawer it opens, and focus
restoration. Real embeddings mean real Groq spend against a 100k/day free tier,
which is why this does not generate them.

If you need that path covered, add a deterministic fixture: one unit vector per
candidate derived from a hash of `candidate_id`, so the same id yields the same
vector on every run with no model call. It makes results render, which is enough
to exercise the interface. It is NOT semantically meaningful — ranking and
relevance will be nonsense, so never read a screenshot taken against it as
evidence that search works well. See docs/BROWSER_QA_CHECKLIST.md §0b.
"""
from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.request
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

QA_EMAIL = "qa.browser@hirelens.test"
QA_PASSWORD = "HireLensQA!2026"
QA_NAME = "Quinn Avery"
QA_COMPANY = "Northwind Talent"

ENV_CANDIDATES = [
    Path(__file__).resolve().parents[1] / ".env.local",
    Path(__file__).resolve().parents[2] / "resume-hero-section" / ".env.local",
]


def load_env() -> dict[str, str]:
    """Read the first .env.local that carries a service role key."""
    for path in ENV_CANDIDATES:
        if not path.exists():
            continue
        env: dict[str, str] = {}
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            env[key.strip()] = value.strip().strip('"').strip("'")
        if env.get("SUPABASE_SERVICE_ROLE_KEY") or env.get("SUPABASE_SECRET_KEY"):
            return env
    sys.exit(
        "No .env.local with a service role key found. Looked in:\n  "
        + "\n  ".join(str(p) for p in ENV_CANDIDATES)
    )


ENV = load_env()
BASE = (ENV.get("SUPABASE_URL") or ENV["NEXT_PUBLIC_SUPABASE_URL"]).rstrip("/")
KEY = ENV.get("SUPABASE_SERVICE_ROLE_KEY") or ENV["SUPABASE_SECRET_KEY"]

NOW = datetime.now(timezone.utc).replace(microsecond=0)


def iso(days: float = 0, hours: float = 0) -> str:
    return (NOW - timedelta(days=days, hours=hours)).isoformat()


def api(path: str, method: str = "GET", body=None, headers: dict | None = None):
    request = urllib.request.Request(
        f"{BASE}{path}",
        data=json.dumps(body).encode() if body is not None else None,
        headers={
            "apikey": KEY,
            "Authorization": f"Bearer {KEY}",
            "Content-Type": "application/json",
            **(headers or {}),
        },
        method=method,
    )
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            text = response.read().decode()
            return response.status, (json.loads(text) if text else None)
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read().decode()


def must(status: int, payload, what: str):
    if status not in (200, 201, 204):
        sys.exit(f"{what} failed ({status}): {str(payload)[:500]}")
    return payload


# ── the seed itself ─────────────────────────────────────────────────────────
# Four roles spanning every campaign_status, and candidates spread across every
# pipeline_stage with scores spanning the full match-category range — a screen
# that only ever sees "Excellent match" proves nothing about the other four.
CAMPAIGNS = [
    {
        "title": "Senior Backend Engineer",
        "role_title": "Senior Backend Engineer",
        "department": "Engineering",
        "location": "Berlin, Germany · Hybrid",
        "employment_type": "Full-time",
        "status": "active",
        "age_days": 12,
        "skills": (["Python", "Go", "PostgreSQL", "Kubernetes", "gRPC", "Kafka"], ["Terraform", "Rust"]),
        "job_description": (
            "We are hiring a Senior Backend Engineer to own our payments and billing "
            "services. You will design idempotent, auditable transaction flows, run "
            "them on Postgres at meaningful scale, and set the standard for how we "
            "test money-moving code. Five or more years of backend experience."
        ),
        "people": [
            ("Amara Okafor", "interview", 94, 91, 8.5, "Excellent match", "Strongly recommended for interview", True),
            ("Marta Kowalczyk", "offer", 91, 88, 9.0, "Excellent match", "Strongly recommended for interview", True),
            ("Rohan Mehta", "shortlisted", 88, 84, 7.0, "Strong match", "Recommended for interview", False),
            ("Elena Vasquez", "shortlisted", 82, 79, 6.0, "Strong match", "Recommended for interview", True),
            ("Tobias Lindqvist", "screening", 71, 74, 4.5, "Moderate match", "Consider for further review", False),
            ("Priya Raghunathan", "screening", 68, 70, 5.0, "Moderate match", "Consider for further review", False),
            ("Daniel Boateng", "sourced", 55, 61, 3.0, "Weak match", "Not recommended at this time", False),
            ("Yusuf Demir", "rejected", 41, 48, 2.0, "Weak match", "Not recommended at this time", False),
        ],
    },
    {
        "title": "Product Designer",
        "role_title": "Product Designer (Design Systems)",
        "department": "Design",
        "location": "Remote · EU timezones",
        "employment_type": "Full-time",
        "status": "active",
        "age_days": 6,
        "skills": (["Figma", "Design tokens", "Accessibility", "Prototyping", "Storybook"], ["Motion design"]),
        "job_description": (
            "Own the HireLens design system end to end: tokens, component library, "
            "documentation and adoption. You will partner with engineering to keep "
            "the system honest across light and dark themes."
        ),
        "people": [
            ("Hana Suzuki", "hired", 93, 90, 8.0, "Excellent match", "Strongly recommended for interview", True),
            ("Sofia Ferreira", "interview", 90, 86, 7.5, "Excellent match", "Strongly recommended for interview", True),
            ("Noah Bergström", "shortlisted", 79, 81, 5.5, "Strong match", "Recommended for interview", False),
            ("Ines Duarte", "screening", 66, 69, 4.0, "Moderate match", "Consider for further review", False),
            ("Kwame Asante", "sourced", 58, 63, 3.5, "Weak match", "Consider for further review", False),
        ],
    },
    {
        "title": "Data Analyst",
        "role_title": "Data Analyst, Talent Intelligence",
        "department": "Analytics",
        "location": "London, UK · Onsite",
        "employment_type": "Full-time",
        "status": "paused",
        "age_days": 21,
        "skills": (["SQL", "dbt", "Looker", "Python", "Statistics"], ["Airflow", "Snowflake"]),
        "job_description": (
            "Turn hiring funnel data into decisions leaders trust. SQL fluency, "
            "comfort with warehouse modelling, and the judgement to know which "
            "metric actually answers the question being asked."
        ),
        "people": [
            ("Aisha Rahman", "shortlisted", 85, 82, 6.5, "Strong match", "Recommended for interview", False),
            ("Lucas Moreau", "screening", 74, 77, 4.0, "Moderate match", "Consider for further review", False),
            ("Viktor Petrov", "sourced", 49, 55, 2.5, "Weak match", "Not recommended at this time", False),
        ],
    },
    {
        # No candidates on purpose: the empty pipeline is a state too, and it is
        # the one most likely to be shipped unseen.
        "title": "Engineering Manager",
        "role_title": "Engineering Manager, Platform",
        "department": "Engineering",
        "location": "Berlin, Germany · Hybrid",
        "employment_type": "Full-time",
        "status": "draft",
        "age_days": 2,
        "skills": ([], []),
        "job_description": (
            "Lead the platform team: infrastructure, developer experience and the "
            "reliability of everything the product teams build on. Draft posting."
        ),
        "people": [],
    },
]


def find_user() -> dict | None:
    status, payload = api(f"/auth/v1/admin/users?filter={QA_EMAIL}")
    if status != 200:
        return None
    users = payload.get("users", payload) if isinstance(payload, dict) else payload
    return next((u for u in users or [] if u.get("email") == QA_EMAIL), None)


def ensure_account() -> tuple[str, str]:
    """Return (recruiter_id, organization_id), creating the account if needed."""
    user = find_user()
    if user:
        uid = user["id"]
    else:
        payload = must(
            *api(
                "/auth/v1/admin/users",
                "POST",
                {
                    "email": QA_EMAIL,
                    "password": QA_PASSWORD,
                    "email_confirm": True,
                    "user_metadata": {"full_name": QA_NAME, "company": QA_COMPANY},
                },
            ),
            "create user",
        )
        uid = payload["id"]
        print(f"created account {QA_EMAIL}")

    # The recruiter row and its default org come from DB triggers on the auth
    # insert (migration 0012), so they exist by the time this returns.
    rows = must(
        *api(f"/rest/v1/recruiters?id=eq.{uid}&select=id,organization_id"), "read recruiter"
    )
    if not rows:
        sys.exit(
            f"auth user {uid} exists but has no recruiters row — the provisioning "
            "trigger did not fire; check migration 0012."
        )
    return uid, rows[0]["organization_id"]


def reset(recruiter_id: str) -> None:
    """Delete only rows this script wrote."""
    for table in ("candidate_analyses", "candidates", "campaigns"):
        # candidate_analyses has no metadata column, so it is scoped by recruiter
        # and cascaded by the candidate delete; deleting it first keeps FK order.
        filt = f"recruiter_id=eq.{recruiter_id}"
        if table != "candidate_analyses":
            filt += "&metadata->>seeded=eq.true"
        status, payload = api(f"/rest/v1/{table}?{filt}", "DELETE")
        must(status, payload, f"reset {table}")
    print("reset: seeded rows removed")


def seed(recruiter_id: str, organization_id: str) -> list[str]:
    campaign_ids: list[str] = []
    candidates = 0

    for spec in CAMPAIGNS:
        campaign_id = str(uuid.uuid4())
        campaign_ids.append(campaign_id)
        top, missing = spec["skills"]
        must(
            *api(
                "/rest/v1/campaigns",
                "POST",
                [
                    {
                        "id": campaign_id,
                        "recruiter_id": recruiter_id,
                        "organization_id": organization_id,
                        "title": spec["title"],
                        "role_title": spec["role_title"],
                        "department": spec["department"],
                        "location": spec["location"],
                        "employment_type": spec["employment_type"],
                        "job_description": spec["job_description"],
                        "status": spec["status"],
                        "ranking_weights": {
                            "skills": 0.4,
                            "experience": 0.3,
                            "education": 0.15,
                            "semantic": 0.15,
                        },
                        "metadata": {"seeded": True},
                        "created_at": iso(days=spec["age_days"]),
                        "updated_at": iso(days=max(0, spec["age_days"] - 3)),
                    }
                ],
            ),
            f"insert campaign {spec['title']}",
        )

        for rank, person in enumerate(spec["people"], start=1):
            name, stage, overall, ats, years, category, recommendation, favourite = person
            candidate_id = str(uuid.uuid4())
            handle = name.split()[0].lower()
            matching = top[: max(1, round(len(top) * overall / 100))] if top else []
            gaps = missing if overall < 85 else []

            must(
                *api(
                    "/rest/v1/candidates",
                    "POST",
                    [
                        {
                            "id": candidate_id,
                            "campaign_id": campaign_id,
                            "recruiter_id": recruiter_id,
                            "full_name": name,
                            "email": f"{handle}@example.com",
                            "phone": f"+49 30 5550{rank:03d}",
                            "resume_filename": f"{handle}_resume.pdf",
                            "resume_path": f"seed/{candidate_id}.pdf",
                            "stage": stage,
                            "is_favorite": favourite,
                            "metadata": {"seeded": True, "analysis_status": "analyzed"},
                            "created_at": iso(days=spec["age_days"] - 1, hours=rank),
                            "updated_at": iso(days=1, hours=rank),
                        }
                    ],
                ),
                f"insert candidate {name}",
            )

            must(
                *api(
                    "/rest/v1/candidate_analyses",
                    "POST",
                    [
                        {
                            "id": str(uuid.uuid4()),
                            "candidate_id": candidate_id,
                            "campaign_id": campaign_id,
                            "recruiter_id": recruiter_id,
                            "analysis_version": "seed-v1",
                            "rank": rank,
                            "overall_score": overall,
                            "ats_score": ats,
                            "semantic_similarity": round(overall / 100 * 0.92, 3),
                            "years_experience": years,
                            "match_category": category,
                            "recommendation": recommendation,
                            "result": {
                                # `candidate_id` AND `filename` ARE REQUIRED BY
                                # `app.schemas.batch.CandidateResult`, and their
                                # absence is why the "KNOWN GAP" in this file's
                                # docstring was worse than it said.
                                #
                                # It was not only that nothing wrote embeddings.
                                # `reindex_campaign` parses this blob into a
                                # `CandidateResult` before embedding, and every
                                # seeded row failed that parse with "2 validation
                                # errors" — so even after a reindex, every seeded
                                # candidate stayed invisible to Talent search.
                                # The skip is silent from the caller's side: the
                                # endpoint cheerfully answers
                                # `{"considered": 0, "indexed": 0, "total": 5}`.
                                #
                                # `filename` mirrors `resume_filename` on the
                                # candidate row above so the two agree.
                                "candidate_id": candidate_id,
                                "filename": f"{handle}_resume.pdf",
                                "name": name,
                                "email": f"{handle}@example.com",
                                "overall_score": overall,
                                "ats_score": ats,
                                "years_experience": years,
                                "match_category": category,
                                "recommendation": recommendation,
                                "recommendation_explanation": (
                                    f"{name.split()[0]} brings {years} years of directly "
                                    f"relevant experience and covers {len(matching)} of the "
                                    f"{len(top)} core requirements for this role."
                                ),
                                "summary": (
                                    f"{name} is a {category.lower()} for {spec['role_title']}"
                                    + (f", with depth in {', '.join(matching[:3])}." if matching else ".")
                                ),
                                "top_skills": top,
                                "matching_skills": matching,
                                "missing_skills": gaps,
                                "strengths": [
                                    f"Deep hands-on experience with {matching[0]}"
                                    if matching
                                    else "Relevant delivery history",
                                    "Clear ownership of outcomes in previous roles",
                                    "Communicates technical trade-offs precisely",
                                ],
                                "weaknesses": [f"Limited exposure to {g}" for g in gaps]
                                or ["No significant gaps identified against the requirements"],
                                "resume_data": {
                                    "name": name,
                                    "email": f"{handle}@example.com",
                                    "phone": "+49 30 5550000",
                                    "skills": top,
                                    "education": [
                                        {"degree": "BSc Computer Science", "institution": "TU Berlin"}
                                    ],
                                    "experience": [
                                        {"title": "Senior Engineer", "company": "Acme GmbH", "years": years}
                                    ],
                                },
                            },
                            "created_at": iso(days=1, hours=rank),
                        }
                    ],
                ),
                f"insert analysis for {name}",
            )
            candidates += 1

    print(f"seeded {len(campaign_ids)} roles and {candidates} candidates")
    return campaign_ids


def show(recruiter_id: str, organization_id: str) -> None:
    org = must(
        *api(f"/rest/v1/organizations?id=eq.{organization_id}&select=name,plan"), "read org"
    )
    sub = must(
        *api(
            f"/rest/v1/subscriptions?organization_id=eq.{organization_id}"
            "&select=plan,status,plan_ruleset"
        ),
        "read subscription",
    )
    campaigns = must(
        *api(
            f"/rest/v1/campaigns?recruiter_id=eq.{recruiter_id}"
            "&metadata->>seeded=eq.true&select=id,title,status&order=created_at"
        ),
        "read campaigns",
    )
    print(f"\n  email        {QA_EMAIL}")
    print(f"  password     {QA_PASSWORD}")
    print(f"  recruiter    {recruiter_id}")
    print(f"  organization {organization_id}  {org[0]['name'] if org else '?'}")
    if sub:
        print(f"  plan         {sub[0]['plan']} · ruleset {sub[0]['plan_ruleset']}")
    for c in campaigns:
        print(f"  role         {c['id']}  {c['status']:<8} {c['title']}")
    print("\n  flip plans with:  python -m scripts.set_org_plan set "
          f"{organization_id} --plan pro --reason '...'")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--reset", action="store_true", help="delete seeded rows, then re-seed")
    parser.add_argument("--show", action="store_true", help="print the account and ids only")
    args = parser.parse_args()

    recruiter_id, organization_id = ensure_account()

    if args.show:
        show(recruiter_id, organization_id)
        return

    existing = must(
        *api(
            f"/rest/v1/campaigns?recruiter_id=eq.{recruiter_id}&select=id,metadata&limit=200"
        ),
        "read existing campaigns",
    )
    unseeded = [c for c in existing if not (c.get("metadata") or {}).get("seeded")]
    if unseeded:
        sys.exit(
            f"refusing to touch {organization_id}: it holds {len(unseeded)} campaign(s) this "
            "script did not create. Point it at a throwaway org."
        )

    if args.reset:
        reset(recruiter_id)
    elif existing:
        print("already seeded — pass --reset to rebuild")
        show(recruiter_id, organization_id)
        return

    seed(recruiter_id, organization_id)
    show(recruiter_id, organization_id)


if __name__ == "__main__":
    main()
