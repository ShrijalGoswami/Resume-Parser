// Types mirroring the backend report schemas (app/schemas/report.py).
import type { CopilotSource } from '@/types/copilot';

export interface ReportMetrics {
  total_campaigns: number;
  active_campaigns: number;
  total_candidates: number;
  analyzed_candidates: number;
  awaiting_analysis: number;
  average_match_score: number | null;
  average_ats_score: number | null;
  high_quality_candidates: number;
}

export interface CampaignSnapshot {
  campaign_id: string;
  title: string;
  status: string;
  role_title: string;
  total_candidates: number;
  awaiting_analysis: number;
  average_match_score: number | null;
  days_since_activity: number | null;
}

export interface ProductivityMetrics {
  resumes_uploaded: number;
  candidates_analyzed: number;
  comparisons_run: number;
  interview_packs_generated: number;
  copilot_messages: number;
  stage_changes: number;
  notes_added: number;
}

export interface SkillCount {
  skill: string;
  count: number;
}

export interface TalentSnapshot {
  top_technologies: SkillCount[];
  common_missing_skills: SkillCount[];
  match_distribution: { range?: string; count: number }[];
  ats_distribution: { range?: string; count: number }[];
  experience_distribution: { range?: string; count: number }[];
  hiring_funnel: { stage?: string; count: number }[];
}

export interface ExecutiveSummaryNarrative {
  headline: string;
  pipeline_health: string;
  whats_changed: string[];
  blockers: string[];
  immediate_attention: string[];
}

export interface CampaignInsight {
  campaign_id: string;
  title: string;
  headline: string;
  explanation: string;
  concerns: string[];
}

export interface SkillGapAnalysis {
  summary: string;
  emerging_demand: string[];
  oversaturated: string[];
  hard_to_fill_roles: string[];
}

export interface HiringRisk {
  category: string;
  evidence: string;
  impact: string;
  suggested_action: string;
}

export interface ExecRecommendation {
  priority: string;
  title: string;
  rationale: string;
  evidence: string;
}

export interface ExecutiveReport {
  executive_summary: ExecutiveSummaryNarrative;
  campaign_insights: CampaignInsight[];
  productivity_recommendations: string[];
  skill_gap_analysis: SkillGapAnalysis;
  hiring_risks: HiringRisk[];
  recommendations: ExecRecommendation[];
  period: string;
  metrics: ReportMetrics;
  campaigns: CampaignSnapshot[];
  productivity: ProductivityMetrics;
  talent_snapshot: TalentSnapshot;
  sources_used: CopilotSource[];
  degraded: boolean;
}

export interface ExecutiveReportRequest {
  focus?: string;
  instruction?: string;
  sections?: string[] | null;
}
