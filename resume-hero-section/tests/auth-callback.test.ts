import { describe, it, expect, vi, beforeEach } from 'vitest'

// Shared auth mocks, hoisted so the vi.mock factory can reference them.
const { exchangeCodeForSession, verifyOtp } = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  verifyOtp: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: async () => ({
    auth: { exchangeCodeForSession, verifyOtp },
  }),
}))

import { GET } from '../app/auth/callback/route'

beforeEach(() => {
  exchangeCodeForSession.mockReset()
  verifyOtp.mockReset()
})

describe('auth callback route', () => {
  it('exchanges a PKCE ?code= for a session and redirects to next', async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null })
    const res = await GET(new Request('http://localhost/auth/callback?code=abc123&next=/home'))
    expect(exchangeCodeForSession).toHaveBeenCalledWith('abc123')
    expect(verifyOtp).not.toHaveBeenCalled()
    expect(res.headers.get('location')).toBe('http://localhost/home')
  })

  it('verifies an OTP ?token_hash=&type= link and redirects to next', async () => {
    verifyOtp.mockResolvedValue({ error: null })
    const res = await GET(
      new Request('http://localhost/auth/callback?token_hash=xyz&type=recovery&next=/home'),
    )
    expect(verifyOtp).toHaveBeenCalledWith({ type: 'recovery', token_hash: 'xyz' })
    expect(exchangeCodeForSession).not.toHaveBeenCalled()
    expect(res.headers.get('location')).toBe('http://localhost/home')
  })

  it('returns to sign-in with an error when neither code nor token_hash is present', async () => {
    const res = await GET(new Request('http://localhost/auth/callback'))
    expect(res.headers.get('location')).toBe('http://localhost/auth/login?error=link_invalid')
  })

  it('returns to sign-in with an error when the exchange fails', async () => {
    exchangeCodeForSession.mockResolvedValue({ error: { message: 'bad code' } })
    const res = await GET(new Request('http://localhost/auth/callback?code=bad'))
    expect(res.headers.get('location')).toBe('http://localhost/auth/login?error=link_invalid')
  })

  it('guards against an open redirect in next', async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null })
    const res = await GET(
      new Request('http://localhost/auth/callback?code=abc&next=https://evil.example.com'),
    )
    expect(res.headers.get('location')).toBe('http://localhost/home')
  })
})
