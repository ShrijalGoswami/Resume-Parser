/**
 * Browser Supabase client (singleton).
 *
 * Used in Client Components for auth (sign in/up/out) and for reading the
 * current session/access token. RLS is enforced server-side, so the anon key
 * here is safe to expose.
 */
import { createBrowserClient } from '@supabase/ssr';

let cached: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowserClient() {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      'Supabase env not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
  }
  cached = createBrowserClient(url, anonKey);
  return cached;
}

/** True when Supabase env vars are present (used to gate auth UI gracefully). */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
