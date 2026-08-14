/**
 * What makes a password acceptable, in one place.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE RULE THAT BLOCKS IS THE RULE THE SERVER ALREADY ENFORCED. Every password
 * field in the product carried `minLength={8}`, so eight characters is the
 * product's actual policy; this module does not tighten it. That distinction
 * matters more than it looks: a client that demands an uppercase letter and a
 * digit while the server accepts neither has invented a policy nobody agreed
 * to, and it rejects passwords that would have worked — including, on a reset
 * screen, the one the person is trying to restore.
 *
 * So the rules come in two kinds. `required` blocks submission. The rest are
 * advice, rendered the same way and never fatal, because "a number would make
 * this stronger" is useful and "you may not proceed without a number" is a
 * decision for whoever owns the Supabase auth settings, not for this file.
 *
 * If that dashboard policy is ever tightened, add the rule here with
 * `required: true` and the UI follows — the forms read this module and render
 * whatever it returns. Supabase's own rejection is still mapped in
 * `lib/auth-errors.ts`, so a server rule this file does not know about
 * surfaces as a sentence rather than a raw API string.
 *
 * Pure and dependency-free: no React, no Supabase. The forms decide when to
 * show what; this decides only what is true.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** The product's blocking minimum — matches the `minLength` the fields already carried. */
export const PASSWORD_MIN_LENGTH = 8

export interface PasswordRule {
  id: string
  /** Written as the state being aimed at, so it reads correctly whether met or not. */
  label: string
  met: boolean
  /** `true` blocks submission. `false` is advice. */
  required: boolean
}

/**
 * Evaluate a password against every rule, met or not.
 *
 * Returns all rules rather than only the failures: the list is rendered live as
 * a checklist, and a requirement that disappears once satisfied takes its own
 * explanation with it — the reader loses the ability to see *why* the password
 * is now acceptable.
 */
export function passwordRules(password: string): PasswordRule[] {
  return [
    {
      id: 'length',
      label: `At least ${PASSWORD_MIN_LENGTH} characters`,
      met: password.length >= PASSWORD_MIN_LENGTH,
      required: true,
    },
    {
      id: 'case',
      label: 'Upper and lower case letters',
      met: /[a-z]/.test(password) && /[A-Z]/.test(password),
      required: false,
    },
    {
      id: 'number',
      label: 'A number or symbol',
      met: /[^A-Za-z]/.test(password),
      required: false,
    },
  ]
}

/**
 * The reason this password cannot be submitted, or null.
 *
 * An empty field returns null rather than "too short": the field is untouched,
 * not wrong, and `required` on the input already covers the empty case. Telling
 * someone their password is too short before they have typed anything is how a
 * form manages to be both noisy and useless.
 */
export function passwordBlockingError(password: string): string | null {
  if (!password) return null
  const failed = passwordRules(password).find((rule) => rule.required && !rule.met)
  return failed ? failed.label : null
}

/** Whether this password may be submitted. Empty is not valid, merely not yet wrong. */
export function isPasswordAcceptable(password: string): boolean {
  return password.length > 0 && passwordRules(password).every((r) => !r.required || r.met)
}

/**
 * Whether the confirmation matches, once there is something to compare.
 *
 * Silent until the confirmation field has content — otherwise every reset
 * screen opens by announcing that the passwords do not match, which is true and
 * completely unhelpful.
 */
export function confirmError(password: string, confirm: string): string | null {
  if (!confirm) return null
  return password === confirm ? null : 'Passwords don’t match.'
}
