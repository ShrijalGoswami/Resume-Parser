/**
 * Recruiter Copilot API client (V5).
 *
 * Authenticated, persisted conversations. Every request attaches the recruiter's
 * Supabase access token as a Bearer header; the backend resolves grounded context
 * from the recruiter's own data and enforces per-recruiter isolation (RLS).
 *
 * The stateless `/copilot/chat` endpoint remains in `services/api.ts`.
 */
import type {
  Conversation,
  ConversationMessagePublic,
  CopilotPageContext,
  PostMessageResponse,
  SuggestionGroup,
} from '@/types/copilot';
import { authHeaders, V1 } from './auth-headers';

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
/**
 * Goes through `apiFetch` for the Bearer token like every other call here.
 *
 * It used to call `fetch` bare, which was correct while `/copilot/suggestions`
 * was public. The RBAC sweep put `dependencies=[RequireAiUse]` on it, and an
 * unauthenticated request answers 401 for everyone — so Ask silently served its
 * hardcoded `ASK_EXAMPLES` fallback instead of the real suggestions, looking
 * like a working screen the whole time. Found by reading the access log during
 * the manual pass; nothing on screen said anything was wrong.
 */
export const fetchCopilotSuggestions = async (): Promise<SuggestionGroup[]> => {
  const data = await apiFetch<{ groups?: SuggestionGroup[] }>('/copilot/suggestions');
  return data.groups ?? [];
};
