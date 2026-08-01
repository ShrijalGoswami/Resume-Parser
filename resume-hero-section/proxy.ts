/**
 * Next.js proxy (formerly `middleware.ts`) — refreshes the Supabase session
 * cookie on every request and guards protected routes. The routing DECISION is a
 * pure function (`resolveMiddlewareAction` in lib/auth-routing) so the security
 * logic is unit-tested in isolation; this file only wires it to Supabase + Next.
 *
 * Legacy protected routes → /login; V4 (hirelens) protected routes → /auth/login.
 * If Supabase env vars are absent (stateless mode), this is a no-op so the
 * existing public app keeps working.
 *
 * In development only, the first request after a server restart has its Supabase
 * session cookies cleared so each dev run starts signed out — see
 * lib/dev-session-reset. Production takes none of those branches.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { resolveMiddlewareAction } from '@/lib/auth-routing';
import {
  DEV_BOOT_COOKIE,
  getDevBootId,
  isDevSessionResetEnabled,
  isStaleDevRequest,
  isSupabaseSessionCookie,
} from '@/lib/dev-session-reset';

type CookieToSet = { name: string; value: string; options?: CookieOptions };

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Stateless mode: no auth configured → let everything through.
  if (!url || !anonKey) return NextResponse.next();

  // Dev-only: drop a session carried over from a previous server run. Applied to
  // `request.cookies` before the Supabase client reads them, so `getUser()` below
  // sees an anonymous request and the normal guards send the user to sign in.
  const staleDevRequest =
    isDevSessionResetEnabled() &&
    isStaleDevRequest(request.cookies.get(DEV_BOOT_COOKIE)?.value);

  // Names captured BEFORE the delete below — the response still has to expire
  // them in the browser, and by then they are gone from `request.cookies`.
  const clearedCookieNames = staleDevRequest
    ? request.cookies
        .getAll()
        .map((c) => c.name)
        .filter(isSupabaseSessionCookie)
    : [];

  if (staleDevRequest) {
    for (const name of clearedCookieNames) request.cookies.delete(name);
  }

  // Expiring those cookies on whichever response we return is what makes the
  // browser forget them; the redirect branch builds its own response, so this is
  // applied at both exits.
  const applyDevSessionReset = (res: NextResponse) => {
    if (!staleDevRequest) return res;
    for (const name of clearedCookieNames) {
      res.cookies.set(name, '', { path: '/', maxAge: 0 });
    }
    res.cookies.set(DEV_BOOT_COOKIE, getDevBootId(), { path: '/', sameSite: 'lax' });
    return res;
  };

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // IMPORTANT: getUser() revalidates the token with Supabase Auth. Skipped when
  // the dev reset already emptied the cookie jar — there is nothing to validate.
  const user = staleDevRequest ? null : (await supabase.auth.getUser()).data.user;

  const path = request.nextUrl.pathname;
  const action = resolveMiddlewareAction(path, Boolean(user));

  if (action.kind === 'redirect') {
    const redirect = request.nextUrl.clone();
    redirect.pathname = action.pathname;
    redirect.search = '';
    if (action.withNext) redirect.searchParams.set('next', path);
    return applyDevSessionReset(NextResponse.redirect(redirect));
  }

  return applyDevSessionReset(response);
}

export const config = {
  matcher: [
    // Run on everything except static assets and images.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
