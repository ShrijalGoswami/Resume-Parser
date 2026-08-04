/**
 * Turn an auth error into something a person can act on.
 *
 * Supabase's messages are API strings, not product copy, and they were being
 * rendered verbatim: a mistyped password put "Invalid login credentials" on the
 * sign-in screen — the one screen where a stranger forms their first impression
 * of how carefully this product is made. It also fails the only test that
 * matters for an error message, which is whether the reader knows what to do
 * next.
 *
 * Deliberately NOT distinguishing "no such account" from "wrong password": the
 * sign-in surface must not confirm whether an email is registered, which is the
 * same reason the magic-link path shows its confirmation either way.
 *
 * Anything unrecognized falls through to a calm generic line rather than the
 * raw string, so a new upstream message can never leak into the UI.
 */

const PATTERNS: ReadonlyArray<[RegExp, string]> = [
  [
    /invalid login credentials|invalid grant/i,
    'That email and password don’t match. Check both and try again.',
  ],
  [
    /email not confirmed/i,
    'Confirm your email first — open the link we sent when you created the account.',
  ],
  [
    /email logins are disabled|signups not allowed/i,
    'Password sign-in is turned off for this workspace. Use SSO or a magic link.',
  ],
  [
    // Supabase phrases this as "For security purposes, you can only request
    // this after N seconds", which reads as an accusation rather than a wait.
    /rate limit|too many requests|only request this after/i,
    'Too many attempts. Wait a moment and try again.',
  ],
  [
    /user not found/i,
    'That email and password don’t match. Check both and try again.',
  ],
  [
    /network|fetch failed|failed to fetch/i,
    'We couldn’t reach HireLens. Check your connection and try again.',
  ],
]

const GENERIC = 'We couldn’t sign you in. Try again in a moment.'

export function authErrorMessage(error: unknown, fallback: string = GENERIC): string {
  const raw = error instanceof Error ? error.message : typeof error === 'string' ? error : ''
  if (!raw) return fallback
  for (const [pattern, message] of PATTERNS) {
    if (pattern.test(raw)) return message
  }
  return fallback
}
