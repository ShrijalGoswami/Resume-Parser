// Types mirroring the backend interview schemas (app/schemas/interview.py).
import type { CopilotSource } from '@/types/copilot';

export interface ExecutiveCandidateSummary {
  who: string;
  why_shortlisted: string;
  key_differentiators: string[];
}

export interface InterviewStage {
  name: string;
  duration_minutes: number;
  focus: string;
}

export interface InterviewStrategy {
  recommended_duration_minutes: number;
  stages: InterviewStage[];
  priority_focus_areas: string[];
  suggested_interviewer_profile: string;
}

export interface TechnicalQuestion {
  question: string;
  skill: string;
  difficulty: string; // Easy | Medium | Hard | Expert
  reason: string;
  expected_answer: string;
  red_flags: string[];
  followups: string[];
  evaluation_criteria: string[];
}

export interface BehavioralQuestion {
  question: string;
  competency: string;
  reason: string;
  expected_answer: string;
  warning_signs: string[];
}

export interface SkillVerification {
  skill: string;
  verification_method: string;
  hands_on_exercise: string;
  discussion_topic: string;
  confidence_level: string;
}

export interface InterviewRisk {
  category: string;
  detail: string;
  how_to_investigate: string;
}

export interface ScorecardCategory {
  category: string;
  weight: number;
  suggested_focus: string;
  notes: string;
}

export interface FinalInterviewRecommendation {
  recommendation: string; // Strong Hire | Hire | Borderline | No Hire
  reasoning: string;
  uncertainty: string;
}

export interface InterviewPack {
  executive_summary: ExecutiveCandidateSummary;
  interview_strategy: InterviewStrategy;
  technical_questions: TechnicalQuestion[];
  behavioral_questions: BehavioralQuestion[];
  skill_verifications: SkillVerification[];
  risks: InterviewRisk[];
  scorecard: ScorecardCategory[];
  final_recommendation: FinalInterviewRecommendation;
  candidate_id: string;
  candidate_name: string;
  campaign_id: string;
  focus: string;
  sources_used: CopilotSource[];
  degraded: boolean;
}

export interface InterviewGenerateRequest {
  focus?: string;
  instruction?: string;
  sections?: string[] | null;
}
