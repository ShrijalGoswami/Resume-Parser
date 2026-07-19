/**
 * Organization / enterprise API client (V6).
 *
 * Authenticated; every call is organization-scoped and RBAC-enforced on the
 * backend. The frontend never trusts its own authorization — the server decides.
 */
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type {
  ApiKey, AuditLog, OrgContext, OrgMember, Organization, Subscription, UsageCounter, Workspace,
} from '@/types/org';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const V1 = `${API_BASE_URL}/api/v1`;

async function authHeaders(): Promise<Record<string, string>> {
  const supabase = getSupabaseBrowserClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Not authenticated');
  return { Authorization: `Bearer ${session.access_token}` };
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(await authHeaders()),
    ...(init.body ? { 'Content-Type': 'application/json' } : {}),
  };
  const res = await fetch(`${V1}${path}`, { ...init, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const getOrgContext = () => api<OrgContext>('/org/context');
export const getOrganization = () => api<Organization>('/org');
export const updateOrganization = (patch: { name?: string; settings?: Record<string, unknown> }) =>
  api<Organization>('/org', { method: 'PATCH', body: JSON.stringify(patch) });

export const listWorkspaces = () => api<Workspace[]>('/org/workspaces');
export const createWorkspace = (name: string, description = '') =>
  api<Workspace>('/org/workspaces', { method: 'POST', body: JSON.stringify({ name, description }) });
export const switchWorkspace = (workspace_id: string) =>
  api<{ active_workspace_id: string }>('/org/switch-workspace', { method: 'POST', body: JSON.stringify({ workspace_id }) });

export const listMembers = () => api<OrgMember[]>('/org/members');
export const inviteMember = (email: string, role: string) =>
  api<OrgMember>('/org/members', { method: 'POST', body: JSON.stringify({ email, role }) });
export const setMemberRole = (id: string, role: string) =>
  api<OrgMember>(`/org/members/${id}`, { method: 'PATCH', body: JSON.stringify({ role }) });
export const removeMember = (id: string) => api<void>(`/org/members/${id}`, { method: 'DELETE' });

export const getRoles = () => api<Record<string, string[]>>('/org/roles');

export const getFeatureFlags = () =>
  api<{ features: string[]; resolved: Record<string, boolean>; overrides: Record<string, boolean> }>('/org/feature-flags');
export const setFeatureFlag = (flag: string, enabled: boolean) =>
  api('/org/feature-flags', { method: 'PUT', body: JSON.stringify({ flag, enabled }) });

export const getUsage = () => api<{ period: string | null; metrics: UsageCounter[] }>('/org/usage');
export const getAuditLogs = (action?: string) =>
  api<AuditLog[]>(`/org/audit-logs${action ? `?action=${encodeURIComponent(action)}` : ''}`);

export const getSubscription = () => api<Subscription>('/org/subscription');
export const updateSubscription = (plan: string) =>
  api<Subscription>('/org/subscription', { method: 'PATCH', body: JSON.stringify({ plan }) });

export const listApiKeys = () => api<ApiKey[]>('/org/api-keys');
export const createApiKey = (name: string, scope: string) =>
  api<{ key: ApiKey; secret: string }>('/org/api-keys', { method: 'POST', body: JSON.stringify({ name, scope }) });
export const revokeApiKey = (id: string) => api<void>(`/org/api-keys/${id}`, { method: 'DELETE' });
