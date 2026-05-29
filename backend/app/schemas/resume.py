from pydantic import BaseModel, Field

class EducationEntry(BaseModel):
    """
    Schema for education records extracted from a resume.
    """
    institution: str = Field(default="", description="Name of the university, college, or school")
    degree: str = Field(default="", description="Degree obtained, e.g. B.Tech, M.S.")
    duration: str = Field(default="", description="Time period, e.g. 2020 - 2024")
    gpa: str = Field(default="", description="GPA, CGPA, or marks")

class ExperienceEntry(BaseModel):
    """
    Schema for work experience records extracted from a resume.
    """
    company: str = Field(default="", description="Name of the employer or company")
    role: str = Field(default="", description="Job title or role")
    duration: str = Field(default="", description="Employment time period")
    description: list[str] = Field(default_factory=list, description="Bullet points of responsibilities or achievements")

class ProjectEntry(BaseModel):
    """
    Schema for projects listed on a resume.
    """
    title: str = Field(default="", description="Name of the project")
    description: list[str] = Field(default_factory=list, description="Details of the project work")

class ResumeData(BaseModel):
    """
    Schema representing the complete structured candidate profile.
    """
    name: str = Field(default="", description="Candidate's full name")
    email: str = Field(default="", description="Primary email address")
    phone: str = Field(default="", description="Contact telephone number")
    skills: list[str] = Field(default_factory=list, description="List of technical skills and tools")
    education: list[EducationEntry] = Field(default_factory=list, description="Academic history details")
    experience: list[ExperienceEntry] = Field(default_factory=list, description="Work history details")
    projects: list[ProjectEntry] = Field(default_factory=list, description="Projects accomplished")
    certifications: list[str] = Field(default_factory=list, description="Certifications and courses completed")
