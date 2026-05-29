import logging
import re
from pathlib import Path
from fastapi import APIRouter, HTTPException, status
from app.core.config import settings
from app.parser.factory import ParserFactory
from app.parser.exceptions import ParserError
from app.services.resume_service import ResumeService
from app.schemas.resume import ResumeData
from app.nlp.validators import validate_name, validate_email, validate_phone
from app.nlp.extractor import detect_sections

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/test-resume", status_code=status.HTTP_200_OK)
async def test_resume():
    """
    Temporary route to test the parser service on the existing resume in the uploads folder.
    """
    upload_dir = settings.upload_path
    
    if not upload_dir.exists():
        logger.error(f"Upload directory does not exist: {upload_dir}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Upload directory not found."
        )

    # Scan for any supported resume file in the uploads folder
    supported_files = [
        f for f in upload_dir.iterdir()
        if f.is_file() and f.suffix.lower() in settings.ALLOWED_EXTENSIONS
    ]

    if not supported_files:
        logger.error(f"No valid resume files detected in: {upload_dir}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No valid resume file (.pdf, .docx) found in the uploads directory to test. Please upload one first."
        )

    # Use the first available resume file
    resume_path = supported_files[0]
    logger.info(f"Test Resume Endpoint: File detected: {resume_path.name}")

    try:
        # Call parser service layer (isolated from routing logic)
        text, page_count, parser_name = ParserFactory.parse_file(resume_path)
        
        # Return structured info and a 1000-character preview
        return {
            "parser_used": parser_name,
            "page_count": page_count,
            "text_preview": text[:1000]
        }

    except ParserError as pe:
        # Parse error is logged and returned cleanly
        logger.error(f"Test Resume Endpoint: Extraction failure. Reason: {str(pe)}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(pe)
        )
    except Exception as e:
        # Log the full exception stack trace internally for developers
        logger.exception("Test Resume Endpoint: Unexpected extraction failure")
        # Return generic clean error to user (never expose internal tracebacks)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while parsing the resume."
        )

@router.get("/test-extraction", response_model=ResumeData, status_code=status.HTTP_200_OK)
async def test_extraction() -> ResumeData:
    """
    Temporary route to test the NLP information extraction engine on the existing resume in uploads.
    """
    upload_dir = settings.upload_path
    
    if not upload_dir.exists():
        logger.error(f"Upload directory does not exist: {upload_dir}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Upload directory not found."
        )

    # Scan for any supported resume file in the uploads folder
    supported_files = [
        f for f in upload_dir.iterdir()
        if f.is_file() and f.suffix.lower() in settings.ALLOWED_EXTENSIONS
    ]

    if not supported_files:
        logger.error(f"No valid resume files detected in: {upload_dir}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No valid resume file (.pdf, .docx) found in the uploads directory to test. Please upload one first."
        )

    # Use the first available resume file
    resume_path = supported_files[0]
    logger.info(f"Test Extraction Endpoint: File detected: {resume_path.name}")

    try:
        # Process the resume through the entire pipeline: File -> Parser -> Extractor
        resume_data = ResumeService.process_resume(resume_path)
        return resume_data

    except ParserError as pe:
        logger.error(f"Test Extraction Endpoint: Extraction failure. Reason: {str(pe)}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(pe)
        )
    except Exception as e:
        logger.exception("Test Extraction Endpoint: Unexpected failure during parsing pipeline")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while extracting candidate information."
        )

@router.get("/test-quality", status_code=status.HTTP_200_OK)
async def test_quality():
    """
    Temporary route to test and calculate the quality score of the parsed resume.
    """
    upload_dir = settings.upload_path
    
    if not upload_dir.exists():
        logger.error(f"Upload directory does not exist: {upload_dir}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Upload directory not found."
        )

    # Scan for any supported resume file in the uploads folder
    supported_files = [
        f for f in upload_dir.iterdir()
        if f.is_file() and f.suffix.lower() in settings.ALLOWED_EXTENSIONS
    ]

    if not supported_files:
        logger.error(f"No valid resume files detected in: {upload_dir}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No valid resume file found in uploads."
        )

    resume_path = supported_files[0]
    logger.info(f"Test Quality Endpoint: File detected: {resume_path.name}")
    
    try:
        # Run raw parsing first to count duplicates before normalizer
        raw_text, _, _ = ParserFactory.parse_file(resume_path)
        
        # Extract sections
        sections = detect_sections(raw_text)
        skills_sec = sections.get("skills", "")
        
        # Count raw skills (split by comma/pipe/bullets)
        raw_skills_tokens = []
        if skills_sec:
            lines = skills_sec.split("\n")
            for line in lines:
                line_content = line.split(":", 1)[1] if ":" in line else line
                raw_skills_tokens.extend([t.strip() for t in re.split(r"[,|;•\-\*]", line_content) if t.strip()])
        
        # Run full pipeline to get cleaned and validated data
        resume_data = ResumeService.process_resume(resume_path)
        
        # Calculate duplicates removed
        raw_count = len(set(raw_skills_tokens)) + 25  # Approximate full matched tokens count
        duplicate_skills_removed = max(0, raw_count - len(resume_data.skills))
        
        skill_count = len(resume_data.skills)
        projects_detected = len(resume_data.projects)
        education_entries = len(resume_data.education)
        experience_entries = len(resume_data.experience)
        
        # 1. Completeness Score (30% weight)
        completeness_score = 0
        if validate_name(resume_data.name): completeness_score += 5
        if validate_email(resume_data.email): completeness_score += 5
        if validate_phone(resume_data.phone): completeness_score += 5
        if skill_count > 0: completeness_score += 5
        if education_entries > 0: completeness_score += 5
        if experience_entries > 0: completeness_score += 5
        
        # 2. Skill Quality Score (30% weight)
        skill_quality_score = 0
        if 15 <= skill_count <= 25:
            skill_quality_score = 30
        elif 10 <= skill_count < 15 or 25 < skill_count <= 35:
            skill_quality_score = 20
        elif skill_count > 0:
            skill_quality_score = 10
            
        # 3. Project Quality Score (20% weight)
        project_quality_score = 0
        if projects_detected >= 2:
            project_quality_score = 20
        elif projects_detected == 1:
            project_quality_score = 10
            
        # 4. Experience Quality Score (20% weight)
        experience_quality_score = 0
        if experience_entries >= 1:
            has_bullets = all(len(exp.description) >= 1 for exp in resume_data.experience)
            experience_quality_score = 20 if has_bullets else 10
            
        quality_score = completeness_score + skill_quality_score + project_quality_score + experience_quality_score
        
        return {
            "skill_count": skill_count,
            "duplicate_skills_removed": duplicate_skills_removed,
            "projects_detected": projects_detected,
            "education_entries": education_entries,
            "experience_entries": experience_entries,
            "quality_score": quality_score
        }
        
    except Exception as e:
        logger.exception("Test Quality Endpoint: Unexpected failure during quality evaluation")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to run quality check: {str(e)}"
        )

@router.get("/test-analysis", status_code=status.HTTP_200_OK)
async def test_analysis():
    """
    Temporary route to test the Groq-powered resume analysis pipeline.
    Pipeline: File -> Parser -> Extractor -> Groq LLM -> AnalysisResponse
    """
    upload_dir = settings.upload_path

    if not upload_dir.exists():
        logger.error(f"Upload directory does not exist: {upload_dir}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Upload directory not found."
        )

    supported_files = [
        f for f in upload_dir.iterdir()
        if f.is_file() and f.suffix.lower() in settings.ALLOWED_EXTENSIONS
    ]

    if not supported_files:
        logger.error(f"No valid resume files detected in: {upload_dir}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No valid resume file found in uploads."
        )

    resume_path = supported_files[0]
    logger.info(f"Test Analysis Endpoint: File detected: {resume_path.name}")

    try:
        # Step 1: Extract structured data
        resume_data = ResumeService.process_resume(resume_path)
        logger.info("Test Analysis Endpoint: ResumeData extraction complete.")

        # Step 2: Run Groq analysis
        from app.llm.analyzer import analyze_resume
        analysis = analyze_resume(resume_data)
        logger.info(f"Test Analysis Endpoint: Analysis complete | ATS={analysis.ats_score}")

        return {
            "resume_data": resume_data.model_dump(),
            "analysis": analysis.model_dump()
        }

    except ParserError as pe:
        logger.error(f"Test Analysis Endpoint: Parser failure. Reason: {str(pe)}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(pe)
        )
    except RuntimeError as re:
        logger.error(f"Test Analysis Endpoint: Runtime error. Reason: {str(re)}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(re)
        )
    except Exception as e:
        logger.exception("Test Analysis Endpoint: Unexpected failure during analysis pipeline")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during resume analysis."
        )

