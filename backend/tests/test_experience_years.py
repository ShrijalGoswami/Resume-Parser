"""
Comprehensive test suite for years-of-experience extraction.

Covers the recruiter-trust scenarios: 0 years, 6 months, 1/2/5/10+ years,
overlapping jobs, internships, concurrent employment, ongoing ("present")
employment, freelance and contract work.

Runnable without pytest:  python -m tests.test_experience_years
(from the backend/ directory, with the project venv active)
"""
from __future__ import annotations

import datetime

from app.nlp.extractor import years_of_experience_from_text, extract_resume_data


def _now_abs() -> int:
    n = datetime.datetime.utcnow()
    return n.year * 12 + (n.month - 1)


def _present_years(start_year: int, start_month: int = 1) -> float:
    months = _now_abs() - (start_year * 12 + (start_month - 1))
    return round(months / 12 * 2) / 2


# (label, raw_text, expected_years)
CASES: list[tuple[str, str, float]] = [
    ("0 years — fresher, no work history",
     "Sneha Patel\nRecent Computer Science graduate seeking an entry-level role.\n"
     "Skills: Python, SQL. Education: B.Sc Computer Science, 2024.", 0.0),

    ("6 months — dated internship",
     "Software Intern, Acme (Jan 2024 - Jul 2024)\nBuilt internal tools.", 0.5),

    ("6 months — bare 'months' phrase, no dates",
     "Software Intern, Acme (6 months)\nAssisted the backend team.", 0.5),

    ("1 year",
     "Backend Developer, Foo Corp (2022 - 2023)\nBuilt REST APIs.", 1.0),

    ("2 years",
     "Software Engineer, Bar Inc (2021 - 2023)\nShipped features.", 2.0),

    ("5 years — single range",
     "Senior Engineer, Baz Ltd (2019 - 2024)\nLed backend services.", 5.0),

    ("10+ years — long single range",
     "Principal Engineer, MegaCorp (2010 - 2023)\nArchitected platforms.", 13.0),

    ("10+ years — explicit phrase, no dates",
     "Staff Engineer with over 10 years of experience building distributed systems.", 10.0),

    ("overlapping jobs — must union, not sum",
     "Engineer, A (2018 - 2022)\nConsultant, B (2020 - 2023)\n"
     "# 4yr + 3yr overlap -> union 2018-2023 = 5", 5.0),

    ("internship only — a couple of months rounds to 0",
     "Summer Intern, Startup (Jun 2022 - Aug 2022)\nShadowed engineers.", 0.0),

    ("concurrent employment — union across both",
     "Full-time Engineer, A (2019 - 2023)\nFreelance Developer, B (2020 - 2022)", 4.0),

    ("freelance",
     "Freelance Software Developer (2020 - 2023)\nDelivered client projects.", 3.0),

    ("contract",
     "Contract Backend Engineer, ClientCo (2021 - 2023)\nMaintained services.", 2.0),
]

# Ongoing employment depends on today's date, so compute expected dynamically.
DYNAMIC_CASES: list[tuple[str, str, float]] = [
    ("ongoing employment — 'Present' resolves to today",
     "Senior Engineer, NowCorp (2021 - Present)\nCurrently building APIs.",
     _present_years(2021)),
    ("ongoing — 'Jan 2020 - Current'",
     "Engineer, StillHere (Jan 2020 - Current)\nOwns the platform.",
     _present_years(2020, 1)),
]


def run() -> int:
    failures = 0
    print("== years_of_experience_from_text ==")
    for label, text, expected in CASES + DYNAMIC_CASES:
        got = years_of_experience_from_text(text)
        ok = abs(got - expected) <= 0.5  # half-year tolerance
        print(f"  [{'PASS' if ok else 'FAIL'}] {label:52s} expected~{expected:<5} got={got}")
        if not ok:
            failures += 1

    # End-to-end: through the full deterministic parser (section detect + extract).
    print("\n== end-to-end via extract_resume_data ==")
    e2e = [
        ("EXPERIENCE\nSenior Engineer, Baz Ltd (2019 - 2024)\nLed backend services.", 5.0),
        ("EXPERIENCE\nSoftware Intern, Acme (Jun 2022 - Aug 2022)\nShadowed team.", 0.0),
        ("EXPERIENCE\nEngineer, A (2018 - 2022)\nConsultant, B (2020 - 2023)", 5.0),
    ]
    for text, expected in e2e:
        rd = extract_resume_data(text)
        got = rd.total_experience_years
        ok = got is not None and abs(got - expected) <= 0.5
        print(f"  [{'PASS' if ok else 'FAIL'}] parsed total_experience_years expected~{expected} got={got}")
        if not ok:
            failures += 1

    print(f"\n{'ALL PASSED' if failures == 0 else str(failures) + ' FAILED'}")
    return failures


if __name__ == "__main__":
    import sys
    sys.exit(1 if run() else 0)
