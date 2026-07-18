/** Types mirroring the backend persistence schemas (schemas/campaign.py). */

export type CampaignStatus = 'draft' | 'active' | 'paused' | 'archived';

export type PipelineStage =
  | 'sourced'
  | 'screening'
  | 'shortlisted'
  | 'interview'
  | 'offer'
  | 'hired'
  | 'rejected';

export interface RankingWeights {
  skills: number;
  experience: number;
  projects: number;
  ats: number;
  education: number;
  semantic: number;
  achievements: number;
}

export interface Campaign {
  id: string;
  recruiter_id: string;
  title: string;
  company?: string | null;
  role_title?: string | null;
  department?: string | null;
  location?: string | null;
  employment_type?: string | null;
  job_description: string;
  jd_storage_path?: string | null;
  ranking_weights: Record<string, number>;
  status: CampaignStatus;
  metadata: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
  candidate_count?: number | null;
  // Dashboard aggregates (hydrated by GET /campaigns).
  total_candidates?: number | null;
  awaiting_analysis?: number | null;
  average_match_score?: number | null;
  last_activity_at?: string | null;
}

export interface CampaignCreateInput {
  title: string;
  company?: string;
  role_title?: string;
  department?: string;
  location?: string;
  employment_type?: string;
  job_description?: string;
  status?: CampaignStatus;
  ranking_weights?: RankingWeights;
}

export type CampaignUpdateInput = Partial<CampaignCreateInput>;

export interface Candidate {
  id: string;
  campaign_id: string;
  recruiter_id: string;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  resume_path?: string | null;
  resume_filename?: string | null;
  source_batch_id?: string | null;
  stage: PipelineStage;
  is_favorite: boolean;
  metadata: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
  latest_analysis?: Record<string, unknown> | null;
}

export interface RecruiterNote {
  id: string;
  candidate_id: string;
  campaign_id: string;
  recruiter_id: string;
  body: string;
  pinned: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface RecruiterProfile {
  id: string;
  email: string;
  full_name?: string | null;
  company?: string | null;
  job_title?: string | null;
  avatar_url?: string | null;
  onboarded: boolean;
}

export interface ActivityEvent {
  id: string;
  recruiter_id: string;
  campaign_id?: string | null;
  candidate_id?: string | null;
  type: string;
  summary: string;
  payload: Record<string, unknown>;
  created_at?: string;
}
