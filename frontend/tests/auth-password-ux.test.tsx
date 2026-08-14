// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

/**
 * Authentication UX.
 *
 * Each block below is a specific way the old screens failed a real person:
 *
 *   1. A password could not be read back. On a phone, the only way to find a
 *      typo was to fail the sign-in — and on the reset and invite screens,
 *      where a mistyped password is SAVED rather than rejected, there was no
 *      way to find it at all.
 *   2. `/auth/reset-password` rendered a working form having verified nothing.
 *      An expired link cost you the whole form before it admitted there was no
 *      session to update.
 *   3. Changing a password redirected instead of confirming, so the only signal
 *      that a security-relevant change succeeded was arriving somewhere else.
 *   4. The two-step sign-in dropped the email input entirely, leaving a
 *      password form no password manager will fill or offer to save.
 */

const auth = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  updateUser: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  signInWithPassword: vi.fn(),
  signInWithOtp: vi.fn(),
  signInWithSSO: vi.fn(),
  signUp: vi.fn(),
  resend: vi.fn(),
  configured: true,
}))

vi.mock('@/lib/supabase/client', () => ({
  isSupabaseConfigured: () => auth.configured,
  getSupabaseBrowserClient: () => ({ auth }),
}))

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn(), push: vi.fn() }))
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  useSearchParams: () => new URLSearchParams(),
}))

import { PasswordField } from '../components/hirelens/auth/password-field'
import { PasswordRequirements } from '../components/hirelens/auth/password-requirements'
import { ResetForm } from '../components/hirelens/auth/reset-form'
import { ForgotForm } from '../components/hirelens/auth/forgot-form'
import { LoginForm } from '../components/hirelens/auth/login-form'
import { AcceptInviteForm } from '../components/hirelens/auth/accept-form'

/** A subscription handle shaped like Supabase's, that never fires. */
const idleSubscription = { data: { subscription: { unsubscribe: () => {} } } }

beforeEach(() => {
  auth.configured = true
  for (const fn of Object.values(auth)) if (typeof fn === 'function') fn.mockReset()
  auth.onAuthStateChange.mockReturnValue(idleSubscription)
  auth.getSession.mockResolvedValue({ data: { session: null } })
  router.replace.mockReset()
  router.refresh.mockReset()
  // requestAnimationFrame is used to restore the caret after a type swap.
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    cb(0)
    return 0
  })
})
afterEach(cleanup)

// ─────────────────────────────────────────────────────────────────────────────
describe('show / hide password', () => {
  function renderField() {
    return render(<PasswordField label="Password" value="hunter2" onChange={() => {}} />)
  }

  it('starts masked and reveals on demand', () => {
    renderField()
    const input = screen.getByLabelText('Password')
    expect(input).toHaveAttribute('type', 'password')

    fireEvent.click(screen.getByRole('button', { name: 'Show password' }))
    expect(input).toHaveAttribute('type', 'text')

    fireEvent.click(screen.getByRole('button', { name: 'Hide password' }))
    expect(input).toHaveAttribute('type', 'password')
  })

  it('is a real button that cannot submit the form it sits in', () => {
    // A toggle that submits turns "let me check what I typed" into a failed
    // sign-in attempt, and on a rate-limited endpoint that is expensive.
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault())
    render(
      <form onSubmit={onSubmit}>
        <PasswordField label="Password" value="x" onChange={() => {}} />
      </form>,
    )
    const toggle = screen.getByRole('button', { name: 'Show password' })
    expect(toggle).toHaveAttribute('type', 'button')
    fireEvent.click(toggle)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('names the action and carries the state separately', () => {
    // The accessible name says what pressing it DOES; aria-pressed says where
    // it currently is. A button named for its state is ambiguous about both.
    renderField()
    const toggle = screen.getByRole('button', { name: 'Show password' })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(toggle)
    expect(screen.getByRole('button', { name: 'Hide password' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('points at the field it governs', () => {
    renderField()
    const input = screen.getByLabelText('Password')
    expect(screen.getByRole('button', { name: 'Show password' })).toHaveAttribute(
      'aria-controls',
      input.id,
    )
  })

  it('is reachable by keyboard', () => {
    renderField()
    const toggle = screen.getByRole('button', { name: 'Show password' })
    expect(toggle.tabIndex).toBeGreaterThanOrEqual(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('live password requirements', () => {
  it('states each rule and whether it is met, in words as well as colour', () => {
    render(<PasswordRequirements id="rules" password="Abcdefg1" />)
    const met = screen.getAllByText('— met')
    // All three rules satisfied by "Abcdefg1".
    expect(met).toHaveLength(3)
  })

  it('does not depend on colour alone to say a rule failed', () => {
    render(<PasswordRequirements id="rules" password="abc" />)
    expect(screen.getAllByText('— not met')).toHaveLength(3)
  })

  it('announces politely rather than interrupting the character echo', () => {
    const { container } = render(<PasswordRequirements id="rules" password="" />)
    expect(container.querySelector('#rules')).toHaveAttribute('aria-live', 'polite')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('reset password — session validation', () => {
  it('checks for a session before offering the form', async () => {
    let resolve!: (v: unknown) => void
    auth.getSession.mockReturnValue(new Promise((r) => (resolve = r)))
    render(<ResetForm />)

    // While checking: no form, and the wait is announced.
    expect(screen.queryByLabelText('New password')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(/checking your reset link/i)

    resolve({ data: { session: { user: { email: 'a@b.com' } } } })
    await waitFor(() => expect(screen.getByLabelText('New password')).toBeInTheDocument())
  })

  it('refuses an expired link up front, and offers the way out', async () => {
    auth.getSession.mockResolvedValue({ data: { session: null } })
    render(<ResetForm />)

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /this link has expired/i })).toBeInTheDocument(),
    )
    // The form never appears — no effort is spent before the refusal.
    expect(screen.queryByLabelText('New password')).not.toBeInTheDocument()
    expect(auth.updateUser).not.toHaveBeenCalled()
    expect(screen.getByRole('link', { name: /request a new link/i })).toHaveAttribute(
      'href',
      '/auth/forgot-password',
    )
  })

  it('accepts a session that only arrives via PASSWORD_RECOVERY', async () => {
    // The SDK can resolve a fragment-carried recovery link after mount, landing
    // after getSession() has already read null. Neither ordering may lose.
    auth.getSession.mockResolvedValue({ data: { session: null } })
    let fire!: (e: string, s: unknown) => void
    auth.onAuthStateChange.mockImplementation((cb: (e: string, s: unknown) => void) => {
      fire = cb
      return idleSubscription
    })
    render(<ResetForm />)
    act(() => fire('PASSWORD_RECOVERY', { user: { email: 'a@b.com' } }))
    // And the null answer from the in-flight getSession must not tear it down.
    await waitFor(() => expect(screen.getByLabelText('New password')).toBeInTheDocument())
    expect(screen.getByLabelText('New password')).toBeInTheDocument()
  })

  it('confirms the change on screen instead of silently redirecting', async () => {
    auth.getSession.mockResolvedValue({ data: { session: { user: { email: 'a@b.com' } } } })
    auth.updateUser.mockResolvedValue({ error: null })
    render(<ResetForm />)
    await waitFor(() => screen.getByLabelText('New password'))

    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'Abcdefg1!' } })
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'Abcdefg1!' } })
    fireEvent.click(screen.getByRole('button', { name: /save new password/i }))

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /password changed/i })).toBeInTheDocument(),
    )
    // Crucially NOT redirected — the person is told, then chooses to continue.
    expect(router.replace).not.toHaveBeenCalled()
  })

  it('will not submit a mismatched confirmation', async () => {
    auth.getSession.mockResolvedValue({ data: { session: { user: { email: 'a@b.com' } } } })
    render(<ResetForm />)
    await waitFor(() => screen.getByLabelText('New password'))

    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'Abcdefg1!' } })
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'Abcdefg2!' } })
    fireEvent.blur(screen.getByLabelText('Confirm password'))

    expect(screen.getByRole('alert')).toHaveTextContent(/don’t match/i)
    expect(auth.updateUser).not.toHaveBeenCalled()
  })

  it('carries the account email so a password manager can save the change', async () => {
    auth.getSession.mockResolvedValue({
      data: { session: { user: { email: 'jane@acme.com' } } },
    })
    const { container } = render(<ResetForm />)
    await waitFor(() => screen.getByLabelText('New password'))

    const username = container.querySelector('input[autocomplete="username"]')
    expect(username).toHaveValue('jane@acme.com')
    // Must not be type=hidden — managers skip hidden inputs.
    expect(username).toHaveAttribute('type', 'text')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
/**
 * The invite screen runs the SAME state machine on the SAME hook. These are not
 * duplicated assertions for their own sake: the reason the logic was extracted
 * is that the two screens must not drift, and a test that only covers one of
 * them would not notice if they did.
 */
describe('accept invite — session validation', () => {
  it('checks for a session before asking for a name or a password', async () => {
    let resolve!: (v: unknown) => void
    auth.getSession.mockReturnValue(new Promise((r) => (resolve = r)))
    render(<AcceptInviteForm />)

    expect(screen.queryByLabelText('Full name')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(/checking your invite/i)

    resolve({ data: { session: { user: { email: 'new@acme.com' } } } })
    await waitFor(() => expect(screen.getByLabelText('Full name')).toBeInTheDocument())
  })

  it('refuses an expired invite before any effort is spent', async () => {
    auth.getSession.mockResolvedValue({ data: { session: null } })
    render(<AcceptInviteForm />)

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /this invite has expired/i })).toBeInTheDocument(),
    )
    expect(screen.queryByLabelText('Full name')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument()
    expect(auth.updateUser).not.toHaveBeenCalled()
  })

  it('offers no self-serve action, because there is none', async () => {
    // An expired reset can be re-requested by the person standing there. An
    // expired invite can only be reissued by an admin — a button here would be
    // a control that cannot work.
    auth.getSession.mockResolvedValue({ data: { session: null } })
    render(<AcceptInviteForm />)
    await waitFor(() => screen.getByRole('heading', { name: /this invite has expired/i }))

    expect(screen.queryByRole('link', { name: /request a new/i })).not.toBeInTheDocument()
    expect(screen.getByText(/ask whoever invited you/i)).toBeInTheDocument()
    // The way back out is still offered.
    expect(screen.getByRole('link', { name: /back to sign in/i })).toHaveAttribute(
      'href',
      '/auth/login',
    )
  })

  it('survives the same getSession / auth-event race the reset screen had', async () => {
    auth.getSession.mockResolvedValue({ data: { session: null } })
    let fire!: (e: string, s: unknown) => void
    auth.onAuthStateChange.mockImplementation((cb: (e: string, s: unknown) => void) => {
      fire = cb
      return idleSubscription
    })
    render(<AcceptInviteForm />)
    act(() => fire('SIGNED_IN', { user: { email: 'new@acme.com' } }))
    await waitFor(() => expect(screen.getByLabelText('Full name')).toBeInTheDocument())
    // The in-flight null must not tear the form down.
    expect(screen.getByLabelText('Full name')).toBeInTheDocument()
  })

  it('confirms on screen instead of redirecting into the product', async () => {
    auth.getSession.mockResolvedValue({ data: { session: { user: { email: 'new@acme.com' } } } })
    auth.updateUser.mockResolvedValue({ error: null })
    render(<AcceptInviteForm />)
    await waitFor(() => screen.getByLabelText('Full name'))

    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Jane Recruiter' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Abcdefg1!' } })
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'Abcdefg1!' } })
    fireEvent.click(screen.getByRole('button', { name: /join hirelens/i }))

    // EXACT. "You’re in." is a substring of "You’re invited.", so a loose
    // matcher here resolves against the form's own heading and the test passes
    // without the confirmation screen ever rendering — which is exactly what
    // happened to the browser QA before this was caught.
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'You’re in.' })).toBeInTheDocument(),
    )
    expect(screen.queryByLabelText('Full name')).not.toBeInTheDocument()
    expect(router.replace).not.toHaveBeenCalled()
    expect(auth.updateUser).toHaveBeenCalledWith({
      password: 'Abcdefg1!',
      data: { full_name: 'Jane Recruiter' },
    })
  })

  it('carries the invited address for the password manager', async () => {
    auth.getSession.mockResolvedValue({ data: { session: { user: { email: 'new@acme.com' } } } })
    const { container } = render(<AcceptInviteForm />)
    await waitFor(() => screen.getByLabelText('Full name'))

    const username = container.querySelector('input[autocomplete="username"]')
    expect(username).toHaveValue('new@acme.com')
    expect(username).toHaveAttribute('type', 'text')
  })

  it('will not submit an incomplete or mismatched form', async () => {
    auth.getSession.mockResolvedValue({ data: { session: { user: { email: 'new@acme.com' } } } })
    render(<AcceptInviteForm />)
    await waitFor(() => screen.getByLabelText('Full name'))

    const join = screen.getByRole('button', { name: /join hirelens/i })
    expect(join).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Jane' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Abcdefg1!' } })
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'Abcdefg2!' } })
    expect(join).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'Abcdefg1!' } })
    expect(join).toBeEnabled()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('the link-session pattern is shared, not copied', () => {
  it('both link screens import the same hook', async () => {
    // The whole point of the extraction. If either screen grows its own copy of
    // the getSession/auth-event dance, the race gets fixed in one place and not
    // the other — which is exactly how the invite screen came to be broken
    // after the reset screen was fixed.
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    for (const file of [
      'components/hirelens/auth/reset-form.tsx',
      'components/hirelens/auth/accept-form.tsx',
    ]) {
      const source = readFileSync(resolve(process.cwd(), file), 'utf-8')
      expect(source, `${file} must use the shared hook`).toMatch(/useLinkSession/)
      expect(source, `${file} must not re-implement the session read`).not.toMatch(
        /onAuthStateChange/,
      )
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('forgot password', () => {
  it('shows the same confirmation whether or not the account exists', async () => {
    auth.resetPasswordForEmail.mockResolvedValue({ error: null })
    render(<ForgotForm />)
    fireEvent.change(screen.getByLabelText('Work email'), { target: { value: 'a@b.com' } })
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }))

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /check your inbox/i })).toBeInTheDocument(),
    )
    // The wording must stay conditional — this screen cannot become an oracle
    // for which addresses are registered.
    expect(screen.getByText(/if an account exists for/i)).toBeInTheDocument()
  })

  it('translates a rate limit instead of rendering the API string', async () => {
    auth.resetPasswordForEmail.mockResolvedValue({
      error: new Error('For security purposes, you can only request this after 47 seconds'),
    })
    render(<ForgotForm />)
    fireEvent.change(screen.getByLabelText('Work email'), { target: { value: 'a@b.com' } })
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }))

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(screen.getByRole('alert')).toHaveTextContent(/too many attempts/i)
    expect(screen.queryByText(/for security purposes/i)).not.toBeInTheDocument()
  })

  it('offers a resend, rate-limited before Supabase has to say no', async () => {
    auth.resetPasswordForEmail.mockResolvedValue({ error: null })
    render(<ForgotForm />)
    fireEvent.change(screen.getByLabelText('Work email'), { target: { value: 'a@b.com' } })
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }))

    await waitFor(() => screen.getByRole('heading', { name: /check your inbox/i }))
    const resend = screen.getByRole('button', { name: /send again in \d+s/i })
    expect(resend).toBeDisabled()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('sign-in autofill and focus', () => {
  async function reachPasswordStep() {
    const view = render(<LoginForm />)
    fireEvent.change(screen.getByLabelText('Work email'), { target: { value: 'jane@acme.com' } })
    // Anchored: "Continue with SSO" is also on this step.
    fireEvent.click(screen.getByRole('button', { name: /^continue$/i }))
    await waitFor(() => screen.getByLabelText('Password'))
    return view
  }

  it('keeps the email in the form once the field is replaced by a chip', async () => {
    // Without this the password step is a form with no username field, which
    // password managers will neither fill nor offer to save.
    const { container } = await reachPasswordStep()
    const username = container.querySelector('input[autocomplete="username"]')
    expect(username).toHaveValue('jane@acme.com')
    expect(username).toHaveAttribute('type', 'text')
    expect((username as HTMLInputElement).tabIndex).toBe(-1)
  })

  it('asks for the current password, not a new one', async () => {
    await reachPasswordStep()
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'current-password')
  })

  it('offers the reveal toggle on sign-in too', async () => {
    await reachPasswordStep()
    expect(screen.getByRole('button', { name: 'Show password' })).toBeInTheDocument()
  })

  it('does not impose new-password rules on an existing password', async () => {
    // Someone whose password predates the checklist must still be able to sign
    // in with it; the requirement list belongs only on screens that SET one.
    await reachPasswordStep()
    expect(screen.queryByText('At least 8 characters')).not.toBeInTheDocument()
  })

  it('returns focus to the password when sign-in is rejected', async () => {
    auth.signInWithPassword.mockResolvedValue({ error: new Error('Invalid login credentials') })
    await reachPasswordStep()
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong-one' } })
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }))

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(document.activeElement).toBe(screen.getByLabelText('Password'))
    expect(screen.getByRole('alert')).toHaveTextContent(/don’t match/i)
  })
})
