import { describe, it, expect } from 'vitest'
import { emptyInboxState } from '../components/hirelens/home/inbox-meta'

/**
 * A5 — the empty Decision Inbox must be HONEST: never claim the user is "caught
 * up" / "healthy" before anything has been evaluated, and always offer a real
 * next step. These assert the deterministic copy rules (no React rendering).
 */
describe('emptyInboxState — honest empty inbox (A5)', () => {
  it('first run (no roles) invites creating a role, with a CTA', () => {
    const s = emptyInboxState(true)
    expect(s.variant).toBe('first-run')
    expect(s.title).toBe("Let's fill your first role")
    expect(s.cta).toEqual({ label: 'Create a role', href: '/roles?new=1' })
  })

  it('roles but no recommendations → honest "no recommendations yet" + Run-scan CTA to Ask', () => {
    const s = emptyInboxState(false)
    expect(s.variant).toBe('no-recommendations')
    expect(s.title).toBe('No recommendations yet')
    // Explains that recommendations come from a scan and do not auto-surface.
    expect(s.description).toMatch(/after an AI scan/i)
    expect(s.description).toMatch(/don't surface on their own/i)
    // Next step navigates to the (feature-gated) scan entry point — never inline.
    expect(s.cta).toEqual({ label: 'Run your first AI scan', href: '/ask' })
  })

  it('never uses misleading "caught up" / "healthy" framing in either state', () => {
    for (const rolesEmpty of [true, false]) {
      const s = emptyInboxState(rolesEmpty)
      const text = `${s.title} ${s.description}`.toLowerCase()
      expect(text).not.toContain('caught up')
      expect(text).not.toContain('looks healthy')
      expect(text).not.toContain('nothing needs')
    }
  })

  it('always offers an actionable next step (non-empty label + href)', () => {
    for (const rolesEmpty of [true, false]) {
      const { cta } = emptyInboxState(rolesEmpty)
      expect(cta.label.length).toBeGreaterThan(0)
      expect(cta.href.startsWith('/')).toBe(true)
    }
  })
})
