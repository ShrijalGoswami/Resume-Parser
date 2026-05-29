import re
import logging
from app.schemas.resume import ResumeData

logger = logging.getLogger(__name__)

def validate_name(name: str) -> bool:
    """
    Validates if name contains at least 2 words.
    """
    if not name:
        return False
    words = name.strip().split()
    return len(words) >= 2

def validate_email(email: str) -> bool:
    """
    Validates email format using an RFC 5322 compliant regex.
    """
    if not email:
        return False
    pattern = r"^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$"
    return bool(re.match(pattern, email.strip()))

def validate_phone(phone: str) -> bool:
    """
    Validates if a phone number matches standard Indian or international sizes (10-13 digits).
    """
    if not phone:
        return False
    digits = re.sub(r"\D", "", phone)
    return 10 <= len(digits) <= 13

def clean_and_validate_resume_data(data: ResumeData) -> ResumeData:
    """
    Validates, cleans, and deduplicates the extracted ResumeData.
    """
    # Validate core fields and log warnings
    if not validate_name(data.name):
        logger.warning(f"Validation Warning: Name '{data.name}' does not meet word-count requirements.")
        
    if not validate_email(data.email):
        logger.warning(f"Validation Warning: Email '{data.email}' is invalid.")
        
    if not validate_phone(data.phone):
        logger.warning(f"Validation Warning: Phone number '{data.phone}' is invalid.")

    # Deduplicate skills while preserving the category-sorted order
    seen_skills = set()
    deduped_skills = []
    for skill in data.skills:
        if skill not in seen_skills:
            seen_skills.add(skill)
            deduped_skills.append(skill)
    data.skills = deduped_skills

    # Validate Experience (must have role OR company)
    valid_experience = []
    for exp in data.experience:
        if exp.company.strip() or exp.role.strip():
            # Clean description list
            exp.description = [d.strip() for d in exp.description if d.strip()]
            valid_experience.append(exp)
        else:
            logger.warning("Validation Cleaning: Experience entry discarded (missing both company and role).")
    data.experience = valid_experience

    # Deduplicate Projects and check title
    seen_projects = set()
    valid_projects = []
    for proj in data.projects:
        title_clean = proj.title.strip()
        if not title_clean:
            continue
        title_lower = title_clean.lower()
        if title_lower in seen_projects:
            logger.info(f"Validation Cleaning: Removed duplicate project '{title_clean}'")
            continue
        seen_projects.add(title_lower)
        proj.description = [d.strip() for d in proj.description if d.strip()]
        valid_projects.append(proj)
    data.projects = valid_projects

    return data
