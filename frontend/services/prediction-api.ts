/** Predictive Intelligence API client (V8). Authenticated + organization-scoped. */
import type { Forecast, SimResult, Twin } from '@/types/prediction';
import { authHeaders, V1 } from './auth-headers';

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
