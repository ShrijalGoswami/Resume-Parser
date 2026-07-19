/** Organizational Knowledge API client (V7). Authenticated + organization-scoped. */
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { GraphResult, MemoryHit, MemoryItem, Preferences, SkillEvolution, TimelineBucket } from '@/types/knowledge';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const V1 = `${API_BASE_URL}/api/v1`;

async function authHeaders(): Promise<Record<string, string>> {
  const supabase = getSupabaseBrowserClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Not authenticated');
  return { Authorization: `Bearer ${session.access_token}` };
}
async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...(await authHeaders()), ...(init.body ? { 'Content-Type': 'application/json' } : {}) };
  const res = await fetch(`${V1}${path}`, { ...init, headers });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || `Request failed: ${res.status}`); }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const getMemory = (kind?: string, source?: string) =>
  api<MemoryItem[]>(`/knowledge/memory${kind ? `?kind=${kind}` : source ? `?source=${source}` : ''}`);
export const retrieveMemory = (query: string) => api<MemoryHit[]>('/knowledge/retrieve', { method: 'POST', body: JSON.stringify({ query, limit: 8 }) });
export const getTimeline = (months = 6) => api<TimelineBucket[]>(`/knowledge/timeline?months=${months}`);
export const getSkillEvolution = () => api<SkillEvolution[]>('/knowledge/skill-evolution');
export const getPreferences = () => api<Preferences>('/knowledge/preferences');
export const getGraph = (entity: string, depth = 2) => api<GraphResult>(`/knowledge/graph?entity=${encodeURIComponent(entity)}&depth=${depth}`);
export const getSources = () => api<Record<string, number>>('/knowledge/sources');
export const invalidateItem = (id: string) => api(`/knowledge/items/${id}/invalidate`, { method: 'POST' });
