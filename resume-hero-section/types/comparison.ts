// Types mirroring the backend comparison schemas (app/schemas/comparison.py).
import type { CopilotSource } from '@/types/copilot';

export interface ExecutiveSummary {
  overall_recommendation: string;
  hiring_confidence: number;
  best_candidate_id: string;
  best_candidate_name: string;
  runner_up_id: string;
  runner_up_name: string;
  comparison_confidence: number;
  summary: string;
}

export interface RankingRow {
  candidate_id: string;
  name: string;
  rank: number;
  overall_score: number;
  ai_match: number;
  ats_score: number;
  experience_summary: string;
  strength_summary: string;
  weakness_summary: string;
}

export interface SkillMatrixRow {
  candidate_id: string;
  name: string;
  required_skills: string[];
  preferred_skills: string[];
  missing_skills: string[];
  unique_skills: string[];
  transferable_skills: string[];
}

export interface StrengthProfile {
  candidate_id: string;
  name: string;
  technical_strengths: string[];
  domain_strengths: string[];
  communication_indicators: string[];
  leadership_indicators: string[];
}

export interface RiskItem {
  category: string;
  detail: string;
}

export interface RiskProfile {
  candidate_id: string;
  name: string;
  risks: RiskItem[];
}

export interface HiringVerdict {
  candidate_id: string;
  name: string;
  recommendation: string;
  rationale: string;
}

export interface InterviewFocus {
  candidate_id: string;
  name: string;
  technical_topics: string[];
  behavioral_topics: string[];
  weak_areas_to_verify: string[];
  suggested_questions: string[];
}

export interface TradeoffScenario {
  scenario: string;
  choose_candidate_id: string;
  choose_name: string;
  reasoning: string;
}

export interface ComparedCandidate {
  candidate_id: string;
  name: string;
}

export interface CandidateComparisonReport {
  executive_summary: ExecutiveSummary;
  rankings: RankingRow[];
  skill_matrix: SkillMatrixRow[];
  strengths: StrengthProfile[];
  risks: RiskProfile[];
  hiring_recommendations: HiringVerdict[];
  interview_focus: InterviewFocus[];
  tradeoffs: TradeoffScenario[];
  campaign_id: string;
  candidates: ComparedCandidate[];
  sources_used: CopilotSource[];
  degraded: boolean;
}
