/**
 * Recruiter Copilot API client (V5).
 *
 * Authenticated, persisted conversations. Every request attaches the recruiter's
 * Supabase access token as a Bearer header; the backend resolves grounded context
 * from the recruiter's own data and enforces per-recruiter isolation (RLS).
 *
 * The stateless `/copilot/chat` endpoint remains in `services/api.ts`.
 */
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type {
  Conversation,
  ConversationMessagePublic,
  CopilotPageContext,
  PostMessageResponse,
  SuggestionGroup,
} from '@/types/copilot';

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

// ── Conversations ────────────────────────────────────────────────────────────
export const listConversations = () =>
  apiFetch<Conversation[]>('/copilot/conversations');

export const createConversation = (context: CopilotPageContext, title = 'New conversation') =>
  apiFetch<Conversation>('/copilot/conversations', {
    method: 'POST',
    body: JSON.stringify({ title, context }),
  });

export const renameConversation = (id: string, title: string) =>
  apiFetch<Conversation>(`/copilot/conversations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ title }),
  });

export const deleteConversation = (id: string) =>
  apiFetch<void>(`/copilot/conversations/${id}`, { method: 'DELETE' });

export const listMessages = (id: string) =>
  apiFetch<ConversationMessagePublic[]>(`/copilot/conversations/${id}/messages`);

export const postMessage = (id: string, message: string, context: CopilotPageContext) =>
  apiFetch<PostMessageResponse>(`/copilot/conversations/${id}/messages`, {
    method: 'POST',
    body: JSON.stringify({ message, context }),
  });

// ── Suggestions (shared with the stateless copilot) ───────────────────────────
export const fetchCopilotSuggestions = async (): Promise<SuggestionGroup[]> => {
  const res = await fetch(`${V1}/copilot/suggestions`);
  if (!res.ok) throw new Error('Failed to load suggestions');
  const data = await res.json();
  return data.groups ?? [];
};
