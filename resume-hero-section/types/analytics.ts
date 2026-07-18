/** Types for the Executive Intelligence Dashboard (GET /analytics/overview). */
import type { ActivityEvent } from './campaign';

export interface SkillCount {
  skill: string;
  count: number;
}
export interface CandidateBrief {
  candidate_id: string;
  campaign_id: string | null;
  name: string;
  overall_score: number | null;
  ats_score: number | null;
  campaign_title: string | null;
}

export interface AnalyticsOverview {
  overview: {
    active_campaigns: number;
    total_campaigns: number;
    total_candidates: number;
    analyzed_candidates: number;
    awaiting_analysis: number;
    average_match_score: number | null;
    average_ats_score: number | null;
    high_quality_candidates: number;
    high_quality_threshold: number;
  };
  ai_insights: {
    strongest_candidate: CandidateBrief | null;
    highest_ats_candidate: CandidateBrief | null;
    common_missing_skills: SkillCount[];
    top_technologies: SkillCount[];
    candidates_requiring_review: CandidateBrief[];
    candidates_requiring_review_count: number;
    strongest_talent_pool: { campaign_id: string; campaign_title: string | null; average_score: number } | null;
  };
  charts: {
    hiring_funnel: { stage: string; count: number }[];
    match_distribution: { range: string; count: number }[];
    ats_distribution: { range: string; count: number }[];
    status_breakdown: { label: string; count: number }[];
    upload_trend: { date: string; count: number }[];
    top_skills: SkillCount[];
    experience_distribution: { range: string; count: number }[];
  };
  action_center: {
    awaiting_review: CandidateBrief[];
    awaiting_review_count: number;
    analyses_running: number;
    stale_active_campaigns: { campaign_id: string; title: string | null }[];
    stale_active_campaigns_count: number;
  };
  recent_activity: ActivityEvent[];
}
