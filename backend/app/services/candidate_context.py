"""
Candidate Intelligence Context Builder.

Assembles a structured, labeled context block that the Recruiter Copilot LLM
reasons over. The LLM reasons primarily over STRUCTURED candidate data
(profile, ATS, ranking, recommendation) and falls back to resume text only
for additional detail.

Extensibility: context is composed from independent `ContextSource`
implementations. Future sources (GitHub, Portfolio, LinkedIn, Recruiter Notes,
Interview Feedback, Assessment Results) only need to implement `sections()`
and be `.add()`-ed to the builder — the copilot service never changes.
"""

from dataclasses import dataclass
from typing import Protocol

from app.schemas.batch import CandidateResult


@dataclass
class ContextSection:
    """One labeled block of context, e.g. 'Skills' or 'ATS Analysis'."""
    title: str
    content: str
    has_data: bool = True


class ContextSource(Protocol):
    """A pluggable source of candidate context."""
    def sections(self) -> list[ContextSection]: ...


def _bullet(items: list[str]) -> str:
    items = [i.strip() for i in items if i and i.strip()]
    return "\n".join(f"- {i}" for i in items) if items else "(none listed)"


class CandidateProfileSource:
    """Structured candidate profile + deterministic analysis + AI insights."""

    def __init__(self, candidate: CandidateResult):
        self.c = candidate

    def sections(self) -> list[ContextSection]:
        c = self.c
        resume = c.resume_data
        out: list[ContextSection] = []

        # Identity
        identity = f"Name: {c.name or 'Unknown'}"
        if c.email:
            identity += f"\nEmail: {c.email}"
        if c.phone:
            identity += f"\nPhone: {c.phone}"
        identity += f"\nEstimated experience: {c.years_experience} years"
        out.append(ContextSection("Candidate Profile", identity))

        # Skills (from resume)
        skills = resume.skills if resume else []
        out.append(ContextSection("Skills", _bullet(skills), has_data=bool(skills)))

        # Experience
        if resume and resume.experience:
            blocks = []
            for e in resume.experience:
                header = " | ".join(x for x in [e.role, e.company, e.duration] if x)
                bullets = "\n".join(f"    • {d}" for d in e.description) if e.description else ""
                blocks.append(f"- {header}\n{bullets}".rstrip())
            out.append(ContextSection("Work Experience", "\n".join(blocks)))
        else:
            out.append(ContextSection("Work Experience", "(no experience parsed)", has_data=False))

        # Projects
        if resume and resume.projects:
            blocks = []
            for p in resume.projects:
                bullets = "\n".join(f"    • {d}" for d in p.description) if p.description else ""
                blocks.append(f"- {p.title}\n{bullets}".rstrip())
            out.append(ContextSection("Projects", "\n".join(blocks)))
        else:
            out.append(ContextSection("Projects", "(no projects parsed)", has_data=False))

        # Education
        if resume and resume.education:
            blocks = [
                "- " + " | ".join(x for x in [e.degree, e.institution, e.duration, e.gpa] if x)
                for e in resume.education
            ]
            out.append(ContextSection("Education", "\n".join(blocks)))
        else:
            out.append(ContextSection("Education", "(no education parsed)", has_data=False))

        # Certifications
        certs = resume.certifications if resume else []
        out.append(ContextSection("Certifications", _bullet(certs), has_data=bool(certs)))

        # ATS analysis
        bd = c.ats_breakdown
        ats = (
            f"Overall ATS score: {c.ats_score}/100\n"
            f"- Technical Skills: {bd.technical_skills}/30\n"
            f"- Projects: {bd.projects}/25\n"
            f"- Experience: {bd.experience}/20\n"
            f"- Education: {bd.education}/10\n"
            f"- Quantified Impact: {bd.impact}/15"
        )
        out.append(ContextSection("ATS Analysis", ats))

        # Ranking breakdown
        if c.score and c.score.components:
            comps = "\n".join(f"- {comp.name}: {comp.earned}/{comp.max}" for comp in c.score.components)
            ranking = f"Overall weighted score: {c.overall_score}/100 (rank #{c.rank}, {c.match_category})\n{comps}"
        else:
            ranking = f"Overall weighted score: {c.overall_score}/100 ({c.match_category})"
        ranking += f"\nJD/resume text similarity: {round(c.semantic_similarity * 100)}%"
        out.append(ContextSection("Ranking Breakdown", ranking))

        # Matching / missing skills vs the JD
        out.append(ContextSection("Skills Matching the Job", _bullet(c.matching_skills), has_data=bool(c.matching_skills)))
        out.append(ContextSection("Missing / Gap Skills", _bullet(c.missing_skills), has_data=bool(c.missing_skills)))

        # Qualitative
        out.append(ContextSection("Identified Strengths", _bullet(c.strengths), has_data=bool(c.strengths)))
        out.append(ContextSection("Identified Weaknesses", _bullet(c.weaknesses), has_data=bool(c.weaknesses)))

        if c.experience_relevance:
            out.append(ContextSection("Experience Relevance", c.experience_relevance))

        rec = c.recommendation or "(not available)"
        if c.recommendation_explanation:
            rec += f"\nRationale: {c.recommendation_explanation}"
        out.append(ContextSection("Hiring Recommendation", rec))

        if c.summary:
            out.append(ContextSection("Recruiter Summary", c.summary))

        return out


class JobDescriptionSource:
    """The target job description."""

    def __init__(self, job_description: str):
        self.jd = job_description

    def sections(self) -> list[ContextSection]:
        jd = (self.jd or "").strip()
        return [ContextSection("Job Description", jd or "(no job description provided)", has_data=bool(jd))]


class RecruiterNotesSource:
    """Recruiter-authored notes about the candidate (pinned notes first)."""

    def __init__(self, notes: list[str]):
        self.notes = [n for n in (notes or []) if n and n.strip()]

    def sections(self) -> list[ContextSection]:
        body = _bullet(self.notes)
        return [ContextSection("Recruiter Notes", body, has_data=bool(self.notes))]


class CandidateContextBuilder:
    """
    Composes context sections from any number of registered sources into a
    single labeled text block for the LLM, and reports which evidence
    categories actually contain data.
    """

    def __init__(self) -> None:
        self._sources: list[ContextSource] = []

    def add(self, source: ContextSource) -> "CandidateContextBuilder":
        self._sources.append(source)
        return self

    def _all_sections(self) -> list[ContextSection]:
        sections: list[ContextSection] = []
        for src in self._sources:
            sections.extend(src.sections())
        return sections

    def build(self) -> str:
        """Render all sources into a single, clearly delimited context string."""
        parts: list[str] = []
        for sec in self._all_sections():
            parts.append(f"### {sec.title}\n{sec.content}")
        return "\n\n".join(parts)

    def available_evidence(self) -> list[str]:
        """Titles of sections that actually contain data (for grounding hints)."""
        return [sec.title for sec in self._all_sections() if sec.has_data]


def build_candidate_context(
    candidate: CandidateResult,
    job_description: str,
    notes: list[str] | None = None,
) -> CandidateContextBuilder:
    """
    Convenience factory wiring the default sources. Recruiter notes are included
    when available. Future sources (GitHub, Portfolio, LinkedIn, Interview
    Feedback, ...) are added here.
    """
    builder = (
        CandidateContextBuilder()
        .add(JobDescriptionSource(job_description))
        .add(CandidateProfileSource(candidate))
    )
    if notes:
        builder.add(RecruiterNotesSource(notes))
    return builder
