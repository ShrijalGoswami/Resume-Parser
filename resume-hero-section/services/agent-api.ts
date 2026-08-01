/**
 * Autonomous Recruiting Agent API client (V5).
 *
 * Authenticated + recruiter-scoped. The agent only produces recommendations that
 * require human approval — it never modifies production data.
 */
import { apiErrorFrom } from '@/lib/api-error';
import type { AgentScanResponse, ApprovalStatus, Recommendation } from '@/types/agent';
import { authHeaders, V1 } from './auth-headers';

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(await authHeaders()),
    ...(init.body ? { 'Content-Type': 'application/json' } : {}),
  };
  const res = await fetch(`${V1}${path}`, { ...init, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw apiErrorFrom(res.status, err);
  }
  return res.json() as Promise<T>;
}

export const scanAgent = () =>
  req<AgentScanResponse>('/agent/scan', { method: 'POST', body: JSON.stringify({}) });

export const listRecommendations = (status?: string) =>
  req<Recommendation[]>(`/agent/recommendations${status ? `?status=${status}` : ''}`);

export const updateRecommendation = (id: string, status: ApprovalStatus) =>
  req<Recommendation>(`/agent/recommendations/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
