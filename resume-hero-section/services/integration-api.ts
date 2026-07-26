/**
 * Integration Hub API client (V6). Authenticated + organization-scoped.
 * Provider secrets/credentials are never returned to the frontend.
 */
import type { AutomationRule, Connection, Execution, ProviderInfo, WorkflowStepT } from '@/types/integration';
import { authHeaders, V1 } from './auth-headers';

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...(await authHeaders()), ...(init.body ? { 'Content-Type': 'application/json' } : {}) };
  const res = await fetch(`${V1}${path}`, { ...init, headers });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || `Request failed: ${res.status}`); }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const listProviders = () => api<ProviderInfo[]>('/integrations/providers');
export const listConnections = () => api<Connection[]>('/integrations/connections');
export const listEvents = () => api<string[]>('/integrations/events');
export const getHealth = () => api<Array<{ provider: string; status: string; health: string }>>('/integrations/health');

export const connectProvider = (provider: string, redirectUri: string) =>
  api<{ authorize_url?: string; connected?: boolean; state?: string }>(`/integrations/${provider}/connect`, { method: 'POST', body: JSON.stringify({ redirect_uri: redirectUri }) });
export const disconnectProvider = (provider: string) => api<void>(`/integrations/${provider}/disconnect`, { method: 'POST' });
export const testProvider = (provider: string) => api<{ ok: boolean; detail: string; simulated: boolean }>(`/integrations/${provider}/test`, { method: 'POST' });

export const listRules = () => api<AutomationRule[]>('/integrations/rules');
export const createRule = (name: string, trigger_event: string, steps: WorkflowStepT[]) =>
  api<AutomationRule>('/integrations/rules', { method: 'POST', body: JSON.stringify({ name, trigger_event, steps, enabled: true }) });
export const updateRule = (id: string, patch: Partial<Pick<AutomationRule, 'enabled' | 'name' | 'trigger_event' | 'steps'>>) =>
  api<AutomationRule>(`/integrations/rules/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
export const deleteRule = (id: string) => api<void>(`/integrations/rules/${id}`, { method: 'DELETE' });

export const listExecutions = (status?: string) => api<Execution[]>(`/integrations/executions${status ? `?status_filter=${status}` : ''}`);
export const replayExecution = (id: string) => api<{ status: string }>(`/integrations/executions/${id}/replay`, { method: 'POST' });
export const emitEvent = (event: string) => api<{ triggered_rules: number }>(`/integrations/emit/${event}`, { method: 'POST' });
