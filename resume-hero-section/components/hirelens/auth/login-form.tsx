'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { Button } from '../ui/button'
import { AuthField } from './auth-field'

/**
 * Login (frozen P2 design) — email-first progressive: email → Continue, then
 * password → Sign in. Uses Supabase `signInWithPassword`, which sets the session
 * directly.
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

  function onContinue(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    if (email.trim()) setStep('password')
  }

  async function onMagicLink() {
    setError(null)
    if (!email.trim()) {
      setError('Enter your work email first.')
      return
    }
    if (!configured) {
      setError('Sign-in isn’t configured yet.')
      return
    }
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
        <h1 className="hl-display">Check your inbox.</h1>
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

  return (
    <div className="flex flex-col gap-6">
      <h1 className="hl-display">Welcome back.</h1>

      {linkError ? (
        <p className="hl-small text-hl-fg-secondary" role="status">
          That link was invalid or has expired. Please sign in below.
        </p>
      ) : null}

      {step === 'email' ? (
        <form onSubmit={onContinue} className="flex flex-col gap-5">
          <AuthField
            label="Work email"
            type="email"
            autoComplete="email"
            required
            autoFocus
            placeholder="you@company.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          {error ? (
            <p className="hl-small text-[color:var(--hl-danger)]" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" variant="primary" size="lg" className="w-full">
            Continue
            <ArrowRight />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            className="w-full"
            loading={magicLoading}
            onClick={onMagicLink}
          >
            Email me a sign-in link
          </Button>
        </form>
      ) : (
        <form onSubmit={onSignIn} className="flex flex-col gap-5">
          <div className="flex items-center justify-between gap-2">
            <span className="hl-small min-w-0 truncate text-hl-fg-secondary">{email}</span>
            <button
              type="button"
              onClick={() => {
                setStep('email')
                setError(null)
              }}
              className="hl-caption shrink-0 text-hl-accent-fg outline-none hover:underline"
            >
              Change
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
          />
          <div className="-mt-2 flex justify-end">
            <Link
              href="/auth/forgot-password"
              className="hl-caption text-hl-accent-fg outline-none hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          {error ? (
            <p className="hl-small text-[color:var(--hl-danger)]" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading}>
            Sign in
          </Button>
        </form>
      )}

      <p className="hl-small text-hl-fg-tertiary">
        New to HireLens?{' '}
        <Link href="/auth/signup" className="text-hl-accent-fg outline-none hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  )
}
