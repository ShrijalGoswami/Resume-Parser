export interface ResumeAnalysisResponse {
  name: string;
  email: string | null;
  phone: string | null;
  education: Array<{
    degree: string;
    institution: string;
    graduation_year: string | null;
  }>;
  experience: Array<{
    role: string;
    company: string;
    duration: string | null;
  }>;
  skills: string[];
  projects: Array<{
    name: string;
    description: string;
  }>;
  ats_score: number;
  ats_tips: string[];
}

export interface MatchAnalysisResponse {
  analysis_version: string;
  job_match_score: number;
  match_category: string;
  matching_skills: string[];
  missing_skills: string[];
  experience_relevance: string;
  relevant_projects: string[];
  less_relevant_projects: string[];
  candidate_strengths: string[];
  areas_for_improvement: string[];
  hiring_recommendation: string;
  recommendation_explanation: string;
}

export interface CombinedMatchResponse {
  resume_data: ResumeAnalysisResponse;
  match_analysis: MatchAnalysisResponse;
}
