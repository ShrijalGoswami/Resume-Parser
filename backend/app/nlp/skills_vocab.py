"""
Shared skill vocabulary (data only — no imports from the scoring layer).

Two consumers, both leaf-safe:
  * ranking_engine.extract_jd_skills — scans a JD for the skills it names, so
    core-requirement coverage can be computed DETERMINISTICALLY (resume ∩ JD),
    independent of what the LLM chose to list, and still JD-sensitive when the
    LLM is unavailable.
  * reconciliation — uses the vocabulary to recognise when a slash/"or"-joined
    missing-skill claim ("PyTorch/TensorFlow", "JavaScript/TypeScript") is a set
    of DISTINCT alternatives (so having one refutes it) versus a single token
    that merely contains a slash ("CI/CD", "TCP/IP", "A/B testing").

This is a curated dictionary, deliberately role-agnostic and extensible — NOT a
per-JD or per-candidate list. It never needs to be exhaustive: the LLM's
matching/missing lists augment it whenever the model is available, and any
résumé skill literally present in the JD text is picked up regardless of whether
it appears here.
"""
from __future__ import annotations

#: Ubiquitous skills that do not signal fit for any specialised role. Excluded
#: from core-requirement coverage on both sides (matched and missing) so a
#: candidate whose only overlap with the JD is Python/Git/REST scores ~zero
#: specialised coverage. Kept small and JD-agnostic.
GENERIC_SKILLS: set[str] = {
    "python", "java", "c", "c++", "c#", "javascript", "typescript",
    "html", "css", "sql", "git", "github", "gitlab", "bitbucket",
    "rest", "rest api", "rest apis", "rest api design", "restful apis",
    "linux", "unix", "bash", "shell scripting", "json", "xml",
    "agile", "scrum", "jira", "ci/cd", "ci cd", "cicd",
    "object oriented programming", "oop", "data structures", "algorithms",
}

#: Specialised skills spanning the common engineering role families. Multi-word
#: phrases are matched as whole phrases (word-boundary, case-insensitive).
SKILL_VOCAB: set[str] = {
    # ── languages / general ──────────────────────────────────────────────
    "python", "java", "javascript", "typescript", "c++", "c#", "go", "golang",
    "rust", "ruby", "php", "kotlin", "swift", "scala", "matlab", "perl",
    # ── web / frontend ───────────────────────────────────────────────────
    "html", "css", "react", "react.js", "next.js", "vue", "vue.js", "angular",
    "svelte", "tailwind", "tailwind css", "redux", "jquery", "bootstrap",
    "webpack", "vite", "responsive design", "accessibility", "electron",
    # ── backend / frameworks ─────────────────────────────────────────────
    "node", "node.js", "express", "fastapi", "flask", "django", "spring boot",
    "spring", "rails", "laravel", ".net", "asp.net", "graphql", "grpc",
    "rest api", "microservices", "websockets", "celery", "message queue",
    "message queues", "kafka", "rabbitmq", "concurrency", "async",
    # ── databases / storage ──────────────────────────────────────────────
    "sql", "mysql", "postgresql", "postgres", "sqlite", "mongodb", "redis",
    "cassandra", "elasticsearch", "dynamodb", "oracle", "relational databases",
    "vector store", "vector stores", "vector database", "chromadb", "pinecone",
    "qdrant", "milvus", "weaviate", "supabase", "firebase", "orm",
    # ── ml / data science ────────────────────────────────────────────────
    "machine learning", "deep learning", "pytorch", "tensorflow", "keras",
    "scikit-learn", "scikit", "xgboost", "lightgbm", "pandas", "numpy",
    "matplotlib", "seaborn", "computer vision", "nlp",
    "natural language processing", "transformers", "hugging face",
    "huggingface", "llm", "large language models", "rag",
    "retrieval augmented generation", "embeddings", "semantic search",
    "langchain", "llamaindex", "mlops", "feature engineering", "statistics",
    "a/b testing", "experimentation", "model evaluation", "data visualization",
    "data visualisation", "tableau", "power bi", "spark", "hadoop", "airflow",
    # ── cloud / devops ───────────────────────────────────────────────────
    "aws", "azure", "gcp", "google cloud", "docker", "kubernetes", "terraform",
    "ansible", "jenkins", "github actions", "gitlab ci", "prometheus",
    "grafana", "helm", "infrastructure as code", "infrastructure-as-code",
    "nginx", "serverless", "load balancing", "observability", "vertex ai",
    # ── security ─────────────────────────────────────────────────────────
    "cryptography", "penetration testing", "pentesting", "owasp", "owasp zap",
    "burp", "burp suite", "wireshark", "nmap", "metasploit", "siem",
    "network security", "application security", "secure coding",
    "threat modeling", "threat modelling", "digital forensics",
    "anomaly detection", "vulnerability assessment", "incident response",
    "access control", "rate limiting", "ip blocking", "firewall",
    "network traffic analysis",
    # ── testing / practices ──────────────────────────────────────────────
    "unit testing", "pytest", "jest", "selenium", "design patterns",
}
