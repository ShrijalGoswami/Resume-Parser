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
  // ── Account creation and password change ────────────────────────────────
  [
    /user already registered|already been registered/i,
    'That email already has an account. Sign in instead, or reset your password.',
  ],
  [
    // Supabase's own wording names the constraint but not the remedy, and it
    // varies with the project's password policy — which this client cannot
    // read. Deferring to the server's requirement rather than restating a
    // number that may be wrong. See `lib/password-policy.ts`.
    /password should be at least|password is too short|weak.?password|password should contain/i,
    'That password doesn’t meet the requirements. Try a longer one with a mix of characters.',
  ],
  [
    /new password should be different|same.*(as|to).*(old|current) password/i,
    'That’s already your password. Choose a different one.',
  ],
  [
    // The recovery session is gone: expired link, a link already spent, or a
    // reset opened on a different device from the one that requested it.
    /session.?not.?found|invalid.?claim|jwt expired|token has expired|refresh.?token.?not.?found/i,
    'That link has expired. Request a new one and try again.',
  ],
  [
    /email address.*invalid|unable to validate email/i,
    'That doesn’t look like an email address we can send to.',
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
