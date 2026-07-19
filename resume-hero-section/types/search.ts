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

export interface TalentSearchResponse {
  query: string;
  provider: string;
  count: number;
  indexed: number;
  results: SearchResultItem[];
}

export interface SavedSearch {
  id: string;
  query: string;
  campaignId: string | null;
}
