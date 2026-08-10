// Types mirroring the backend search schemas (app/schemas/search.py).

export interface SearchFilters {
  min_score?: number | null;
  min_experience?: number | null;
  location?: string | null;
}

export interface SearchResultItem {
  candidate_id: string;
  name: string;
  campaign_id: string | null;
  campaign_title: string | null;
  similarity: number; // 0–1
  overall_score: number | null;
  ats_score: number | null;
  years_experience: number | null;
  stage: string | null;
  matched_concepts: string[];
}

/** Cause of a lexical-only fallback. Stable strings, safe to switch on. */
export type SearchDegradedReason =
  | 'embedding_rate_limited'
  | 'embedding_timeout'
  | 'embedding_unconfigured'
  | 'embedding_unavailable';

export interface TalentSearchResponse {
  query: string;
  provider: string;
  count: number;
  indexed: number;
  results: SearchResultItem[];
  /**
   * True when the query could not be embedded and results were ranked by the
   * lexical half of the scorer alone. Results are still recruiter-scoped and
   * still filtered — they are just ranked worse, so surface this rather than
   * presenting them as semantic matches.
   */
  degraded?: boolean;
  degraded_reason?: SearchDegradedReason | null;
}

export interface SavedSearch {
  id: string;
  query: string;
  campaignId: string | null;
}
