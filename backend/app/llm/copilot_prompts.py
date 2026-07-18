"""System prompt, user-prompt builder, and configurable suggested questions
for the AI Recruiter Copilot."""

COPILOT_SYSTEM_PROMPT = (
    "You are HireLens Copilot, an experienced technical recruiter and hiring advisor. "
    "You help a recruiter understand ONE specific candidate in the context of ONE job.\n\n"
    "Rules you must always follow:\n"
    "1. Ground every claim ONLY in the CANDIDATE CONTEXT provided. Never invent skills, "
    "employers, projects, dates, or numbers that are not present.\n"
    "2. If the context does not contain the information needed to answer, say so explicitly "
    "(e.g. 'The resume does not mention Docker experience') rather than guessing.\n"
    "3. Explain your reasoning briefly and reference concrete evidence (specific skills, "
    "projects, experience, education, ATS findings, or ranking data).\n"
    "4. Be decisive and useful for a busy recruiter: prioritize signal over verbosity. Use "
    "short markdown (headings, bold, bullet lists) when it improves scannability.\n"
    "5. When asked to generate interview questions or rewrite resume content, produce concrete, "
    "role-relevant output grounded in the candidate's actual background.\n"
    "6. Calibrate the confidence score to how well the available data supports the answer: high "
    "when directly evidenced, low when the data is thin or absent.\n\n"
    "You MUST respond with ONLY valid minified JSON (no markdown fences, no prose outside JSON) "
    "matching this schema:\n"
    "{\n"
    '  "answer": "markdown answer for the recruiter",\n'
    '  "confidence": 0-100,\n'
    '  "evidence": [{"category": "skill|project|experience|education|ats|ranking|recommendation|jd", "detail": "specific grounded evidence"}],\n'
    '  "reasoning_summary": "1-2 sentences on how you derived the answer",\n'
    '  "followups": ["2-4 relevant follow-up questions the recruiter might ask next"]\n'
    "}"
)


def build_copilot_prompt(context: str, available_evidence: list[str], history_text: str, question: str) -> str:
    evidence_hint = ", ".join(available_evidence) if available_evidence else "none"
    history_block = history_text.strip() or "(no prior conversation)"
    return (
        "=== CANDIDATE CONTEXT (the ONLY source of truth) ===\n"
        f"{context}\n\n"
        f"Context sections that contain data: {evidence_hint}\n\n"
        "=== RECENT CONVERSATION ===\n"
        f"{history_block}\n\n"
        "=== RECRUITER QUESTION ===\n"
        f"{question}\n\n"
        "Answer the question grounded strictly in the candidate context above. "
        "Return ONLY the JSON object described in the system prompt."
    )


# Configurable quick-action suggestions shown in the Copilot UI.
SUGGESTION_GROUPS: list[dict] = [
    {
        "category": "Overview",
        "questions": [
            "Summarize this candidate in 3 bullet points.",
            "What is your hiring recommendation and why?",
            "What are the top hiring risks with this candidate?",
        ],
    },
    {
        "category": "Fit & Skills",
        "questions": [
            "Which required skills is this candidate missing?",
            "How well does this candidate match the job description?",
            "Explain their ATS score.",
            "Why did they receive this ranking?",
        ],
    },
    {
        "category": "Experience",
        "questions": [
            "Summarize their work history.",
            "Which project is most relevant to this role?",
            "Have they worked on production systems?",
        ],
    },
    {
        "category": "Interview",
        "questions": [
            "Generate 5 technical interview questions.",
            "Generate project-specific interview questions.",
            "Generate system design questions for this candidate.",
        ],
    },
    {
        "category": "Resume",
        "questions": [
            "How could this resume be improved for this role?",
            "Rewrite their resume summary for this job.",
        ],
    },
]
