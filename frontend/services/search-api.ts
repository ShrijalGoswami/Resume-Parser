/**
 * Semantic Talent Search API client (V5).
 *
 * Authenticated: attaches the recruiter's Supabase access token. Retrieval is
 * embedding-based on the backend (no LLM); results are recruiter-scoped.
 */
import type { SearchFilters, TalentSearchResponse } from '@/types/search';
import { authHeaders, V1 } from './auth-headers';
import { apiErrorFrom } from '@/lib/api-error';

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${V1}${path}`, {
    method: 'POST',
    headers: { ...(await authHeaders()), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw apiErrorFrom(res.status, err);
  }
  return res.json() as Promise<T>;
}

export function searchTalent(
  query: string,
  opts: { campaignId?: string | null; limit?: number; filters?: SearchFilters } = {},
): Promise<TalentSearchResponse> {
  return post<TalentSearchResponse>('/search/talent', {
    query,
    campaign_id: opts.campaignId ?? null,
    limit: opts.limit ?? 12,
    filters: opts.filters ?? null,
  });
}

export function searchSimilar(
  candidateId: string,
  opts: { campaignId?: string | null; limit?: number } = {},
): Promise<TalentSearchResponse> {
  return post<TalentSearchResponse>('/search/similar', {
    candidate_id: candidateId,
    campaign_id: opts.campaignId ?? null,
    limit: opts.limit ?? 12,
  });
}

export function reindexCampaign(campaignId: string, force = false): Promise<{ indexed: number; considered: number; total: number }> {
  return post(`/campaigns/${campaignId}/embeddings/reindex${force ? '?force=true' : ''}`, {});
}
