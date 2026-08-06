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
  //
  // FAIL CLOSED IN PRODUCTION (A4). This branch exists so the public,
  // account-free app keeps working with no Supabase project attached, and that
  // is a configuration this product deliberately supports — locally. In
  // production the overwhelmingly likelier cause of a missing env var is that
  // someone forgot it, and the symptom is silent: every protected route renders
  // to anonymous visitors.
  //
  // The backend independently returns 401 on all of them, so no records follow.
  // That is defence in depth working, not a reason to leave the outer layer
  // open — the whole point of two layers is that neither is trusted to be the
  // only one.
  if (!url || !anonKey) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'Supabase environment variables are missing in production. ' +
          'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
          'Refusing to serve protected routes unauthenticated.'
      );
    }
    return NextResponse.next();
  }

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
    /**
     * Everything except static assets — AND except the public surface.
     *
     * WHY THE PUBLIC PAGES ARE EXCLUDED. This proxy calls
     * `supabase.auth.getUser()`, which is a network round trip to Supabase Auth,
     * on every request it matches. It used to match the marketing pages, the
     * policy pages and the agent files, none of which has a session to refresh.
     *
     * Measured: `/` took 102–186ms and `/terms` 51–160ms against 13ms for a
     * static asset — the difference being a round trip performed so that an
     * anonymous visitor could be found to be anonymous.
     *
     * Two things made it worth fixing rather than tolerating:
     *
     *   1. It is the crawl path. `/robots.txt`, `/sitemap.xml` and `/llms.txt`
     *      are the files an indexer hits first and most often, and they would
     *      have inherited an auth round trip apiece.
     *   2. It put Supabase in the serving path of a static marketing page. A
     *      Supabase incident would have slowed or failed the pages that explain
     *      what the product is — including, pointedly, the ones a customer would
     *      read while trying to find out whether the product was down.
     *
     * The excluded routes are exhaustively public: they render identically to
     * every visitor and none reads a session. `resolveMiddlewareAction` still
     * guards everything else, and the product routes are unchanged — this
     * removes work, not protection.
     */
    '/home/:path*',
    '/roles/:path*',
    '/talent/:path*',
    '/interviews/:path*',
    '/ask/:path*',
    '/analytics/:path*',
    '/ledger/:path*',
    '/learning/:path*',
    '/notifications/:path*',
    '/settings/:path*',
    '/foundations/:path*',
    // Every `/auth/*` page, not only the two that bounce a signed-in user:
    // callback, reset-password, accept-invite and forgot-password all run
    // mid-session and need the refreshed cookie.
    '/auth/:path*',
    // The frozen legacy entry points.
    '/login',
    '/signup',
  ],
};

/**
 * A POSITIVE LIST, mirroring `V4_PROTECTED` + `V4_AUTH_REDIRECT` +
 * `LEGACY_AUTH_ROUTES` in `lib/auth-routing`.
 *
 * It replaced a negative lookahead that matched everything except static
 * assets. Inverting it is what excludes the public surface — but it also
 * introduces a coupling: a new protected route added to `V4_PROTECTED` and not
 * added here would render to an anonymous visitor without ever being guarded.
 *
 * `tests/proxy.test.ts` asserts the two lists agree, so that mistake fails a
 * test rather than shipping.
 */
