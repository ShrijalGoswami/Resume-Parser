"""
Phone extraction across international formats (H-1).

The bug this pins: the original pattern hardcoded a 3-3-4 North American
grouping, so "+91 98765 43210" — the format on the résumé that surfaced this —
matched nothing and the candidate was stored with no phone at all. Silent: no
error, no warning the recruiter would ever see.

The failure mode worth guarding against in the OTHER direction is a pattern so
loose it matches date ranges. A résumé is dense with number runs, and
"2021 - 2025" sitting next to a job title is exactly what a permissive phone
regex latches onto.
"""

from __future__ import annotations

import pytest

from app.nlp.extractor import extract_phone
from app.nlp.validators import validate_phone


# ── formats that must extract ────────────────────────────────────────────────

@pytest.mark.parametrize(
    "raw, expected_digits",
    [
        # The exact format from the audit fixture that returned "".
        ("Priya Raghunathan\npriya@example.com | +91 98765 43210 | Bengaluru", "919876543210"),
        # India, no space after country code.
        ("Contact: +919876543210", "919876543210"),
        # India, hyphenated.
        ("+91-98765-43210", "919876543210"),
        # Bare 10-digit Indian mobile.
        ("Mobile 9876543210", "9876543210"),
        # North American, parenthesised — the format that DID work before.
        ("Jane Doe\n(555) 123-4567\njane@example.com", "5551234567"),
        # North American, dotted.
        ("555.123.4567", "5551234567"),
        # North American with country code.
        ("+1 (555) 123-4567", "15551234567"),
        # UK, 2-4-4 grouping.
        ("+44 20 7946 0958", "442079460958"),
        # Germany, long-ish.
        ("+49 30 901820", "4930901820"),
        # Labelled with a colon.
        ("Phone: +91 98765 43210", "919876543210"),
        # Unicode en-dash separators.
        ("+91‑98765‑43210", "919876543210"),
    ],
)
def test_extracts_international_formats(raw, expected_digits):
    got = extract_phone(raw)
    assert got, f"extracted nothing from {raw!r}"
    assert "".join(ch for ch in got if ch.isdigit()) == expected_digits
    # Whatever we return must satisfy the app's own definition of a phone.
    assert validate_phone(got)


# ── things that must NOT be mistaken for a phone ─────────────────────────────

@pytest.mark.parametrize(
    "raw",
    [
        "EXPERIENCE\nSenior Backend Engineer, Razorpay (2021-2025)",
        "B.Tech Computer Science, IIT Madras (2014-2018)",
        "Cut p99 checkout latency from 840ms to 190ms",
        "Processed 4M transactions per day",
        "Designed billing for 12,000 paying accounts",
        "Reduced regressions by 70%",
        "",
    ],
)
def test_rejects_non_phone_number_runs(raw):
    assert extract_phone(raw) == ""


def test_year_ranges_do_not_win_over_the_real_number():
    """A date range appearing BEFORE the number must not be picked."""
    text = (
        "Priya Raghunathan\n"
        "Senior Backend Engineer, 2018-2021 and 2021-2025\n"
        "Phone: +91 98765 43210\n"
    )
    assert "".join(c for c in extract_phone(text) if c.isdigit()) == "919876543210"


def test_label_beats_position():
    """An unlabelled date-of-birth-like run must lose to the labelled number."""
    text = "Date of birth 12-03-1990\nMobile: +91 98765 43210\n"
    assert "".join(c for c in extract_phone(text) if c.isdigit()) == "919876543210"


def test_header_preferred_over_body():
    """A contact number up top wins over a phone-shaped run deep in the body."""
    text = "Priya Raghunathan\n+91 98765 43210\n" + ("filler line\n" * 200) + "+1 555 987 6543\n"
    assert "".join(c for c in extract_phone(text) if c.isdigit()) == "919876543210"


def test_body_used_when_header_has_none():
    text = ("no contact details up here\n" * 40) + "reach me on +91 98765 43210"
    assert "".join(c for c in extract_phone(text) if c.isdigit()) == "919876543210"


def test_end_to_end_on_the_audit_fixture_text():
    """The full header line from the fixture that exposed H-1."""
    text = (
        "Priya Raghunathan\n"
        "priya.raghunathan@example.com | +91 98765 43210 | Bengaluru, India\n"
        "\nSUMMARY\nSenior backend engineer with seven years...\n"
    )
    assert extract_phone(text) == "+91 98765 43210"
