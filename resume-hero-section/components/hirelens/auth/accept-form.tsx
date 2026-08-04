'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { authErrorMessage } from '@/lib/auth-errors'
import { confirmError, isPasswordAcceptable } from '@/lib/password-policy'
import { Button } from '../ui/button'
import { AuthField } from './auth-field'
import { PasswordField } from './password-field'
import { PasswordRequirements } from './password-requirements'

/**
 * Accept invite (frozen P2 design). The invited user lands here with a session
 * already established by the invite link (via `/auth/callback`); they set their
 * name and a password to finish joining, then continue into the product. Mirrors
 * `ResetForm` (updates the current session's user) with an added name field —
 * invites are issued by email only, so the name is collected on acceptance.
 */
export function AcceptInviteForm() {
  const router = useRouter()
  const configured = isSupabaseConfigured()
  const [name, setName] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [confirm, setConfirm] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [touched, setTouched] = React.useState(false)
  const [confirmTouched, setConfirmTouched] = React.useState(false)
  const passwordRef = React.useRef<HTMLInputElement>(null)

  const mismatch = confirmError(password, confirm)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setTouched(true)
    setConfirmTouched(true)
    if (!configured) {
      setError('Invites aren’t configured yet.')
      return
    }
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
      router.replace('/home')
      router.refresh()
    } catch (err) {
      setError(authErrorMessage(err, 'Your invite link may have expired. Ask for a new one.'))
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="hl-display-md">You’re invited.</h1>
      <p className="hl-body text-hl-fg-secondary">
        Set your name and a password to join your team on HireLens.
      </p>
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
        <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading}>
          Join HireLens
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
