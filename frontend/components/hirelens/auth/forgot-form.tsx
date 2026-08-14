'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { authErrorMessage } from '@/lib/auth-errors'
import { Button } from '../ui/button'
import { AuthField } from './auth-field'
import { useFocusOnMount } from './use-focus-on-mount'

/**
 * Forgot password — request a reset link.
 *
 * The response is deliberately identical whether or not the account exists.
 * This screen must not become an oracle for which addresses are registered, and
 * that constraint shapes the copy: "if an account exists for …", never "we sent
 * you an email".
 *
 * What changed: the raw Supabase string is no longer rendered (a rate limit read
 * as "For security purposes, you can only request this after 47 seconds", which
 * is an accusation rather than an instruction — `lib/auth-errors.ts` maps it),
 * the success state can resend rather than stranding anyone whose email did not
 * arrive, and the resend is rate-limited *here* so the second attempt is not
 * spent discovering that Supabase also rate-limits it.
 */
const RESEND_COOLDOWN_SECONDS = 30

export function ForgotForm() {
  const configured = isSupabaseConfigured()
  const [email, setEmail] = React.useState('')
  const [touched, setTouched] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [sent, setSent] = React.useState(false)
  const [resending, setResending] = React.useState(false)
  const [cooldown, setCooldown] = React.useState(0)

  const emailRef = React.useRef<HTMLInputElement>(null)
  const sentHeadingRef = useFocusOnMount<HTMLHeadingElement>(sent)

  // Tick the resend cooldown down to zero.
  React.useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((n) => n - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  // Deliberately permissive: the server is the authority on whether an address
  // is deliverable, and a clever regex here only ever rejects real addresses.
  const emailLooksWrong = touched && email.length > 0 && !/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(email)

  async function send(): Promise<boolean> {
    const supabase = getSupabaseBrowserClient()
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
    })
    if (resetError) throw resetError
    return true
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setTouched(true)
    if (!configured) {
      setError('Password reset isn’t configured yet.')
      return
    }
    if (!email.trim()) {
      emailRef.current?.focus()
      return
    }
    setLoading(true)
    try {
      await send()
      setSent(true)
      setCooldown(RESEND_COOLDOWN_SECONDS)
    } catch (err) {
      setError(authErrorMessage(err, 'We couldn’t send that link. Try again in a moment.'))
      emailRef.current?.focus()
    } finally {
      setLoading(false)
    }
  }

  async function onResend() {
    if (cooldown > 0) return
    setError(null)
    setResending(true)
    try {
      await send()
      setCooldown(RESEND_COOLDOWN_SECONDS)
    } catch (err) {
      setError(authErrorMessage(err, 'We couldn’t send that link. Try again in a moment.'))
    } finally {
      setResending(false)
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-4">
        <h1 ref={sentHeadingRef} tabIndex={-1} className="hl-display-md hl-serif outline-none">
          Check your inbox.
        </h1>
        <p className="hl-body text-hl-fg-secondary">
          If an account exists for {email}, we sent a link to reset your password. It expires after a
          while, so open it soon — and on this device.
        </p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onResend}
            disabled={cooldown > 0 || resending}
            className="hl-small self-start text-hl-accent-fg outline-none hover:underline disabled:text-hl-fg-tertiary disabled:no-underline"
          >
            {resending
              ? 'Sending…'
              : cooldown > 0
                ? `Send again in ${cooldown}s`
                : 'Send it again'}
          </button>
          {/* Announced when it changes, so the resend is confirmed without sight. */}
          <p className="sr-only" role="status" aria-live="polite">
            {cooldown === RESEND_COOLDOWN_SECONDS ? 'Reset link sent.' : ''}
          </p>
          {error ? (
            <p className="hl-body text-hl-danger" role="alert">
              {error}
            </p>
          ) : null}
        </div>
        <p className="hl-body text-hl-fg-tertiary">
          <button
            type="button"
            onClick={() => {
              setSent(false)
              setError(null)
            }}
            className="text-hl-accent-fg outline-none hover:underline"
          >
            Use a different email
          </button>
          {' · '}
          <Link href="/auth/login" className="text-hl-accent-fg outline-none hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="hl-display-md hl-serif">Reset your password.</h1>
      <p className="hl-body text-hl-fg-secondary">
        Enter the email you sign in with and we’ll send you a link to choose a new password.
      </p>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <AuthField
          ref={emailRef}
          label="Work email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          autoFocus
          placeholder="you@company.com"
          value={email}
          invalid={emailLooksWrong || Boolean(error)}
          errorId={error ? 'forgot-error' : 'forgot-email-hint'}
          onBlur={() => setTouched(true)}
          onChange={(event) => setEmail(event.target.value)}
        />
        {emailLooksWrong && !error ? (
          <p id="forgot-email-hint" className="hl-body text-hl-danger" role="alert">
            That doesn’t look like an email address.
          </p>
        ) : null}
        {error ? (
          <p id="forgot-error" className="hl-body text-hl-danger" role="alert">
            {error}
          </p>
        ) : null}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          loading={loading}
          disabled={!email.trim() || emailLooksWrong}
        >
          Send reset link
          <ArrowRight />
        </Button>
      </form>
      <p className="hl-body text-hl-fg-tertiary">
        Remembered it?{' '}
        <Link href="/auth/login" className="text-hl-accent-fg outline-none hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
