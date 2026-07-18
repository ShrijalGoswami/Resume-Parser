"""Prompts for the recruiter batch candidate analysis (single Groq call per resume)."""

BATCH_SYSTEM_PROMPT = (
    "You are an expert technical recruiter and hiring manager. You evaluate a "
    "candidate's resume against a specific job description and produce a concise, "
    "honest, recruiter-grade assessment. You never invent skills or experience that "
    "are not present in the resume. You return ONLY valid minified JSON matching the "
    "requested schema — no markdown, no commentary, no code fences."
)


def build_batch_prompt(job_description: str, resume_json: str) -> str:
    """Build the user prompt combining the JD and the structured resume."""
    return f"""Evaluate the following candidate against the job description.

=== JOB DESCRIPTION ===
{job_description}

=== CANDIDATE RESUME (structured JSON) ===
{resume_json}

Return ONLY a JSON object with EXACTLY these keys:
{{
  "candidate_summary": "2-3 sentence recruiter summary of fit for THIS role",
  "matching_skills": ["skills required by the JD that the candidate clearly has"],
  "missing_skills": ["skills/requirements from the JD absent in the resume"],
  "relevant_projects": ["project titles that support the JD requirements"],
  "less_relevant_projects": ["project titles with limited relevance to the JD"],
  "strengths": ["3-5 concrete strengths for this role"],
  "weaknesses": ["2-4 concrete gaps or risks for this role"],
  "experience_relevance": "one sentence on how the candidate's experience aligns with the role",
  "hiring_recommendation": "exactly one of: Strongly Recommend Interview, Recommend Interview, Consider for Further Review, Not Recommended",
  "recommendation_explanation": "one sentence justifying the recommendation",
  "interview_questions": ["4-6 tailored technical/behavioral interview questions probing gaps and depth"]
}}

Rules:
- Base every field ONLY on evidence in the resume and the JD.
- matching_skills and missing_skills must be specific technologies/skills, not sentences.
- Output must be valid JSON and nothing else."""
