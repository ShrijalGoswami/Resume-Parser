import { getSupabaseBrowserClient } from '@/lib/supabase/client';

/**
 * The single source of the authenticated request header.
 *
 * Every `services/*-api.ts` client (and the V4 activity client) previously
 * carried a byte-identical private copy of this function — thirteen of them. A
 * duplicated auth helper is the wrong thing to duplicate: a change to how the
 * token is read, refreshed, or reported has to land in one place, or some
 * surfaces silently keep the old behaviour.
 *
 * Throws when there is no session rather than sending an unauthenticated
 * request, so a signed-out caller fails fast at the client instead of getting a
 * 401 back from the API.
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
export const V1 = `${API_BASE_URL}/api/v1`;

export async function authHeaders(): Promise<Record<string, string>> {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Not authenticated');
  return { Authorization: `Bearer ${session.access_token}` };
}
