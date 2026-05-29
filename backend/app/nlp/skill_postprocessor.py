import re
import logging

logger = logging.getLogger(__name__)

# Category definitions for sorting priority
CATEGORIES = {
    "Programming": [
        "Python", "C++", "C", "C#", "Java", "JavaScript", "TypeScript", "SQL", "HTML", "CSS", "Rust", "Go", "Ruby", "PHP", "Swift", "Kotlin"
    ],
    "ML/AI": [
        "PyTorch", "Scikit-Learn", "XGBoost", "RAG", "BM25", "Sentence Transformers", "TensorFlow", "Keras", "LangChain", 
        "spaCy", "NLTK", "OpenAI", "Groq", "Llama", "BERT", "Hugging Face", "ChromaDB", "Milvus", "Qdrant", "Deep Learning", "Machine Learning"
    ],
    "Backend": [
        "FastAPI", "Streamlit", "Flask", "Django", "Node.js", "Express"
    ],
    "Data": [
        "Pandas", "NumPy", "Matplotlib", "Seaborn", "SciPy", "Tableau", "Power BI"
    ],
    "Infrastructure": [
        "Docker", "Git", "GitHub", "GitLab", "Vertex AI", "AWS", "GCP", "Azure", "Kubernetes", "Linux", "Bash", "Nginx"
    ]
}

def get_skill_category_index(skill: str) -> tuple[int, str]:
    """
    Returns a sorting tuple of (category_index, skill_name_lowercase).
    """
    skill_lower = skill.lower()
    
    # Match the skill against the category list
    for idx, (cat_name, cat_skills) in enumerate(CATEGORIES.items()):
        if any(s.lower() == skill_lower for s in cat_skills):
            return idx, skill_lower
            
    # Default index for uncategorized skills
    return len(CATEGORIES), skill_lower

def postprocess_skills(skills: list[str], full_text: str, skills_section_text: str = "") -> list[str]:
    """
    Post-processes skills:
    1. Removes redundant 'C' if 'C++' exists and C wasn't explicitly listed in the skills section.
    2. Cleans up duplicates and merges equivalents.
    3. Groups and sorts skills by category order (Programming, ML/AI, Backend, Data, Infrastructure).
    """
    skills_set = set(skills)
    
    # Redundant parent skill rule: If C++ exists and C was matched implicitly, remove C
    if "C++" in skills_set and "C" in skills_set:
        has_explicit_c = False
        
        # Check if ' C ' or 'C' as standalone word is present in the skills section text
        # avoiding matching C inside C++ or C#
        if skills_section_text:
            if re.search(r"\bc\b(?![\+\#])", skills_section_text.lower()):
                has_explicit_c = True
                
        # Check in the full text if not explicitly found in skills section
        if not has_explicit_c:
            if not re.search(r"\bc\b(?![\+\#])", full_text.lower()):
                logger.info("Skill Postprocessor: Removed inferred redundant skill 'C' (C++ exists).")
                skills_set.discard("C")
                
    # Sort the unique list by category and then alphabetically
    sorted_skills = sorted(list(skills_set), key=get_skill_category_index)
    return sorted_skills
