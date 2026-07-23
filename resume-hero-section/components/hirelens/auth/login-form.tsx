'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, KeyRound, Wand2, User } from 'lucide-react'
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { Button } from '../ui/button'
import { AuthField } from './auth-field'

/**
 * Login (RC-1 Definitive Login) — email-first progressive: email → Continue,
 * then password → Sign in, with SSO and magic-link paths beneath. Uses Supabase
 * `signInWithPassword` / `signInWithOtp` / `signInWithSSO`.
 */
export function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get('next') || '/home'
  const linkError = params.get('error') === 'link_invalid'
  const configured = isSupabaseConfigured()

  const [step, setStep] = React.useState<'email' | 'password'>('email')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [magicLoading, setMagicLoading] = React.useState(false)
  const [magicSent, setMagicSent] = React.useState(false)
  const [ssoLoading, setSsoLoading] = React.useState(false)

  function onContinue(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    if (email.trim()) setStep('password')
  }

  function requireEmail(): boolean {
    if (!email.trim() || !email.includes('@')) {
      setError('Enter your work email first.')
      return false
    }
    if (!configured) {
      setError('Sign-in isn’t configured yet.')
      return false
    }
    return true
  }

  async function onMagicLink() {
    setError(null)
    if (!requireEmail()) return
    setMagicLoading(true)
    try {
      const supabase = getSupabaseBrowserClient()
      const redirect = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
      // shouldCreateUser: false — the login surface signs existing users in;
      // account creation lives on /auth/signup. The returned error (e.g. unknown
      // email) is intentionally not surfaced: we show the same confirmation
      // whether or not the account exists (no enumeration, like ForgotForm).
      await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirect, shouldCreateUser: false },
      })
      setMagicSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setMagicLoading(false)
    }
  }

  async function onSSO() {
    setError(null)
    if (!requireEmail()) return
    const domain = email.split('@')[1]?.trim().toLowerCase()
    if (!domain) {
      setError('Enter your work email first.')
      return
    }
    setSsoLoading(true)
    try {
      const supabase = getSupabaseBrowserClient()
      // Real Supabase enterprise SSO. Returns a redirect URL when an identity
      // provider is registered for the email domain; otherwise it errors, and we
      // degrade calmly to the password / magic-link paths (no invented flow).
      const { data, error: ssoError } = await supabase.auth.signInWithSSO({ domain })
      if (ssoError) throw ssoError
      if (data?.url) {
        window.location.assign(data.url)
        return
      }
      setError('No single sign-on is set up for your team yet.')
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      setError(
        /provider|sso|not found|no.*match/i.test(message)
          ? 'No single sign-on is set up for your team yet — use your password or a magic link.'
          : message || 'Something went wrong. Please try again.',
      )
    } finally {
      setSsoLoading(false)
    }
  }

  async function onSignIn(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    if (!configured) {
      setError('Sign-in isn’t configured yet.')
      return
    }
    setLoading(true)
    try {
      const supabase = getSupabaseBrowserClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) throw signInError
      router.replace(next)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  if (magicSent) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="hl-display-md">Check your inbox.</h1>
        <p className="hl-small text-hl-fg-secondary" role="status">
          If an account exists for {email}, we sent a sign-in link. Open it on this device to
          continue.
        </p>
        <button
          type="button"
          onClick={() => {
            setMagicSent(false)
            setError(null)
          }}
          className="hl-small self-start text-hl-accent-fg outline-none hover:underline"
        >
          Use a different email
        </button>
      </div>
    )
  }

  const errorLine = error ? (
    <p className="hl-small text-[color:var(--hl-danger)]" role="alert">
      {error}
    </p>
  ) : null

  return (
    <div className="flex flex-col gap-8">
      <h1 className="hl-display-md">Welcome back.</h1>

      {linkError ? (
        <p className="-mt-4 hl-small text-hl-fg-secondary" role="status">
          That link was invalid or has expired. Please sign in below.
        </p>
      ) : null}

      {step === 'email' ? (
        <div className="flex flex-col gap-6">
          <form onSubmit={onContinue} className="flex flex-col gap-4">
            <AuthField
              label="Work email"
              type="email"
              autoComplete="email"
              required
              autoFocus
              placeholder="name@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            {errorLine}
            <Button type="submit" variant="primary" size="lg" className="w-full justify-between">
              Continue
              <ArrowRight />
            </Button>
            <p className="font-hl-mono text-[11px] text-hl-fg-tertiary">
              We&rsquo;ll check if your team uses SSO.
            </p>
          </form>

          <div className="flex items-center gap-4" aria-hidden>
            <span className="h-px flex-1 bg-hl-border-subtle" />
            <span className="font-hl-mono text-[11px] uppercase tracking-widest text-hl-fg-tertiary">
              or
            </span>
            <span className="h-px flex-1 bg-hl-border-subtle" />
          </div>

          <div className="flex flex-col gap-3">
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="w-full"
              loading={ssoLoading}
              onClick={onSSO}
            >
              <KeyRound />
              Continue with SSO
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="w-full"
              loading={magicLoading}
              onClick={onMagicLink}
            >
              <Wand2 />
              Email me a magic link
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={onSignIn} className="flex flex-col gap-5">
          {/* Chosen-identity chip */}
          <div className="flex items-center justify-between gap-2 rounded-hl-md border border-hl-border-subtle bg-hl-subtle px-3 py-2.5">
            <span className="flex min-w-0 items-center gap-2.5 text-hl-fg-secondary">
              <User className="size-[18px] shrink-0" aria-hidden />
              <span className="hl-small min-w-0 truncate">{email}</span>
            </span>
            <button
              type="button"
              onClick={() => {
                setStep('email')
                setError(null)
              }}
              className="hl-caption shrink-0 text-hl-accent-fg outline-none hover:underline"
            >
              Edit
            </button>
          </div>
          <AuthField
            label="Password"
            type="password"
            autoComplete="current-password"
            required
            autoFocus
            placeholder="••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            labelAction={
              <Link
                href="/auth/forgot-password"
                className="hl-caption text-hl-fg-tertiary outline-none transition-colors hover:text-hl-fg"
              >
                Forgot password?
              </Link>
            }
          />
          {errorLine}
          <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading}>
            Sign in
          </Button>
        </form>
      )}

      <div className="border-t border-hl-border-subtle pt-6">
        <p className="hl-small text-hl-fg-secondary">
          New to HireLens?{' '}
          <Link href="/auth/signup" className="font-medium text-hl-accent-fg outline-none hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  )
}
