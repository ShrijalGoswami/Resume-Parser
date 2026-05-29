import fitz
import logging
from pathlib import Path
from app.parser.base import BaseParser
from app.parser.exceptions import ParserError

logger = logging.getLogger(__name__)

class PDFParser(BaseParser):
    """
    Parser implementation for PDF resumes using PyMuPDF (fitz).
    """
    def parse(self, file_path: Path) -> tuple[str, int]:
        logger.info(f"File detected: {file_path}")
        
        if not file_path.exists():
            raise ParserError(f"PDF file does not exist at: {file_path}")

        try:
            # Selected PDF parser
            logger.info("Parser selected: PDFParser")
            
            # Open document
            doc = fitz.open(file_path)
            page_count = len(doc)
            
            text_parts = []
            for page_num in range(page_count):
                page = doc.load_page(page_num)
                # get_text() automatically handles encoding and decoding
                page_text = page.get_text()
                text_parts.append(page_text)
                
            raw_text = "\n".join(text_parts).strip()
            
            logger.info(f"Extraction success: {file_path} (Pages: {page_count}, Bytes: {len(raw_text)})")
            return raw_text, page_count
            
        except Exception as e:
            logger.error(f"Extraction failure: Failed to parse PDF {file_path}. Reason: {str(e)}")
            raise ParserError(f"Failed to parse PDF document: {str(e)}")
