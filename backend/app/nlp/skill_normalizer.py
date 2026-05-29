import logging

logger = logging.getLogger(__name__)

# Mapping of lowercase technology aliases to their canonical official casing
CANONICAL_MAPPING = {
    "fastapi": "FastAPI",
    "github": "GitHub",
    "chromadb": "ChromaDB",
    "pytorch": "PyTorch",
    "scikit": "Scikit-Learn",
    "scikit-learn": "Scikit-Learn",
    "langchain": "LangChain",
    "xgboost": "XGBoost",
    "rag": "RAG",
    "bm25": "BM25",
    "sql": "SQL",
    "numpy": "NumPy",
    "pandas": "Pandas",
    "python": "Python",
    "c++": "C++",
    "c": "C",
    "git": "Git",
    "streamlit": "Streamlit",
    "vertex ai": "Vertex AI",
    "docker": "Docker",
    "aws": "AWS",
    "gcp": "GCP",
    "azure": "Azure",
    "mongodb": "MongoDB",
    "postgresql": "PostgreSQL",
    "mysql": "MySQL",
    "sqlite": "SQLite",
    "redis": "Redis",
    "nginx": "Nginx",
    "linux": "Linux",
    "bash": "Bash",
    "tensorflow": "TensorFlow",
    "keras": "Keras",
    "milvus": "Milvus",
    "qdrant": "Qdrant",
    "huggingface": "Hugging Face",
    "openai": "OpenAI",
    "groq": "Groq",
    "llama": "Llama",
    "bert": "BERT",
    "spacy": "spaCy",
    "nltk": "NLTK",
    "react": "React",
    "nodejs": "Node.js",
    "flask": "Flask",
    "django": "Django",
    "tableau": "Tableau",
    "power bi": "Power BI",
    "sentence transformers": "Sentence Transformers"
}

# Non-technical concepts or noisy words to reject
NOISE_TERMS = {
    "learn", "machine learning", "retrieval systems", "ensemble ml", "deployment", 
    "optimization", "debugging", "data science", "data analysis", "data visualization",
    "statistical modeling", "eda", "feature engineering", "languages", "ml/ai", "backend/tools",
    "data", "technical skills", "skills", "pre-processing", "training", "inference",
    "source-grounded", "reranking", "source source-grounded", "source", "cross-validated"
}

def normalize_skills(raw_skills: list[str]) -> list[str]:
    """
    Filters out noise terms, normalizes casings to canonical names,
    deduplicates, and returns a sorted list of technologies.
    """
    normalized_set = set()
    duplicate_count = 0
    
    for skill in raw_skills:
        cleaned = skill.strip()
        if not cleaned:
            continue
            
        lower_skill = cleaned.lower().replace("-", " ")
        # Also check direct lower case
        lower_direct = cleaned.lower()
        
        # 1. Filter out noise terms
        if lower_direct in NOISE_TERMS or lower_skill in NOISE_TERMS:
            continue
            
        # 2. Map to canonical name
        canonical = None
        if lower_direct in CANONICAL_MAPPING:
            canonical = CANONICAL_MAPPING[lower_direct]
        elif lower_skill in CANONICAL_MAPPING:
            canonical = CANONICAL_MAPPING[lower_skill]
            
        if canonical:
            if canonical in normalized_set:
                duplicate_count += 1
            else:
                normalized_set.add(canonical)
        else:
            # If not in mappings, check if it's a single character other than 'C'
            # and format with title case if it looks like a custom skill
            if len(cleaned) == 1 and cleaned.upper() != "C":
                continue
            title_cased = cleaned.title()
            if title_cased in normalized_set:
                duplicate_count += 1
            else:
                normalized_set.add(title_cased)

    result = sorted(list(normalized_set))
    logger.info(f"Skills Normalized: raw={len(raw_skills)}, unique_canonical={len(result)}, duplicates_removed={duplicate_count}")
    return result
