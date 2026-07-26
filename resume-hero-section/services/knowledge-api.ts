/** Organizational Knowledge API client (V7). Authenticated + organization-scoped. */
import type { GraphResult, MemoryHit, MemoryItem, Preferences, SkillEvolution, TimelineBucket } from '@/types/knowledge';
import { authHeaders, V1 } from './auth-headers';

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
