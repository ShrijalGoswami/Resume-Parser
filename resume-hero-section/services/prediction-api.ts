/** Predictive Intelligence API client (V8). Authenticated + organization-scoped. */
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Forecast, SimResult, Twin } from '@/types/prediction';

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
  return res.json() as Promise<T>;
}

export const getForecasts = () => api<Forecast[]>('/prediction/forecasts');
export const getTwin = () => api<Twin>('/prediction/twin');
export const getTypes = () => api<{ forecast_types: string[]; scenarios: Record<string, string> }>('/prediction/types');
export const runForecast = (forecast_type: string, params: Record<string, unknown> = {}) =>
  api<Forecast>('/prediction/forecast', { method: 'POST', body: JSON.stringify({ forecast_type, params }) });
export const simulate = (forecast_type: string, levers: Record<string, number>, params: Record<string, unknown> = {}) =>
  api<SimResult>('/prediction/simulate', { method: 'POST', body: JSON.stringify({ forecast_type, levers, params }) });
export const getHistory = () => api<Array<{ id: string; forecast_type: string; probability: number | null; value: number | null; confidence: number; created_at: string }>>('/prediction/history');
