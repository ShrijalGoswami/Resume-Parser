'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Loader2 } from 'lucide-react'
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { authErrorMessage } from '@/lib/auth-errors'
import { confirmError, isPasswordAcceptable } from '@/lib/password-policy'
import { Button } from '../ui/button'
import { PasswordField } from './password-field'
import { PasswordRequirements } from './password-requirements'
import { useFocusOnMount } from './use-focus-on-mount'

/**
 * Reset password — set a new password on the recovery session.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE BUG THIS FIXES. The screen used to render its form unconditionally,
 * having checked nothing. A person arriving from an expired link — or on a
 * different device from the one that requested the reset, or simply typing the
 * URL — was shown a working form, chose a password, confirmed it, submitted,
 * and only then learned there was no session to update. The failure arrived
 * after the effort, phrased as a guess ("Your reset link may have expired"),
 * with no way forward from the screen they were on.
 *
 * So the session is now established BEFORE the form exists, and the four states
 * are explicit:
 *
 *   checking → is there a recovery session? (Supabase's callback set the
 *              cookies; this reads them, and also listens for PASSWORD_RECOVERY
 *              in case the SDK resolves the link after we mount)
 *   invalid  → say so immediately, and put "request a new link" on the screen
 *   ready    → the form
 *   done     → a success screen, not a silent redirect
 *
 * WHY `done` IS A SCREEN. It used to `router.replace('/home')` the moment the
 * update succeeded. Changing a password is a security event, and the only
 * confirmation was arriving somewhere else — indistinguishable, to the person
 * who just did it, from the form having thrown them out. It now says the
 * password was changed, then offers to continue.
 *
 * A signed-in visitor with no recovery link is deliberately allowed through:
 * they are already authenticated, and `updateUser` is exactly as safe for them.
 * ─────────────────────────────────────────────────────────────────────────────
 */
type Phase = 'checking' | 'invalid' | 'ready' | 'done'

export function ResetForm() {
  const router = useRouter()
  const configured = isSupabaseConfigured()

  // Seeded rather than set from the effect: with Supabase unconfigured there is
  // nothing to check, and starting at 'checking' only to correct it on the first
  // commit is a cascading render for a value known before the first one.
  const [phase, setPhase] = React.useState<Phase>(configured ? 'checking' : 'invalid')
  // Read off the recovery session purely so a password manager has an account
  // to attach the new credential to — see the hidden username field below.
  const [accountEmail, setAccountEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [confirm, setConfirm] = React.useState('')
  const [touched, setTouched] = React.useState(false)
  const [confirmTouched, setConfirmTouched] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const passwordRef = React.useRef<HTMLInputElement>(null)
  const doneHeadingRef = useFocusOnMount<HTMLHeadingElement>(phase === 'done')
  const invalidHeadingRef = useFocusOnMount<HTMLHeadingElement>(phase === 'invalid')

  // ── Establish the session before offering the form ──────────────────────
  React.useEffect(() => {
    if (!configured) return
    const supabase = getSupabaseBrowserClient()
    let cancelled = false

    // PASSWORD_RECOVERY fires when the SDK itself resolves a recovery link.
    // Our /auth/callback route normally handles that server-side, but a link
    // opened in a client that carries the token in the URL fragment resolves
    // here instead, and it can land after this effect has already read a null
    // session. Subscribing first means neither ordering loses.
    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return
      if (event === 'PASSWORD_RECOVERY' || session) {
        if (session?.user?.email) setAccountEmail(session.user.email)
        setPhase('ready')
      }
    })

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      if (data.session?.user?.email) setAccountEmail(data.session.user.email)
      // MUST NOT DOWNGRADE. These two resolve in either order, and when the SDK
      // resolves a fragment-carried recovery link first, this call was started
      // before that session existed and answers null. Taking that answer would
      // tear a working form down and tell the person their link had expired
      // while they were holding a valid one.
      setPhase((current) => (current === 'ready' ? 'ready' : data.session ? 'ready' : 'invalid'))
    })

    return () => {
      cancelled = true
      subscription.subscription.unsubscribe()
    }
  }, [configured])

  const mismatch = confirmError(password, confirm)
  const canSubmit = isPasswordAcceptable(password) && !mismatch && confirm.length > 0

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setTouched(true)
    setConfirmTouched(true)

    if (!isPasswordAcceptable(password)) {
      passwordRef.current?.focus()
      return
    }
    if (mismatch) return

    setLoading(true)
    try {
      const supabase = getSupabaseBrowserClient()
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      setPhase('done')
    } catch (err) {
      setError(
        authErrorMessage(err, 'We couldn’t change your password. Request a new link and try again.'),
      )
      setLoading(false)
    }
  }

  // ── checking ────────────────────────────────────────────────────────────
  if (phase === 'checking') {
    return (
      <div className="flex flex-col gap-4" role="status" aria-live="polite">
        <Loader2 className="size-5 animate-spin text-hl-fg-tertiary" aria-hidden />
        <p className="hl-body text-hl-fg-secondary">Checking your reset link…</p>
      </div>
    )
  }

  // ── invalid ─────────────────────────────────────────────────────────────
  if (phase === 'invalid') {
    return (
      <div className="flex flex-col gap-4">
        <h1 ref={invalidHeadingRef} tabIndex={-1} className="hl-display-md outline-none">
          This link has expired.
        </h1>
        <p className="hl-body text-hl-fg-secondary">
          {configured
            ? 'Reset links can only be used once, and they stop working after a while. Request a new one and we’ll email it straight away.'
            : 'Password reset isn’t configured yet.'}
        </p>
        {configured ? (
          <Button asChild variant="primary" size="lg" className="w-full">
            <Link href="/auth/forgot-password">
              Request a new link
              <ArrowRight />
            </Link>
          </Button>
        ) : null}
        <p className="hl-body text-hl-fg-tertiary">
          <Link href="/auth/login" className="text-hl-accent-fg outline-none hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    )
  }

  // ── done ────────────────────────────────────────────────────────────────
  if (phase === 'done') {
    return (
      <div className="flex flex-col gap-4">
        <h1 ref={doneHeadingRef} tabIndex={-1} className="hl-display-md outline-none">
          Password changed.
        </h1>
        <p className="hl-body text-hl-fg-secondary">
          You’re signed in on this device. Use your new password next time.
        </p>
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={() => {
            router.replace('/home')
            router.refresh()
          }}
        >
          Continue to HireLens
          <ArrowRight />
        </Button>
      </div>
    )
  }

  // ── ready ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">
      <h1 className="hl-display-md">Choose a new password.</h1>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        {/* A password manager will not offer to update a saved credential
            without a username to attach it to, and this screen has no email
            field. The account's own address, read off the recovery session,
            carries it. `type="hidden"` is deliberately NOT used: managers skip
            hidden inputs, so the field is a real text input taken out of the
            layout and out of the tab order, which is the documented pattern. */}
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
        <div className="flex flex-col gap-2">
          <PasswordField
            ref={passwordRef}
            label="New password"
            autoComplete="new-password"
            required
            autoFocus
            placeholder="At least 8 characters"
            value={password}
            invalid={touched && password.length > 0 && !isPasswordAcceptable(password)}
            describedBy="reset-password-rules"
            onBlur={() => setTouched(true)}
            onChange={(event) => setPassword(event.target.value)}
          />
          <PasswordRequirements
            id="reset-password-rules"
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
          errorId="reset-confirm-error"
          onBlur={() => setConfirmTouched(true)}
          onChange={(event) => setConfirm(event.target.value)}
        />
        {confirmTouched && mismatch ? (
          <p id="reset-confirm-error" className="hl-body text-hl-danger" role="alert">
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
          Save new password
        </Button>
      </form>
    </div>
  )
}
