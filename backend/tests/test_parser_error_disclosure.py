"""
Parser errors must not leak the server filesystem (M-1, extending A6).

A6 stopped the two upload 500 paths from interpolating `str(e)`. It did not
cover the parser, and the parser is reachable by anyone who can upload a file:
`batch_service` puts `ParserError` text straight into the per-candidate `error`
field of a 200 response, so a corrupt PDF returned

    Failed to open file 'C:\\Users\\<user>\\AppData\\Local\\Temp\\hirelens_uploads\\<id>.pdf'

which names the OS, the account and the temp layout to an unauthenticated-ish
caller. The detail belongs in the log, where A6 already put its own.
"""

from __future__ import annotations

import logging
import re

import pytest

from app.parser.docx import DocxParser
from app.parser.exceptions import ParserError
from app.parser.pdf import PDFParser

#: Anything that would identify this machine or its layout.
_PATH_SHAPED = re.compile(
    r"""
    [A-Za-z]:[\\/]           # windows drive  C:\ or C:/
    | /(?:home|Users|tmp|var|etc)/   # posix roots
    | AppData
    | hirelens_uploads
    | \\\\                   # UNC prefix
    """,
    re.VERBOSE | re.IGNORECASE,
)


def _assert_clean(message: str) -> None:
    assert not _PATH_SHAPED.search(message), f"error text leaks a path: {message!r}"


# ── missing file ─────────────────────────────────────────────────────────────

@pytest.mark.parametrize("parser,suffix", [(PDFParser(), ".pdf"), (DocxParser(), ".docx")])
def test_missing_file_error_has_no_path(parser, suffix, tmp_path):
    missing = tmp_path / f"nope{suffix}"
    with pytest.raises(ParserError) as exc:
        parser.parse(missing)
    _assert_clean(str(exc.value))


# ── corrupt content ──────────────────────────────────────────────────────────

def test_corrupt_pdf_error_has_no_path(tmp_path):
    """The exact fixture shape from the audit: valid magic bytes, garbage body."""
    bad = tmp_path / "resume_corrupt.pdf"
    bad.write_bytes(b"%PDF-1.7\n" + bytes(range(256)) * 16)
    with pytest.raises(ParserError) as exc:
        PDFParser().parse(bad)
    _assert_clean(str(exc.value))
    # Still actionable — a bare "error" would be its own defect.
    assert "corrupt" in str(exc.value).lower()


def test_corrupt_docx_error_has_no_path(tmp_path):
    bad = tmp_path / "resume_corrupt.docx"
    bad.write_bytes(b"PK\x03\x04" + b"\x00" * 512)
    with pytest.raises(ParserError) as exc:
        DocxParser().parse(bad)
    _assert_clean(str(exc.value))


def test_text_file_wearing_a_pdf_extension(tmp_path):
    spoofed = tmp_path / "resume_spoofed.pdf"
    spoofed.write_text("this is not a pdf at all", encoding="utf-8")
    with pytest.raises(ParserError) as exc:
        PDFParser().parse(spoofed)
    _assert_clean(str(exc.value))


# ── the detail must survive, in the log ──────────────────────────────────────

def test_full_detail_is_still_logged(tmp_path, caplog):
    """Sanitising the response must not cost the operator their diagnostics."""
    bad = tmp_path / "resume_corrupt.pdf"
    bad.write_bytes(b"%PDF-1.7\n" + b"\xff" * 2048)
    with caplog.at_level(logging.ERROR, logger="app.parser.pdf"):
        with pytest.raises(ParserError):
            PDFParser().parse(bad)
    assert "resume_corrupt.pdf" in caplog.text, "the path must still reach the log"


# ── the surfaced field, end to end ───────────────────────────────────────────

def test_batch_service_error_field_is_clean(tmp_path):
    """`batch_service` copies ParserError text into the client response."""
    from app.schemas.batch import RankingWeights
    from app.services.batch_service import _process_one

    bad = tmp_path / "resume_corrupt.pdf"
    bad.write_bytes(b"%PDF-1.7\n" + b"\x01" * 4096)
    result = _process_one(
        "Backend engineer", "cid", "resume_corrupt.pdf", bad, RankingWeights()
    )
    assert result.status == "failed"
    _assert_clean(result.error or "")
