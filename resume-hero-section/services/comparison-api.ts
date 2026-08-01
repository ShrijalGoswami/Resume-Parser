/**
 * AI Candidate Comparison API client (V5).
 *
 * Authenticated: attaches the recruiter's Supabase access token. The backend
 * validates that every candidate belongs to the recruiter's campaign.
 */
import type { CandidateComparisonReport } from '@/types/comparison';
import { authHeaders, V1 } from './auth-headers';
import { apiErrorFrom } from '@/lib/api-error';

export async function compareCandidates(
  campaignId: string,
  candidateIds: string[],
): Promise<CandidateComparisonReport> {
  const res = await fetch(`${V1}/campaigns/${campaignId}/compare`, {
    method: 'POST',
    headers: { ...(await authHeaders()), 'Content-Type': 'application/json' },
    body: JSON.stringify({ candidate_ids: candidateIds }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw apiErrorFrom(res.status, err);
  }
  return res.json() as Promise<CandidateComparisonReport>;
}
