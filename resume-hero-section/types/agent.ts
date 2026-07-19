// Types mirroring the backend agent schemas (app/schemas/agent.py).

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'dismissed' | 'executed';

export interface Recommendation {
  id: string;
  workflow: string;
  dedupe_key: string;
  category: string; // action | urgent | campaign_risk | candidate_alert
  severity: string; // urgent | high | medium | low
  confidence: number;
  title: string;
  why: string;
  evidence: string[];
  data_sources: string[];
  tools_used: string[];
  recommended_action: string;
  suggested_tool: string;
  tool_params: Record<string, unknown>;
  campaign_id: string | null;
  campaign_title: string | null;
  candidate_id: string | null;
  candidate_name: string | null;
  status: ApprovalStatus;
  created_at: string | null;
  updated_at: string | null;
}

export interface AgentBriefing {
  headline: string;
  priorities: string[];
  summary: string;
}

export interface AgentScanResponse {
  generated: number;
  total_open: number;
  recommendations: Recommendation[];
  briefing: AgentBriefing | null;
}
