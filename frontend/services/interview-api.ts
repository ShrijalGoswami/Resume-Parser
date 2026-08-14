/**
 * Interview Intelligence API client (V5).
 *
 * Authenticated: attaches the recruiter's Supabase access token. The backend
 * validates that the candidate belongs to the recruiter's campaign.
 */
import type { InterviewGenerateRequest, InterviewPack } from '@/types/interview';
import { authHeaders, V1 } from './auth-headers';
import { apiErrorFrom } from '@/lib/api-error';

export async function generateInterview(
  campaignId: string,
  candidateId: string,
  body: InterviewGenerateRequest = {},
): Promise<InterviewPack> {
  const res = await fetch(`${V1}/campaigns/${campaignId}/candidates/${candidateId}/interview`, {
    method: 'POST',
    headers: { ...(await authHeaders()), 'Content-Type': 'application/json' },
    body: JSON.stringify({ focus: body.focus ?? 'blueprint', instruction: body.instruction ?? '', sections: body.sections ?? null }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw apiErrorFrom(res.status, err);
  }
  return res.json() as Promise<InterviewPack>;
}
