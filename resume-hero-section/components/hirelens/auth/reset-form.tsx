'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { Button } from '../ui/button'
import { AuthField } from './auth-field'

/**
 * Reset password (frozen P2 design). Sets a new password on the recovery
 * session established when the reset link is opened (via `/auth/callback`), then
 * signs the user in on this device.
 */
export function ResetForm() {
  const router = useRouter()
  const configured = isSupabaseConfigured()
  const [password, setPassword] = React.useState('')
  const [confirm, setConfirm] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    if (!configured) {
      setError('Password reset isn’t configured yet.')
      return
    }
    if (password !== confirm) {
      setError('Passwords don’t match.')
      return
    }
    setLoading(true)
    try {
      const supabase = getSupabaseBrowserClient()
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      router.replace('/home')
      router.refresh()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Your reset link may have expired. Request a new one.',
      )
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="hl-display-md">Choose a new password.</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <AuthField
          label="New password"
          type="password"
          autoComplete="new-password"
          required
          autoFocus
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
          Save &amp; sign in
        </Button>
      </form>
      <p className="hl-small text-hl-fg-tertiary">You&rsquo;ll be signed in on this device.</p>
    </div>
  )
}
