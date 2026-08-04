import { describe, it, expect } from 'vitest'
import {
  PASSWORD_MIN_LENGTH,
  confirmError,
  isPasswordAcceptable,
  passwordBlockingError,
  passwordRules,
} from '../lib/password-policy'

/**
 * The policy module, pinned.
 *
 * The property worth defending here is not "does it detect a short password" —
 * it is that the client refuses EXACTLY what the server refuses and no more.
 * A client-side rule the server does not share rejects passwords that would
 * have worked, and on a reset screen that means locking someone out of their
 * own account with a message they cannot act on.
 */
describe('password policy', () => {
  it('blocks only on length', () => {
    // Every advisory rule failing at once, with the length rule met.
    expect(isPasswordAcceptable('aaaaaaaa')).toBe(true)
    expect(passwordBlockingError('aaaaaaaa')).toBeNull()
  })

  it('the blocking minimum is the one the fields already enforced', () => {
    expect(PASSWORD_MIN_LENGTH).toBe(8)
    expect(isPasswordAcceptable('a'.repeat(PASSWORD_MIN_LENGTH - 1))).toBe(false)
    expect(isPasswordAcceptable('a'.repeat(PASSWORD_MIN_LENGTH))).toBe(true)
  })

  it('exactly one rule is allowed to block', () => {
    // If a future edit marks `case` or `number` required, this fails — which is
    // the point. Tightening the policy is a deliberate act that should also
    // update the Supabase dashboard, not a quiet edit to an array.
    const required = passwordRules('').filter((r) => r.required)
    expect(required.map((r) => r.id)).toEqual(['length'])
  })

  it('says nothing about an untouched field', () => {
    expect(passwordBlockingError('')).toBeNull()
    expect(confirmError('', '')).toBeNull()
    // A password typed but no confirmation yet is not a mismatch.
    expect(confirmError('correct-horse', '')).toBeNull()
  })

  it('an empty password is not acceptable, merely not yet wrong', () => {
    expect(isPasswordAcceptable('')).toBe(false)
    expect(passwordBlockingError('')).toBeNull()
  })

  it('reports every rule with its state, met or not', () => {
    const weak = passwordRules('abc')
    expect(weak.map((r) => r.id)).toEqual(['length', 'case', 'number'])
    expect(weak.every((r) => !r.met)).toBe(true)

    const strong = passwordRules('Correct-Horse9')
    expect(strong.every((r) => r.met)).toBe(true)
  })

  it('counts symbols as satisfying the number rule', () => {
    // The label says "A number or symbol"; the check must agree with the label.
    const rule = passwordRules('Passw!rdd').find((r) => r.id === 'number')
    expect(rule?.met).toBe(true)
  })

  it('requires both cases for the case rule, not either', () => {
    expect(passwordRules('alllowercase').find((r) => r.id === 'case')?.met).toBe(false)
    expect(passwordRules('ALLUPPERCASE').find((r) => r.id === 'case')?.met).toBe(false)
    expect(passwordRules('MixedCasePwd').find((r) => r.id === 'case')?.met).toBe(true)
  })

  it('detects a mismatch only once there is something to compare', () => {
    expect(confirmError('abcdefgh', 'abcdefgh')).toBeNull()
    expect(confirmError('abcdefgh', 'abcdefg')).toBeTruthy()
    // Whitespace is significant — trimming a password silently changes it.
    expect(confirmError('abcdefgh', 'abcdefgh ')).toBeTruthy()
  })
})
