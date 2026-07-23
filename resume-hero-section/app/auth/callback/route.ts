import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

/**
 * Auth callback (frozen P2 design). Exchanges the one-time `code` from an email
 * link (password reset, magic link, email confirmation, invite) or an OAuth/SSO
 * redirect for a session, writes the SSR cookies, then continues to `next`. On
 * any failure it returns to the sign-in surface with a calm notice.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const nextParam = searchParams.get('next') ?? '/home'
  // Open-redirect guard: only same-origin relative paths are honored.
  const next = nextParam.startsWith('/') ? nextParam : '/home'

  if (code) {
    const supabase = await getSupabaseServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=link_invalid`)
}
