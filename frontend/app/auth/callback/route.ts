import { NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { getSupabaseServerClient } from '@/lib/supabase/server'

/**
 * Auth callback. Establishes a session from an email link or OAuth/SSO redirect,
 * writes the SSR cookies, then continues to `next`. Supports BOTH Supabase email
 * link styles:
 *   - PKCE:  `?code=…`                      → exchangeCodeForSession
 *   - OTP:   `?token_hash=…&type=…`         → verifyOtp   (recovery / invite / magiclink / signup)
 * On any failure it returns to the sign-in surface with a calm notice.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const nextParam = searchParams.get('next') ?? '/home'
  // Open-redirect guard: only same-origin relative paths are honored.
  const next = nextParam.startsWith('/') ? nextParam : '/home'

  const supabase = await getSupabaseServerClient()

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}${next}`)
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    if (!error) return NextResponse.redirect(`${origin}${next}`)
  }

  return NextResponse.redirect(`${origin}/auth/login?error=link_invalid`)
}
