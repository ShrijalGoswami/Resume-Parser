/**
 * Campaign / persistence API client (V4).
 *
 * All requests attach the recruiter's Supabase access token as a Bearer header;
 * the backend verifies it and enforces per-recruiter isolation. Kept separate
 * from the existing stateless `services/api.ts` so the public AI endpoints stay
 * exactly as they were.
 */
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { BatchAnalysisResponse } from '@/types/batch';
import type {
  Campaign,
  CampaignCreateInput,
  CampaignUpdateInput,
  Candidate,
  RecruiterNote,
  RecruiterProfile,
  ActivityEvent,
} from '@/types/campaign';

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

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(await authHeaders()),
    ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    ...((init.headers as Record<string, string>) ?? {}),
  };
  const res = await fetch(`${V1}${path}`, { ...init, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ── Profile ──────────────────────────────────────────────────────────────────
export const getProfile = () => apiFetch<RecruiterProfile>('/me');
export const updateProfile = (patch: Partial<RecruiterProfile>) =>
  apiFetch<RecruiterProfile>('/me', { method: 'PATCH', body: JSON.stringify(patch) });

// ── Campaigns ────────────────────────────────────────────────────────────────
export const listCampaigns = (status?: string) =>
  apiFetch<Campaign[]>(`/campaigns${status ? `?status=${status}` : ''}`);

export const getCampaign = (id: string) => apiFetch<Campaign>(`/campaigns/${id}`);

export const createCampaign = (input: CampaignCreateInput) =>
  apiFetch<Campaign>('/campaigns', { method: 'POST', body: JSON.stringify(input) });

export const updateCampaign = (id: string, patch: CampaignUpdateInput) =>
  apiFetch<Campaign>(`/campaigns/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });

export const deleteCampaign = (id: string) =>
  apiFetch<void>(`/campaigns/${id}`, { method: 'DELETE' });

// ── Candidates ───────────────────────────────────────────────────────────────
export const listCandidates = (campaignId: string) =>
  apiFetch<Candidate[]>(`/campaigns/${campaignId}/candidates`);

export const getCandidate = (campaignId: string, candidateId: string) =>
  apiFetch<Candidate>(`/campaigns/${campaignId}/candidates/${candidateId}`);

export const updateCandidateStage = (campaignId: string, candidateId: string, stage: string) =>
  apiFetch<Candidate>(`/campaigns/${campaignId}/candidates/${candidateId}/stage`, {
    method: 'PATCH',
    body: JSON.stringify({ stage }),
  });

export const bulkDeleteCandidates = (campaignId: string, candidateIds: string[]) =>
  apiFetch<{ deleted: number }>(`/campaigns/${campaignId}/candidates/bulk-delete`, {
    method: 'POST',
    body: JSON.stringify({ candidate_ids: candidateIds }),
  });

export const getResumeUrl = (campaignId: string, candidateId: string) =>
  apiFetch<{ url: string; expires_in: number }>(
    `/campaigns/${campaignId}/candidates/${candidateId}/resume-url`
  );

// ── Notes ────────────────────────────────────────────────────────────────────
export const listNotes = (campaignId: string, candidateId: string) =>
  apiFetch<RecruiterNote[]>(`/campaigns/${campaignId}/candidates/${candidateId}/notes`);

export const createNote = (campaignId: string, candidateId: string, body: string) =>
  apiFetch<RecruiterNote>(`/campaigns/${campaignId}/candidates/${candidateId}/notes`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  });

export const deleteNote = (campaignId: string, candidateId: string, noteId: string) =>
  apiFetch<void>(`/campaigns/${campaignId}/candidates/${candidateId}/notes/${noteId}`, {
    method: 'DELETE',
  });

export const candidateActivity = (campaignId: string, candidateId: string) =>
  apiFetch<ActivityEvent[]>(`/campaigns/${campaignId}/candidates/${candidateId}/activity`);

// ── Persistence: store a completed batch under a campaign ────────────────────
export const persistBatch = (campaignId: string, batch: BatchAnalysisResponse) =>
  apiFetch<Candidate[]>(`/campaigns/${campaignId}/persist-batch`, {
    method: 'POST',
    body: JSON.stringify(batch),
  });

// ── Activity ─────────────────────────────────────────────────────────────────
export const campaignActivity = (campaignId: string) =>
  apiFetch<ActivityEvent[]>(`/campaigns/${campaignId}/activity`);

// ── Analytics ────────────────────────────────────────────────────────────────
export const getAnalyticsOverview = (threshold = 80) =>
  apiFetch<import('@/types/analytics').AnalyticsOverview>(`/analytics/overview?threshold=${threshold}`);
