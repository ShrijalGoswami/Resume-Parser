'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { authErrorMessage } from '@/lib/auth-errors'
import { isPasswordAcceptable } from '@/lib/password-policy'
import { Button } from '../ui/button'
import { AuthField } from './auth-field'
import { PasswordField } from './password-field'
import { PasswordRequirements } from './password-requirements'
import { useFocusOnMount } from './use-focus-on-mount'

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
  const [touched, setTouched] = React.useState(false)

  const passwordRef = React.useRef<HTMLInputElement>(null)
  const sentHeadingRef = useFocusOnMount<HTMLHeadingElement>(sent)

  // Verification links route through /auth/callback so the one-time code is
  // exchanged for a session (PKCE) before landing on /home.
  const emailRedirectTo =
    typeof window !== 'undefined' ? `${window.location.origin}/auth/callback?next=/home` : undefined

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setTouched(true)
    if (!configured) {
      setError('Sign-up isn’t configured yet.')
      return
    }
    // Send focus to the field that is actually blocking, rather than leaving the
    // reader to work out which of three inputs the message refers to.
    if (!isPasswordAcceptable(password)) {
      passwordRef.current?.focus()
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
      setError(authErrorMessage(err, 'We couldn’t create your account. Try again in a moment.'))
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
        <h1 ref={sentHeadingRef} tabIndex={-1} className="hl-display-md outline-none">
          Check your inbox.
        </h1>
        <p className="hl-body text-hl-fg-secondary" role="status">
          We sent a confirmation link to {email}. Open it on this device to finish creating your
          account.
        </p>
        {resent ? (
          <p className="hl-body text-hl-fg-tertiary" role="status">
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
        <p className="hl-body text-hl-fg-tertiary">
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
      <h1 className="hl-display-md">Start with HireLens.</h1>
      {/* `noValidate` hands validation to the checklist below. The browser's own
          bubble says "Please lengthen this text to 8 characters or more", is not
          announced to a screen reader, and disappears on the next keystroke —
          the requirement list is live, described by the field, and stays put. */}
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
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
          inputMode="email"
          autoComplete="email"
          required
          placeholder="you@company.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <div className="flex flex-col gap-2">
          <PasswordField
            ref={passwordRef}
            label="Password"
            autoComplete="new-password"
            required
            placeholder="At least 8 characters"
            value={password}
            invalid={touched && password.length > 0 && !isPasswordAcceptable(password)}
            describedBy="signup-password-rules"
            onBlur={() => setTouched(true)}
            onChange={(event) => setPassword(event.target.value)}
          />
          <PasswordRequirements
            id="signup-password-rules"
            password={password}
            showErrors={touched}
          />
        </div>
        {error ? (
          <p className="hl-body text-hl-danger" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading}>
          Create account
          <ArrowRight />
        </Button>
        {/* THESE HAVE TO BE LINKS. This line was plain text naming two
            documents that did not exist on any route — you cannot bind someone
            to terms you have not published, and a consent line pointing at
            nothing is unenforceable as well as discourteous. `target="_blank"`
            so reading them does not discard a half-filled form. */}
        <p className="hl-caption font-hl-mono leading-relaxed text-hl-fg-tertiary">
          By continuing you agree to our{' '}
          <a
            href="/terms"
            target="_blank"
            rel="noreferrer"
            className="text-hl-accent-fg outline-none hover:underline"
          >
            Terms
          </a>{' '}
          and{' '}
          <a
            href="/privacy"
            target="_blank"
            rel="noreferrer"
            className="text-hl-accent-fg outline-none hover:underline"
          >
            Privacy Policy
          </a>
          .
        </p>
      </form>
      <p className="hl-body text-hl-fg-tertiary">
        Already have an account?{' '}
        <Link href="/auth/login" className="text-hl-accent-fg outline-none hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
