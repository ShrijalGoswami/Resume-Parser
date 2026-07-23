'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { Button } from '../ui/button'
import { AuthField } from './auth-field'

/**
 * Forgot password (frozen P2 design). Sends a Supabase reset email whose link
 * returns through `/auth/callback` to `/auth/reset-password`. The response is
 * intentionally the same whether or not the account exists (no enumeration).
 */
export function ForgotForm() {
  const configured = isSupabaseConfigured()
  const [email, setEmail] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [sent, setSent] = React.useState(false)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    if (!configured) {
      setError('Password reset isn’t configured yet.')
      return
    }
    setLoading(true)
    try {
      const supabase = getSupabaseBrowserClient()
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
      })
      if (resetError) throw resetError
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="hl-display">Check your inbox.</h1>
        <p className="hl-small text-hl-fg-secondary" role="status">
          If an account exists for {email}, we sent a link to reset your password. Open it on this
          device to continue.
        </p>
        <p className="hl-small text-hl-fg-tertiary">
          <Link href="/auth/login" className="text-hl-accent-fg outline-none hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="hl-display">Reset your password.</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-5">
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
        <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading}>
          Send reset link
          <ArrowRight />
        </Button>
      </form>
      <p className="hl-small text-hl-fg-tertiary">
        Remembered it?{' '}
        <Link href="/auth/login" className="text-hl-accent-fg outline-none hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
