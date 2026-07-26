/**
 * Next.js proxy (formerly `middleware.ts`) — refreshes the Supabase session
 * cookie on every request and guards protected routes. The routing DECISION is a
 * pure function (`resolveMiddlewareAction` in lib/auth-routing) so the security
 * logic is unit-tested in isolation; this file only wires it to Supabase + Next.
 *
 * Legacy protected routes → /login; V4 (hirelens) protected routes → /auth/login.
 * If Supabase env vars are absent (stateless mode), this is a no-op so the
 * existing public app keeps working.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { resolveMiddlewareAction } from '@/lib/auth-routing';

type CookieToSet = { name: string; value: string; options?: CookieOptions };

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Stateless mode: no auth configured → let everything through.
  if (!url || !anonKey) return NextResponse.next();

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

  // IMPORTANT: getUser() revalidates the token with Supabase Auth.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const action = resolveMiddlewareAction(path, Boolean(user));

  if (action.kind === 'redirect') {
    const redirect = request.nextUrl.clone();
    redirect.pathname = action.pathname;
    redirect.search = '';
    if (action.withNext) redirect.searchParams.set('next', path);
    return NextResponse.redirect(redirect);
  }

  return response;
}

export const config = {
  matcher: [
    // Run on everything except static assets and images.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
