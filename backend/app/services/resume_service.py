from pathlib import Path
import logging
from app.parser.factory import ParserFactory
from app.nlp.extractor import extract_resume_data
from app.nlp.validators import clean_and_validate_resume_data
from app.schemas.resume import ResumeData

logger = logging.getLogger(__name__)

class ResumeService:
    """
    Service class that coordinates the Resume Parsing Pipeline:
    Resume File Path -> Text Parsing -> Information Extraction -> Validation -> ResumeData Schema validation
    """
    @staticmethod
    def process_resume(file_path: Path) -> ResumeData:
        logger.info(f"Resume parsing pipeline initiated for: {file_path.name}")
        
        # Step 1: Execute Document Parser
        raw_text, page_count, parser_name = ParserFactory.parse_file(file_path)
        logger.info(f"Pipeline Step 1 (Parsing) success. Parser used: {parser_name}")
        
        # Step 2: Extract Structured Candidate Profile
        resume_data = extract_resume_data(raw_text)
        
        # Step 3: Validate and Clean extracted data
        resume_data = clean_and_validate_resume_data(resume_data)
        logger.info(f"Pipeline Step 3 (Validation) success. Profile compiled and validated for: '{resume_data.name}'")
        
        return resume_data
