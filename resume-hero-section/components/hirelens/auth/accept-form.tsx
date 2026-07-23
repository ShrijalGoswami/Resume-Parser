'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { Button } from '../ui/button'
import { AuthField } from './auth-field'

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

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    if (!configured) {
      setError('Invites aren’t configured yet.')
      return
    }
    if (password !== confirm) {
      setError('Passwords don’t match.')
      return
    }
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
      setError(
        err instanceof Error ? err.message : 'Your invite link may have expired. Ask for a new one.',
      )
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="hl-display-md">You’re invited.</h1>
      <p className="hl-small text-hl-fg-secondary">
        Set your name and a password to join your team on HireLens.
      </p>
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
          label="Password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          placeholder="At least 8 characters"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <AuthField
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          placeholder="Re-enter your password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
        />
        {error ? (
          <p className="hl-small text-[color:var(--hl-danger)]" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading}>
          Join HireLens
        </Button>
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
