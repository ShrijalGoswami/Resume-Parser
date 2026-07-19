/**
 * Interview Intelligence API client (V5).
 *
 * Authenticated: attaches the recruiter's Supabase access token. The backend
 * validates that the candidate belongs to the recruiter's campaign.
 */
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { InterviewGenerateRequest, InterviewPack } from '@/types/interview';

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
    throw new Error(err.detail || `Interview generation failed: ${res.status}`);
  }
  return res.json() as Promise<InterviewPack>;
}
