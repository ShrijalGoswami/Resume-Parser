// Types mirroring the backend recruiter batch schemas (app/schemas/batch.py).

export interface EducationEntry {
  institution: string;
  degree: string;
  duration: string;
  gpa: string;
}

export interface ExperienceEntry {
  company: string;
  role: string;
  duration: string;
  description: string[];
}

export interface ProjectEntry {
  title: string;
  description: string[];
}

export interface ResumeData {
  name: string;
  email: string;
  phone: string;
  skills: string[];
  education: EducationEntry[];
  experience: ExperienceEntry[];
  projects: ProjectEntry[];
  certifications: string[];
}

export interface ScoreBreakdown {
  technical_skills: number;
  projects: number;
  experience: number;
  education: number;
  impact: number;
}

export interface ScoreComponent {
  name: string;
  key: string;
  earned: number;
  max: number;
}

export interface CandidateScore {
  overall: number;
  components: ScoreComponent[];
  missing_skills: string[];
}

export interface CandidateResult {
  candidate_id: string;
  filename: string;
  status: "success" | "failed";
  error: string | null;

  rank: number;
  overall_score: number;
  score: CandidateScore | null;

  name: string;
  email: string;
  phone: string;

  ats_score: number;
  ats_breakdown: ScoreBreakdown;
  semantic_similarity: number;
  years_experience: number;

  match_category: string;
  recommendation: string;
  recommendation_explanation: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  matching_skills: string[];
  missing_skills: string[];
  top_skills: string[];
  relevant_projects: string[];
  experience_relevance: string;
  interview_questions: string[];

  resume_data: ResumeData | null;
}

export interface SkillCount {
  skill: string;
  count: number;
}

export interface RankingWeights {
  skills: number;
  experience: number;
  projects: number;
  ats: number;
  education: number;
  semantic: number;
  achievements: number;
}

export interface BatchAnalytics {
  total: number;
  succeeded: number;
  failed: number;
  average_score: number;
  average_years_experience: number;
  top_candidate_name: string;
  top_candidate_score: number;
  top_skills: SkillCount[];
  common_missing_skills: SkillCount[];
  score_distribution: Record<string, number>;
  recommendation_distribution: Record<string, number>;
}

export interface BatchAnalysisResponse {
  analysis_version: string;
  job_description: string;
  weights: RankingWeights;
  candidates: CandidateResult[];
  analytics: BatchAnalytics;
}
