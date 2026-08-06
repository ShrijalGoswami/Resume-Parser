import logging
from pathlib import Path
from app.parser.base import BaseParser
from app.parser.pdf import PDFParser
from app.parser.docx import DocxParser
from app.parser.exceptions import ParserError
from app.ai.utils.limits import ArchiveTooLargeError, DocumentTooLargeError, enforce_document
from app.ai.utils.untrusted import scrub

logger = logging.getLogger(__name__)

class ParserFactory:
    """
    Factory to select and execute the correct resume document parser.
    """
    @staticmethod
    def get_parser(file_path: Path) -> BaseParser:
        """
        Factory method to return the correct parser based on file extension.
        """
        suffix = file_path.suffix.lower()
        if suffix == ".pdf":
            return PDFParser()
        elif suffix == ".docx":
            return DocxParser()
        else:
            logger.error(f"Extraction failure: No parser configured for extension '{suffix}'")
            raise ParserError(f"Unsupported file format: {suffix}")

    @classmethod
    def parse_file(cls, file_path: Path) -> tuple[str, int, str]:
        """
        Detects the file format, selects the parser, parses text, and returns results.

        Args:
            file_path: The Path of the document to parse.

        Returns:
            A tuple of (extracted_text, page_count, parser_name).

        Raises:
            ParserError: If parsing or file loading fails.
        """
        if not file_path.exists():
            logger.error(f"Extraction failure: File does not exist at {file_path}")
            raise ParserError("The requested resume file does not exist.")

        parser = cls.get_parser(file_path)
        parser_name = parser.__class__.__name__

        # Execute parsing (which performs page count and text extraction).
        # `ArchiveTooLargeError` is raised INSIDE the parser, before it opens the
        # file, because the memory ceiling has to be checked before decompression
        # (A3). It is translated here for the same reason `DocumentTooLargeError`
        # is below: every caller of this factory already handles `ParserError`,
        # and a refusal the routes do not recognise becomes a 500 instead of the
        # 400 it is.
        try:
            text, page_count = parser.parse(file_path)
        except ArchiveTooLargeError as exc:
            logger.warning("Extraction refused: %s", exc)
            raise ParserError(str(exc)) from exc

        # Resource ceiling, refused rather than clipped (S-4). The upload cap
        # is 10MB of FILE; a 10MB PDF can carry megabytes of text over hundreds
        # of pages, and nothing bounded that. Enforced here because this is
        # already the single chokepoint every parser passes through.
        try:
            enforce_document(text, page_count, name=file_path.name)
        except DocumentTooLargeError as exc:
            logger.warning("Extraction refused: %s", exc)
            raise ParserError(str(exc)) from exc

        # Single chokepoint for untrusted document text. Résumés are authored by
        # the candidate being evaluated, so instruction-like lines are stripped
        # here — before skill extraction, the LLM prompt, or embeddings ever see
        # them. Scrubbing further downstream was not enough: a payload line
        # naming the skills it wanted claimed got those words lifted into
        # ResumeData.skills by the extractor, after which the field looked like
        # ordinary parsed content and every later check accepted it.
        cleaned = scrub(text)
        if cleaned != text:
            logger.warning(
                "Scrubbed instruction-like content from %s during extraction "
                "(%d -> %d chars)",
                file_path.name,
                len(text),
                len(cleaned),
            )
        return cleaned, page_count, parser_name
