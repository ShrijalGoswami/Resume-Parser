/**
 * Autonomous Recruiting Agent API client (V5).
 *
 * Authenticated + recruiter-scoped. The agent only produces recommendations that
 * require human approval — it never modifies production data.
 */
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { ApiError } from '@/lib/api-error';
import type { AgentScanResponse, ApprovalStatus, Recommendation } from '@/types/agent';

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

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(await authHeaders()),
    ...(init.body ? { 'Content-Type': 'application/json' } : {}),
  };
  const res = await fetch(`${V1}${path}`, { ...init, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(res.status, err.detail || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const scanAgent = () =>
  req<AgentScanResponse>('/agent/scan', { method: 'POST', body: JSON.stringify({}) });

export const listRecommendations = (status?: string) =>
  req<Recommendation[]>(`/agent/recommendations${status ? `?status=${status}` : ''}`);

export const updateRecommendation = (id: string, status: ApprovalStatus) =>
  req<Recommendation>(`/agent/recommendations/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
