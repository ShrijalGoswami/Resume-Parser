/**
 * AI Candidate Comparison API client (V5).
 *
 * Authenticated: attaches the recruiter's Supabase access token. The backend
 * validates that every candidate belongs to the recruiter's campaign.
 */
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { CandidateComparisonReport } from '@/types/comparison';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const V1 = `${API_BASE_URL}/api/v1`;

async function authHeaders(): Promise<Record<string, string>> {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Not authenticated');
  return { Authorization: `Bearer ${session.access_token}` };
}

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
    throw new Error(err.detail || `Comparison failed: ${res.status}`);
  }
  return res.json() as Promise<CandidateComparisonReport>;
}
