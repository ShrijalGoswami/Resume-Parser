'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { authErrorMessage } from '@/lib/auth-errors'
import { confirmError, isPasswordAcceptable } from '@/lib/password-policy'
import { Button } from '../ui/button'
import { AuthField } from './auth-field'
import { PasswordField } from './password-field'
import { PasswordRequirements } from './password-requirements'
import { CheckingLink, LinkExpired } from './link-session-screens'
import { useFocusOnMount } from './use-focus-on-mount'
import { useLinkSession } from './use-link-session'

/**
 * Accept invite — set a name and a password on the session the invite link
 * established, then join.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SAME BUG AS THE RESET SCREEN, SAME FIX. This rendered its form having
 * verified nothing, so an invite that had expired, been used already, or been
 * opened on a different device produced a working form — and the refusal
 * arrived only after a name, a password and a confirmation had been typed.
 *
 * It runs the identical four-state machine, on the shared `useLinkSession`
 * hook rather than a second copy of the logic, so the ordering race between
 * `getSession` and the auth-state event is fixed once for both screens.
 *
 *   checking → is there a session behind this invite?
 *   invalid  → say so before asking for anything
 *   ready    → the form
 *   done     → a confirmation screen, not a silent redirect
 *
 * WHERE IT DIVERGES FROM RESET, AND WHY. An expired reset link can be replaced
 * by the person standing there — /auth/forgot-password is one click away. An
 * expired invite cannot: only an admin of the organization that issued it can
 * send another. So the failure screen offers no self-serve action and says who
 * to ask instead of dangling a button that would not work.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function AcceptInviteForm() {
  const router = useRouter()
  const { status, email: accountEmail, configured } = useLinkSession()

  const [done, setDone] = React.useState(false)
  const [name, setName] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [confirm, setConfirm] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [touched, setTouched] = React.useState(false)
  const [confirmTouched, setConfirmTouched] = React.useState(false)
  const passwordRef = React.useRef<HTMLInputElement>(null)
  const doneHeadingRef = useFocusOnMount<HTMLHeadingElement>(done)

  const mismatch = confirmError(password, confirm)
  const canSubmit =
    name.trim().length > 0 && isPasswordAcceptable(password) && !mismatch && confirm.length > 0

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setTouched(true)
    setConfirmTouched(true)
    // No `configured` guard here: an unconfigured project never reaches this
    // form — `useLinkSession` reports 'invalid' and the screen above says so.
    if (!isPasswordAcceptable(password)) {
      passwordRef.current?.focus()
      return
    }
    if (mismatch) return
    setLoading(true)
    try {
      const supabase = getSupabaseBrowserClient()
      const { error: updateError } = await supabase.auth.updateUser({
        password,
        data: { full_name: name },
      })
      if (updateError) throw updateError
      setDone(true)
    } catch (err) {
      setError(authErrorMessage(err, 'Your invite link may have expired. Ask for a new one.'))
      setLoading(false)
    }
  }

  // ── checking ────────────────────────────────────────────────────────────
  // `done` first: accepting the invite refreshes the session it was validated
  // against, and the confirmation must not flicker back to a spinner.
  if (!done && status === 'checking') {
    return <CheckingLink label="Checking your invite…" />
  }

  // ── invalid ─────────────────────────────────────────────────────────────
  // No action button. Unlike a reset, nobody standing on this screen can issue
  // themselves a new invite, and offering a control that cannot work is worse
  // than offering none.
  if (!done && status === 'invalid') {
    return (
      <LinkExpired title="This invite has expired.">
        {configured
          ? 'Invite links can only be used once, and they stop working after a while. Ask whoever invited you to send another — they can do it from Settings › Team.'
          : 'Invites aren’t configured yet.'}
      </LinkExpired>
    )
  }

  // ── done ────────────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="flex flex-col gap-4">
        <h1 ref={doneHeadingRef} tabIndex={-1} className="hl-display-md hl-serif outline-none">
          You’re in.
        </h1>
        <p className="hl-body text-hl-fg-secondary">
          Your account is set up{accountEmail ? ` for ${accountEmail}` : ''}. Use that email and your
          new password to sign in next time.
        </p>
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={() => {
            router.replace('/today')
            router.refresh()
          }}
        >
          Continue to Hirevo
          <ArrowRight />
        </Button>
      </div>
    )
  }

  // ── ready ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">
      <h1 className="hl-display-md hl-serif">You’re invited.</h1>
      <p className="hl-body text-hl-fg-secondary">
        {accountEmail
          ? `Set your name and a password to join your team on Hirevo as ${accountEmail}.`
          : 'Set your name and a password to join your team on Hirevo.'}
      </p>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        {/* The invited address, so a password manager has an account to attach
            the new credential to. A real input taken out of the layout and the
            tab order — managers skip `type="hidden"`. Same carrier as the reset
            screen, for the same reason. */}
        <input
          type="text"
          name="username"
          autoComplete="username"
          value={accountEmail}
          readOnly
          tabIndex={-1}
          aria-hidden
          className="sr-only"
        />
        <AuthField
          label="Full name"
          autoComplete="name"
          required
          autoFocus
          placeholder="Jane Recruiter"
          value={name}
          onChange={(event) => setName(event.target.value)}
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
            describedBy="invite-password-rules"
            onBlur={() => setTouched(true)}
            onChange={(event) => setPassword(event.target.value)}
          />
          <PasswordRequirements
            id="invite-password-rules"
            password={password}
            showErrors={touched}
          />
        </div>
        <PasswordField
          label="Confirm password"
          autoComplete="new-password"
          required
          placeholder="Re-enter your password"
          value={confirm}
          invalid={Boolean(confirmTouched && mismatch)}
          errorId="invite-confirm-error"
          onBlur={() => setConfirmTouched(true)}
          onChange={(event) => setConfirm(event.target.value)}
        />
        {confirmTouched && mismatch ? (
          <p id="invite-confirm-error" className="hl-body text-hl-danger" role="alert">
            {mismatch}
          </p>
        ) : null}
        {error ? (
          <p className="hl-body text-hl-danger" role="alert">
            {error}
          </p>
        ) : null}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          loading={loading}
          disabled={!canSubmit}
        >
          Join Hirevo
        </Button>
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
