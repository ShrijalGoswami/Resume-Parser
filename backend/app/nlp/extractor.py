import datetime
import re
import logging
from app.schemas.resume import ResumeData, EducationEntry, ExperienceEntry, ProjectEntry
from app.nlp.skill_normalizer import normalize_skills

logger = logging.getLogger(__name__)

# ── Years-of-experience computation (robust, raw-text based) ─────────────────
# The structured experience parser frequently drops/merges date fields, so the
# authoritative years figure is computed directly from the raw résumé text:
#   1) union of all dated employment periods  (handles overlap / concurrent /
#      ongoing "present" correctly — never double-counts),
#   2) else an explicit "N years of experience" statement,
#   3) else a bare "N months" duration (internships).
_MONTH_MAP = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6, "jul": 7, "aug": 8,
    "sep": 9, "sept": 9, "oct": 10, "nov": 11, "dec": 12,
    "january": 1, "february": 2, "march": 3, "april": 4, "june": 6, "july": 7,
    "august": 8, "september": 9, "october": 10, "november": 11, "december": 12,
}
_MON = (
    r"(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|"
    r"april|june|july|august|september|october|november|december)"
)
_ENDPOINT = rf"(?:present|current|now|ongoing|(?:{_MON})\.?\s*)?(?:19|20)\d{{2}}|present|current|now|ongoing"
_RANGE_RE = re.compile(
    rf"((?:{_MON})\.?\s*)?((?:19|20)\d{{2}})\s*(?:-|–|—|to|through|until|–)\s*"
    rf"(present|current|now|ongoing|(?:(?:{_MON})\.?\s*)?(?:19|20)\d{{2}})",
    re.IGNORECASE,
)
_TOTAL_RE = re.compile(r"(\d{1,2})\s*\+?\s*years?\s+(?:of\s+)?(?:experience|exp)\b", re.IGNORECASE)
_OVER_RE = re.compile(r"(?:over|more than|nearly|about|around)\s+(\d{1,2})\s*years?", re.IGNORECASE)
_MONTHS_RE = re.compile(r"(\d{1,2})\s*months?\b", re.IGNORECASE)


def _month_index(month_word: str) -> int:
    if not month_word:
        return 1
    return _MONTH_MAP.get(month_word.strip().strip(".").lower(), 1)


def _merge_month_intervals(intervals: list[tuple[int, int]]) -> int:
    """Total covered months across (start_abs, end_abs) pairs, merging overlaps."""
    if not intervals:
        return 0
    ordered = sorted(intervals)
    merged = [list(ordered[0])]
    for start, end in ordered[1:]:
        if start <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], end)
        else:
            merged.append([start, end])
    return sum(end - start for start, end in merged)


def years_of_experience_from_text(text: str) -> float:
    """Total years of professional experience derived from the raw résumé text."""
    if not text:
        return 0.0
    low = text.lower()
    now = datetime.datetime.utcnow()
    now_abs = now.year * 12 + (now.month - 1)

    # 1) Union of dated employment periods.
    intervals: list[tuple[int, int]] = []
    for m in _RANGE_RE.finditer(low):
        start_mon, start_year, end_raw = m.group(1), m.group(2), m.group(3)
        start_abs = int(start_year) * 12 + (_month_index(start_mon) - 1)
        end_raw = end_raw.strip()
        if end_raw in ("present", "current", "now", "ongoing"):
            end_abs = now_abs
        else:
            em = re.match(rf"((?:{_MON})\.?\s*)?((?:19|20)\d{{2}})", end_raw, re.IGNORECASE)
            end_abs = int(em.group(2)) * 12 + (_month_index(em.group(1)) - 1)
        if 0 <= (end_abs - start_abs) <= 45 * 12:
            intervals.append((start_abs, end_abs))
    union_years = round(_merge_month_intervals(intervals) / 12 * 2) / 2
    if union_years > 0:
        return float(min(union_years, 45.0))

    # 2) Explicit total statement ("8 years of experience", "over 5 years").
    totals = [int(m.group(1)) for m in _TOTAL_RE.finditer(low)]
    totals += [int(m.group(1)) for m in _OVER_RE.finditer(low)]
    totals = [t for t in totals if 0 < t <= 45]
    if totals:
        return float(max(totals))

    # 3) Bare months (e.g. a "6 months" internship) → fractional year.
    months = [int(m.group(1)) for m in _MONTHS_RE.finditer(low) if 0 < int(m.group(1)) <= 24]
    if months:
        return round(max(months) / 12 * 2) / 2

    return 0.0

# Predefined common skills vocabulary for text-matching
COMMON_SKILLS = {
    "python", "c++", "c", "c#", "java", "javascript", "typescript", "sql", "html", "css", "rust", "go", "ruby", "php", "swift", "kotlin",
    "scikit-learn", "xgboost", "pytorch", "tensorflow", "keras", "langchain", "rag", "chromadb", "milvus", "qdrant",
    "bm25", "sentence transformers", "spacy", "nltk", "huggingface", "openai", "groq", "llama", "bert", "embeddings",
    "retrieval systems", "vector db", "ensemble ml", "llm", "large language models", "deep learning", "machine learning",
    "nlp", "natural language processing", "computer vision", "cv", "reinforcement learning",
    "fastapi", "streamlit", "flask", "django", "nodejs", "express", "docker", "kubernetes", "git", "github", "gitlab",
    "vertex ai", "aws", "gcp", "azure", "mongodb", "postgresql", "mysql", "sqlite", "redis", "nginx", "linux", "bash",
    "pandas", "numpy", "matplotlib", "seaborn", "scipy", "eda", "feature engineering", "statistical modeling",
    "data science", "data analysis", "data visualization", "tableau", "power bi"
}

def clean_gpa(gpa_str: str) -> str:
    """
    Standardizes GPA prefix casing (e.g. 'cgpa: 8.3' -> 'CGPA: 8.3').
    """
    if not gpa_str:
        return ""
    cleaned = re.sub(r"\bcgpa\b", "CGPA", gpa_str, flags=re.IGNORECASE)
    cleaned = re.sub(r"\bgpa\b", "GPA", cleaned, flags=re.IGNORECASE)
    return cleaned.strip()

def clean_duration(duration_str: str) -> str:
    """
    Normalizes date durations (e.g. 'sep 2024 – oct 2028' -> 'Sep 2024 – Oct 2028').
    """
    if not duration_str:
        return ""
    # Standardize en-dashes/hyphens with clean spaces
    standardized = re.sub(r"\s*[-–—]\s*", " – ", duration_str)
    words = standardized.split()
    cleaned = []
    for word in words:
        if word.lower() == "present":
            cleaned.append("Present")
        elif len(word) in (3, 4) and word.isalpha():
            # Standardize months like Sep, Oct
            cleaned.append(word.capitalize())
        else:
            cleaned.append(word)
    return " ".join(cleaned)

def detect_sections(text: str) -> dict[str, str]:
    """
    Detects and splits the resume text into sections based on header keywords.
    Logs each detected section.
    """
    section_keywords = {
        "summary": ["summary", "profile", "about me", "objective"],
        "education": ["education", "academic", "qualification", "study"],
        "experience": ["experience", "employment", "work history", "history"],
        "projects": ["projects", "personal projects", "key projects"],
        "skills": ["skills", "technologies", "competencies"],
        "certifications": ["certifications", "courses", "licenses", "certification", "awards", "achievements"]
    }
    
    sections = {}
    lines = text.split("\n")
    
    current_section = None
    section_lines = []
    
    for line in lines:
        cleaned_line = line.strip()
        if not cleaned_line:
            if current_section and section_lines:
                section_lines.append(line)
            continue
            
        is_header = False
        detected_sec = None
        
        # A header must be reasonably short and must not start with a bullet point
        if len(cleaned_line) < 45 and not cleaned_line.startswith(("•", "-", "*", chr(149))):
            lower_line = cleaned_line.lower().rstrip(":")
            # Partial substring matching to handle variations like "Certifications & Achievements"
            for sec_name, keywords in section_keywords.items():
                if any(kw in lower_line for kw in keywords):
                    is_header = True
                    detected_sec = sec_name
                    break
                    
        if is_header:
            if current_section:
                sections[current_section] = "\n".join(section_lines).strip()
            current_section = detected_sec
            section_lines = []
            logger.info(f"Section detected: {current_section.upper()}")
        else:
            if current_section:
                section_lines.append(line)
                
    if current_section and section_lines:
        sections[current_section] = "\n".join(section_lines).strip()
        
    return sections

def extract_name(text: str) -> str:
    """
    Extracts candidate name from the top of the resume.
    """
    lines = text.split("\n")
    cleaned_lines = [line.strip() for line in lines if line.strip()]
    
    for line in cleaned_lines[:4]:
        lower_line = line.lower()
        if "@" in line or "http" in lower_line or "linkedin" in lower_line or "github" in lower_line:
            continue
        if any(kw in lower_line for kw in ["resume", "cv", "curriculum", "vitae", "summary"]):
            continue
        if re.search(r"\+?\d{1,4}[-.\s]?\d{3,4}[-.\s]?\d{3,4}", line):
            continue
            
        words = line.split()
        if 1 <= len(words) <= 4 and len(line) < 35:
            logger.info(f"Extraction success: Name extracted: '{line}'")
            return line
            
    logger.warning("Missing field: Name could not be extracted.")
    return ""

def extract_email(text: str) -> str:
    """
    Extracts the email address.
    """
    pattern = r"\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b"
    match = re.search(pattern, text)
    if match:
        email = match.group(0).strip()
        logger.info(f"Extraction success: Email extracted: '{email}'")
        return email
        
    logger.warning("Missing field: Email could not be extracted.")
    return ""

# ── Phone extraction ────────────────────────────────────────────────────────
# The previous pattern hardcoded a 3-3-4 North American grouping, so any résumé
# written the way most of the world writes a number — "+91 98765 43210" (5-5),
# "+44 20 7946 0958" (2-4-4) — extracted NOTHING, silently. The recruiter saw a
# candidate with no phone number and no error.
#
# Grouping is not something to enumerate: every country groups differently and a
# résumé may use spaces, hyphens, dots, parentheses or unicode dashes. So the
# shape is matched loosely and the DIGIT COUNT decides, using exactly the range
# `validators.validate_phone` already enforces (10-13). That keeps one
# definition of "is this a phone number" instead of two that can disagree.
#
# The digit-count check is also what keeps false positives out, which matters
# more than it sounds: a résumé is full of number-like runs. "2014-2018" is 8
# digits, "2021 - 2025" is 8, a bare year is 4 — all rejected without needing a
# special case. Letters are absent from the character class, so "840ms to 190ms"
# and "4M transactions" can never join up into a candidate.

#: Separators that may appear inside a written phone number (incl. unicode dashes).
_PHONE_SEP = r"[\s.‐-―()\-]"
#: A loose candidate: optional +CC, then digits interleaved with separators.
_PHONE_CANDIDATE_RE = re.compile(rf"\+?\d(?:{_PHONE_SEP}*\d){{6,19}}")
#: A label immediately preceding a number is strong evidence it is THE number.
_PHONE_LABEL_RE = re.compile(
    rf"(?:phone|mobile|tel|telephone|cell|contact)\s*[:#]?\s*(\+?\d(?:{_PHONE_SEP}*\d){{6,19}})",
    re.IGNORECASE,
)
#: Runs long enough to be two concatenated years/ids rather than one number.
_PHONE_MIN_DIGITS, _PHONE_MAX_DIGITS = 10, 13


def _phone_digits(raw: str) -> str:
    return re.sub(r"\D", "", raw)


def _first_valid_phone(segment: str) -> str:
    """First substring of `segment` whose digit count is phone-shaped."""
    # A labelled number wins over positional order — "DOB 12-03-1990" can precede
    # the real number, and only the label disambiguates them.
    for m in _PHONE_LABEL_RE.finditer(segment):
        candidate = m.group(1).strip(" .-()")
        if _PHONE_MIN_DIGITS <= len(_phone_digits(candidate)) <= _PHONE_MAX_DIGITS:
            return candidate
    for m in _PHONE_CANDIDATE_RE.finditer(segment):
        candidate = m.group(0).strip(" .-()")
        if _PHONE_MIN_DIGITS <= len(_phone_digits(candidate)) <= _PHONE_MAX_DIGITS:
            return candidate
    return ""


def extract_phone(text: str) -> str:
    """
    Extracts the phone number.

    Header first, then the rest of the document. The split is deliberate: a
    contact number is almost always in the first few lines, and preferring it
    stops a phone-shaped run further down (an employer's number in a project
    description, a reference's contact) from winning on position alone.
    """
    if not text:
        logger.warning("Missing field: Phone could not be extracted.")
        return ""

    for segment in (text[:1200], text[1200:]):
        phone = _first_valid_phone(segment)
        if phone:
            logger.info(f"Extraction success: Phone extracted: '{phone}'")
            return phone

    logger.warning("Missing field: Phone could not be extracted.")
    return ""

def extract_skills(skills_section: str, full_text: str) -> list[str]:
    """
    Extracts, normalizes, and filters skills from the resume.
    """
    skills = set()
    normalized_full_text = full_text.lower()
    
    # 1. Matching predefined list
    for skill in COMMON_SKILLS:
        escaped_skill = re.escape(skill)
        if skill in ["c++", "c#", "node.js", "next.js"]:
            pattern = rf"\b{escaped_skill}(?:\b|[^\w]|$)"
        else:
            pattern = rf"\b{escaped_skill}\b"
            
        if re.search(pattern, normalized_full_text):
            skills.add(skill)
            
    # 2. Parsing explicit text in Skills section
    if skills_section:
        lines = skills_section.split("\n")
        for line in lines:
            if ":" in line:
                line_content = line.split(":", 1)[1]
            else:
                line_content = line
                
            tokens = re.split(r"[,|;•\-\*]", line_content)
            for token in tokens:
                cleaned = token.strip()
                if cleaned and len(cleaned) < 35:
                    lower_cleaned = cleaned.lower()
                    if lower_cleaned not in ["languages", "ml/ai", "backend/tools", "data", "technical skills", "skills"]:
                        skills.add(cleaned)

    # Apply Skill Normalizer Layer (TASK 1 & 2)
    normalized_skills = normalize_skills(list(skills))
    
    # Apply Pre-Phase 4 Skill Postprocessor (Hierarchy C++ vs C & Categorization sorting)
    from app.nlp.skill_postprocessor import postprocess_skills
    final_skills = postprocess_skills(normalized_skills, full_text, skills_section or "")
    
    logger.info(f"Extraction success: Normalized & categorized skills compiled (count: {len(final_skills)}).")
    return final_skills
#: Tokens that identify a line (or comma-separated fragment) as an institution
#: or as a qualification. Extracted to module scope so the single-line splitter
#: and the line classifier below cannot disagree about what a degree looks like.
_INSTITUTION_KEYWORDS = (
    "institute", "university", "college", "school", "vit", "iit", "nit", "academy",
)
_DEGREE_KEYWORDS = (
    "b.tech", "b.e", "b.sc", "bca", "m.tech", "m.e", "m.sc", "mca", "b.s.", "m.s.",
    "bachelor", "master", "phd",
)
#: A date range inside an education line. Case-insensitive because it is applied
#: to the original text, not a lowercased copy — the original is what gets stored.
_EDU_DURATION_RE = re.compile(
    r"\(?\s*((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\.?\s*)?((?:19|20)\d{2})"
    r"\s*[-–—]\s*"
    r"(present|current|(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\.?\s*)?(?:19|20)\d{2})"
    r"\s*\)?",
    re.IGNORECASE,
)


def _split_combined_education_line(line: str) -> dict[str, str]:
    """Split a one-line education entry into its parts.

    Résumés routinely write the whole qualification on a single line:

        B.Tech Computer Science and Engineering, IIT Madras (2014-2018)

    The line classifier below is line-oriented and tests institution BEFORE
    degree in an elif chain, so a line naming both was filed entirely as the
    institution — degree and duration came back empty. That is not a cosmetic
    loss: `reconciliation` treats extracted degrees as facts the model may not
    call missing, so an empty degree silently weakens M-4 as well.

    Splitting is syntactic — the date is lifted out, then commas separate the
    remaining fragments and the same keyword lists classify each. Fragments that
    match neither attach to the degree while no institution has been seen and to
    the institution afterwards, which follows the near-universal ordering
    (qualification, then where it was earned).
    """
    parts: dict[str, str] = {}
    remainder = line

    match = _EDU_DURATION_RE.search(remainder)
    if match:
        parts["duration"] = clean_duration(match.group(0).strip("() "))
        remainder = (remainder[: match.start()] + " " + remainder[match.end():])

    gpa = re.search(
        r"(?:cgpa|gpa|grade|marks|percentage)[\s:]*([0-9.]+(?:\s*/\s*[0-9.]+)?|[0-9]+%)",
        remainder, re.IGNORECASE,
    )
    if gpa:
        parts["gpa"] = clean_gpa(gpa.group(0))
        remainder = remainder[: gpa.start()] + " " + remainder[gpa.end():]

    degree_bits: list[str] = []
    inst_bits: list[str] = []
    for fragment in remainder.split(","):
        fragment = fragment.strip(" ,;()-·|")
        if not fragment:
            continue
        low = fragment.lower()
        if any(k in low for k in _INSTITUTION_KEYWORDS):
            inst_bits.append(fragment)
        elif any(k in low for k in _DEGREE_KEYWORDS):
            degree_bits.append(fragment)
        elif inst_bits:
            inst_bits.append(fragment)
        else:
            degree_bits.append(fragment)

    if degree_bits:
        parts["degree"] = ", ".join(degree_bits)
    if inst_bits:
        parts["institution"] = ", ".join(inst_bits)
    return parts


def extract_education(education_section: str) -> list[EducationEntry]:
    """
    Extracts education details, standardizing GPAs and dates.
    """
    if not education_section:
        logger.warning("Missing section: Education section not found.")
        return []
        
    entries = []
    lines = [l.strip() for l in education_section.split("\n") if l.strip()]
    
    current_entry = {}
    
    for line in lines:
        lower_line = line.lower()
        is_inst = any(k in lower_line for k in _INSTITUTION_KEYWORDS)
        is_degree = any(k in lower_line for k in _DEGREE_KEYWORDS)
        gpa_match = re.search(r"(?:cgpa|gpa|grade|marks|percentage)[\s:]*([0-9.]+(?:\s*/\s*[0-9.]+)?|[0-9]+%)", lower_line)
        duration_match = re.search(r"((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s*\d{4}|\d{4})\s*[-–—\s]+\s*(?:present|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s*\d{4}|\d{4})", lower_line)

        # A line naming BOTH a qualification and an institution is a complete
        # entry written on one line. Handled before the elif chain below, which
        # tests institution first and would swallow the whole line.
        if is_inst and is_degree:
            if current_entry and (current_entry.get("institution") or current_entry.get("degree")):
                entries.append(current_entry)
                current_entry = {}
            current_entry.update(_split_combined_education_line(line))
            continue

        # A single-component line may still carry its dates ("IIT Madras, 2014-2018").
        if (is_inst or is_degree) and _EDU_DURATION_RE.search(line):
            extracted = _split_combined_education_line(line)
            duration = extracted.pop("duration", "")
            if duration:
                current_entry.setdefault("duration", duration)
                line = _EDU_DURATION_RE.sub(" ", line).strip(" ,;()-")
                lower_line = line.lower()

        if is_inst:
            # Start a new entry only when this one ALREADY names an institution.
            # It used to flush on a pending degree too, which split the ordinary
            # two-line form —
            #     B.Tech Computer Science
            #     Indian Institute of Technology Madras
            # — into a degree with no institution followed by an institution with
            # no degree. Both halves then read as incomplete to anything
            # downstream, including M-4 reconciliation.
            if current_entry and current_entry.get("institution"):
                entries.append(current_entry)
                current_entry = {}
            current_entry["institution"] = line
        elif is_degree:
            # A second qualification once this entry is already complete is the
            # NEXT entry, not a correction of this one. Without this, a résumé
            # listing an M.Tech above a B.Tech had the first degree silently
            # overwritten by the second.
            if current_entry.get("degree") and current_entry.get("institution"):
                entries.append(current_entry)
                current_entry = {}
            current_entry["degree"] = line
        elif gpa_match:
            current_entry["gpa"] = clean_gpa(gpa_match.group(0))  # Standardize GPA Casing (TASK 5)
        elif duration_match:
            current_entry["duration"] = clean_duration(duration_match.group(0))  # Standardize Date Format (TASK 5)
        else:
            if not current_entry.get("institution"):
                current_entry["institution"] = line
            elif not current_entry.get("degree"):
                current_entry["degree"] = line
            else:
                current_entry["degree"] = current_entry.get("degree", "") + " " + line
                
    if current_entry and (current_entry.get("institution") or current_entry.get("degree")):
        entries.append(current_entry)
        
    result = []
    for entry in entries:
        result.append(
            EducationEntry(
                institution=entry.get("institution", "").strip(),
                degree=entry.get("degree", "").strip(),
                duration=clean_duration(entry.get("duration", "")),
                gpa=clean_gpa(entry.get("gpa", ""))
            )
        )
        
    logger.info(f"Extraction success: Extracted {len(result)} education entries.")
    return result

def extract_experience(experience_section: str) -> list[ExperienceEntry]:
    """
    Extracts work experience, merging line breaks and formatting bullets.
    """
    if not experience_section:
        logger.warning("Missing section: Experience section not found.")
        return []
        
    entries = []
    lines = experience_section.split("\n")
    
    current_entry = None
    
    for line in lines:
        cleaned = line.strip()
        if not cleaned:
            continue
            
        lower_line = cleaned.lower()
        duration_match = re.search(r"((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s*\d{4}|\d{4})\s*[-–—\s]+\s*(?:present|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s*\d{4}|\d{4})", lower_line)
        is_role = any(r in lower_line for r in ["intern", "developer", "engineer", "analyst", "lead", "manager", "specialist", "programmer", "consultant", "architect"])
        has_separator = any(sep in cleaned for sep in ["—", "|", " at ", " @ "])
        is_bullet = cleaned.startswith(("•", "-", "*")) or cleaned.startswith(chr(149))
        
        if (is_role or duration_match or has_separator) and not is_bullet:
            if duration_match and not (is_role or has_separator):
                if current_entry:
                    current_entry["duration"] = clean_duration(duration_match.group(0))
                    continue
                    
            if current_entry:
                entries.append(current_entry)
                
            current_entry = {
                "company": "",
                "role": "",
                "duration": clean_duration(duration_match.group(0)) if duration_match else "",
                "description": []
            }
            
            heading_text = cleaned
            if duration_match:
                heading_text = heading_text.replace(duration_match.group(0), "").strip()
                
            parts = []
            for sep in ["—", "|", " at ", " @ "]:
                if sep in heading_text:
                    parts = heading_text.split(sep, 1)
                    break
                    
            if len(parts) == 2:
                p1_lower = parts[0].lower()
                if any(r in p1_lower for r in ["intern", "developer", "engineer", "analyst", "lead", "manager"]):
                    current_entry["role"] = parts[0].strip()
                    current_entry["company"] = parts[1].strip()
                else:
                    current_entry["company"] = parts[0].strip()
                    current_entry["role"] = parts[1].strip()
            else:
                if is_role:
                    current_entry["role"] = heading_text.strip()
                else:
                    current_entry["company"] = heading_text.strip()
                    
        elif is_bullet:
            if current_entry is not None:
                # Strip the bullet char and extra whitespace
                desc_text = re.sub(r"^[•\-*\s]+", "", cleaned).strip()
                if desc_text:
                    current_entry["description"].append(desc_text)
        else:
            # Handle wrapped lines / broken splits (TASK 4)
            if current_entry is not None:
                if current_entry["description"]:
                    # Merge into the last bullet item with a space
                    current_entry["description"][-1] = (current_entry["description"][-1] + " " + cleaned).strip()
                else:
                    if not current_entry["company"] and not current_entry["role"]:
                        current_entry["company"] = cleaned
                    else:
                        current_entry["description"].append(cleaned)
                        
    if current_entry:
        entries.append(current_entry)
        
    result = []
    for entry in entries:
        result.append(
            ExperienceEntry(
                company=entry.get("company", "").strip().strip("—").strip(),
                role=entry.get("role", "").strip().strip("—").strip(),
                duration=clean_duration(entry.get("duration", "")),
                description=entry.get("description", [])
            )
        )
        
    logger.info(f"Extraction success: Extracted {len(result)} experience entries.")
    return result

def extract_projects(projects_section: str) -> list[ProjectEntry]:
    """
    Extracts and filters projects, resolving tech-stack and link line lookaheads (TASK 3).
    """
    if not projects_section:
        return []
        
    entries = []
    lines = [l.strip() for l in projects_section.split("\n") if l.strip()]
    
    i = 0
    while i < len(lines):
        line = lines[i]
        is_bullet = line.startswith(("•", "-", "*", chr(149)))
        
        if not is_bullet:
            title = line
            description = []
            
            # Look ahead for sub elements
            i += 1
            while i < len(lines):
                next_line = lines[i]
                next_is_bullet = next_line.startswith(("•", "-", "*", chr(149)))
                
                if next_is_bullet:
                    desc_text = re.sub(r"^[•\-*\s]+", "", next_line).strip()
                    if desc_text:
                        description.append(desc_text)
                else:
                    # Clean lookahead checks for links or pure tech lists
                    is_url = "github.com" in next_line.lower() or "linkedin.com" in next_line.lower() or next_line.lower() in ("github", "linkedin") or next_line.startswith("http")
                    
                    skills_in_line = [s for s in COMMON_SKILLS if s in next_line.lower()]
                    is_tech_stack = ("," in next_line or "|" in next_line) and len(skills_in_line) >= 2
                    
                    if is_url or is_tech_stack:
                        if is_tech_stack:
                            description.append(f"Technologies: {next_line}")
                    else:
                        # Determine if the next line is a continuation of description or a new project title
                        is_title_like = next_line[0].isupper() if next_line else False
                        is_sentence_end_or_lowercase = next_line.endswith(".") or not is_title_like
                        
                        if is_sentence_end_or_lowercase:
                            # Merge continuation of text into the previous description item
                            if description:
                                description[-1] = (description[-1] + " " + next_line).strip()
                            else:
                                description.append(next_line)
                        else:
                            # Found the start of a new project, stop lookahead
                            break
                i += 1
                
            # strict validation criteria (TASK 3)
            is_title_url = "github.com" in title.lower() or "linkedin.com" in title.lower() or title.lower() in ("github", "linkedin") or title.startswith("http")
            title_skills = [s for s in COMMON_SKILLS if s in title.lower()]
            is_title_tech_list = ("," in title or "|" in title) and len(title_skills) >= 3
            has_bullets = len(description) >= 1
            
            if not is_title_url and not is_title_tech_list and has_bullets:
                entries.append(
                    ProjectEntry(
                        title=title,
                        description=description
                    )
                )
        else:
            i += 1
            
    logger.info(f"Extraction success: Extracted {len(entries)} valid projects.")
    return entries

def extract_certifications(certifications_section: str) -> list[str]:
    """
    Extracts certifications.
    """
    if not certifications_section:
        return []
    lines = certifications_section.split("\n")
    certs = []
    for line in lines:
        cleaned = line.strip()
        if cleaned:
            cleaned = re.sub(r"^[•\-*\s\d\.\)]+", "", cleaned).strip()
            if cleaned:
                certs.append(cleaned)
    return certs

def _employment_text(text: str, sections: dict[str, str]) -> str:
    """The part of the résumé whose date ranges represent EMPLOYMENT.

    `years_of_experience_from_text` unions every dated range it is given, which
    is right — overlapping and concurrent jobs must not double-count. What was
    wrong is what it was given: the whole document. A degree reading
    "(2014-2018)" is a date range like any other, so a candidate who studied
    2014-2018 and worked 2018-2025 was credited with **eleven** years instead of
    seven, and the inflation grows with the length of the degree.

    That number is not cosmetic — it feeds ATS scoring and seniority judgement,
    so it decides whether someone is read as a senior hire.

    The function itself is left alone: it is called elsewhere with bare snippets
    and its contract (union the ranges you are given) is correct. Only the input
    is narrowed.
    """
    experience = (sections.get("experience") or "").strip()
    if experience:
        return experience
    # No experience section was detected — a one-column résumé, or unusual
    # headings. Fall back to the whole document minus education, so a degree's
    # dates still cannot be counted as employment. Better to under-narrow than
    # to return nothing and report 0 years for someone with a real history.
    education = (sections.get("education") or "").strip()
    if education and education in text:
        return text.replace(education, " ")
    return text


def extract_resume_data(text: str) -> ResumeData:
    """
    Extracts raw text, maps it to ResumeData Pydantic model, and normalizes entries.
    """
    logger.info("Initializing information extraction engine.")
    
    sections = detect_sections(text)
    
    name = extract_name(text)
    email = extract_email(text)
    phone = extract_phone(text)
    
    skills = extract_skills(sections.get("skills", ""), text)
    education = extract_education(sections.get("education", ""))
    experience = extract_experience(sections.get("experience", ""))
    projects = extract_projects(sections.get("projects", ""))
    certifications = extract_certifications(sections.get("certifications", ""))
    
    logger.info("Information extraction engine completion success.")
    
    return ResumeData(
        name=name,
        email=email,
        phone=phone,
        skills=skills,
        education=education,
        experience=experience,
        projects=projects,
        certifications=certifications,
        total_experience_years=years_of_experience_from_text(_employment_text(text, sections)),
    )
