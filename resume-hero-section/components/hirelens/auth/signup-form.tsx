'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { Button } from '../ui/button'
import { AuthField } from './auth-field'

/**
 * Signup (frozen P2 design). Uses Supabase `signUp`. If the project returns a
 * session (auto-confirm) the user proceeds; otherwise a calm "check your inbox"
 * confirmation state is shown.
 */
export function SignupForm() {
  const router = useRouter()
  const configured = isSupabaseConfigured()

  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [sent, setSent] = React.useState(false)
  const [resendLoading, setResendLoading] = React.useState(false)
  const [resent, setResent] = React.useState(false)

  // Verification links route through /auth/callback so the one-time code is
  // exchanged for a session (PKCE) before landing on /home.
  const emailRedirectTo =
    typeof window !== 'undefined' ? `${window.location.origin}/auth/callback?next=/home` : undefined

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    if (!configured) {
      setError('Sign-up isn’t configured yet.')
      return
    }
    setLoading(true)
    try {
      const supabase = getSupabaseBrowserClient()
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name }, emailRedirectTo },
      })
      if (signUpError) throw signUpError
      if (data.session) {
        router.replace('/home')
        router.refresh()
      } else {
        setSent(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  async function onResend() {
    setError(null)
    if (!configured) return
    setResendLoading(true)
    try {
      const supabase = getSupabaseBrowserClient()
      // Returned error (e.g. already-verified) is intentionally not surfaced —
      // same confirmation shown regardless (no enumeration / state leak).
      await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo } })
      setResent(true)
    } catch {
      setResent(true)
    } finally {
      setResendLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="hl-display">Check your inbox.</h1>
        <p className="hl-small text-hl-fg-secondary" role="status">
          We sent a confirmation link to {email}. Open it on this device to finish creating your
          account.
        </p>
        {resent ? (
          <p className="hl-small text-hl-fg-tertiary" role="status">
            Sent again. Check your inbox.
          </p>
        ) : (
          <button
            type="button"
            onClick={onResend}
            disabled={resendLoading}
            className="hl-small self-start text-hl-accent-fg outline-none hover:underline disabled:opacity-60"
          >
            {resendLoading ? 'Resending…' : 'Resend confirmation link'}
          </button>
        )}
        <p className="hl-small text-hl-fg-tertiary">
          Already confirmed?{' '}
          <Link href="/auth/login" className="text-hl-accent-fg outline-none hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="hl-display">Start with HireLens.</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <AuthField
          label="Full name"
          autoComplete="name"
          required
          autoFocus
          placeholder="Jane Recruiter"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <AuthField
          label="Work email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@company.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <AuthField
          label="Password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          placeholder="At least 8 characters"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {error ? (
          <p className="hl-small text-[color:var(--hl-danger)]" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading}>
          Create account
          <ArrowRight />
        </Button>
        <p className="font-hl-mono text-[11px] leading-relaxed text-hl-fg-tertiary">
          By continuing you agree to the Terms &amp; Privacy Policy.
        </p>
      </form>
      <p className="hl-small text-hl-fg-tertiary">
        Already have an account?{' '}
        <Link href="/auth/login" className="text-hl-accent-fg outline-none hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
