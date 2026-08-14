// Types mirroring the backend prediction layer.

export interface Factor { name: string; impact: string; detail: string }

export interface Forecast {
  type: string;
  target: string;
  unit: string; // probability | count | currency | index
  probability: number;
  value: number | null;
  confidence: number;
  summary: string;
  evidence: string[];
  factors: Factor[];
  historical_comparison: string;
  alternatives: Record<string, unknown>;
}

export interface SimResult {
  forecast_type: string;
  levers: Record<string, number>;
  baseline: Forecast;
  scenario: Forecast;
  delta: number;
  direction: string;
  summary: string;
}

export interface Twin {
  total_campaigns: number;
  active_campaigns: number;
  total_candidates: number;
  analyzed_candidates: number;
  high_quality: number;
  average_match: number;
  recruiter_count: number;
  offer_conversion: number;
  interview_pass_rate: number;
  analyzed_ratio: number;
  velocity_days: number;
  throughput_per_recruiter: number;
  funnel: Record<string, number>;
  skill_shortages: Array<{ skill: string; count: number }>;
  campaigns: Array<{ id: string; title: string; status: string; days_since_activity: number | null }>;
}
