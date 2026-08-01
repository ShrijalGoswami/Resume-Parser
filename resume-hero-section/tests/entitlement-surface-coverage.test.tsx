// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Client-lock coverage.
 *
 * Phase 2.4 shipped believing the locks were done; they were not. Talent Search
 * and Interview Intelligence were both gated on the server and ungated in the
 * UI, so a Free organization met a raw 402 in a query-error state. Nothing
 * failed — no test knew the mapping between a server gate and a client surface
 * existed, so the gap was invisible until someone read the routers by hand.
 *
 * This file is that mapping, written down. Every catalog feature is either
 * locked in the UI, or carries a recorded reason why it needs no lock. Adding a
 * feature to the catalog without deciding which fails the suite — the same
 * discipline `test_monetization_audit.py` applies to the 87 backend routes.
 */

const ctx = vi.hoisted(() => ({ data: undefined as unknown }))

vi.mock('../components/hirelens/lib/api/org-context', () => ({
  orgContextKey: ['hl', 'settings', 'org-context'],
  useOrgContext: () => ({ data: ctx.data, isLoading: false, isError: false, refetch: () => {} }),
}))

import { FEATURE_KEYS } from '../components/hirelens/lib/entitlements/catalog'
import { FeatureLock } from '../components/hirelens/entitlements'

const root = resolve(process.cwd(), 'components')
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf-8')

/**
 * Features locked in a client surface, and where.
 *
 * A key here is a promise that the named file gates it. The assertion below
 * checks the file actually references the feature — a lock that was removed in
 * a refactor should break this, not slip through.
 */
const LOCKED_IN: Record<string, string> = {
  ai_copilot: 'hirelens/ask/ask-screen.tsx',
  advanced_analytics: 'hirelens/analytics/analytics-screen.tsx',
  candidate_comparison: 'hirelens/workspace/multiselect-toolbar.tsx',
  semantic_search: 'hirelens/talent/talent-screen.tsx',
  interview_intelligence: 'hirelens/interviews/interviews-screen.tsx',
}

/**
 * Features with NO client lock, and the reason. Each of these was checked
 * against the code, not assumed.
 */
const NO_CLIENT_LOCK: Record<string, string> = {
  // Free tier — nothing to lock.
  resume_parser: 'Included on every plan.',
  ats_score: 'Included on every plan.',
  basic_ai_summary: 'Included on every plan.',

  // Metered rather than locked: the résumé quota surfaces are the gate.
  full_resume_analysis:
    'Enforced as the résumé quota at /batch-analysis, which the upload dialog gates by count, not by capability.',

  // Verified 1 Aug 2026 — these have no client call site to gate.
  export_pdf:
    'The `/export/*` routes have NO client caller — there is no export-api service. The only "Export PDF" in the UI (interview packs) is lib/interview-pdf.ts, which builds HTML and prints locally without touching the server. Gating it would refuse an action the server never sees, on data already delivered.',
  export_excel: 'No endpoint and no UI. Declared in the catalog for matrix completeness only.',

  // Gated server-side; no dedicated UI surface exists yet to lock.
  executive_reports: 'The reports router is gated server-side; no V4 screen calls it.',
  predictive_intelligence: 'Prediction router gated server-side; no V4 screen calls it.',
  org_knowledge:
    'Knowledge router gated server-side. The Learning screen is an honest "not built yet" placeholder with no backend, so locking it would sell a capability the customer cannot receive.',
  integrations: 'Settings ▸ Integrations is gated server-side at the router; no lock surface built yet.',
  webhooks: 'Per-endpoint Enterprise gate inside the integrations router; no dedicated UI.',
  autonomous_agent: 'Agent endpoints gated per-endpoint; the Ledger surface reads ungated data.',

  // Account-level capabilities with no in-product control to lock.
  byo_ai: 'Phase 4. No UI exists.',
  api_access: 'Settings ▸ API keys is permission-gated; the entitlement has no separate control.',
  sso: 'Provisioned out of band; no in-product control.',
  audit_logs:
    'Deliberately ungated on the read route — every org can read its own history. Gating would hide a customer record behind a plan.',
  dedicated_support: 'Commercial, not a product surface.',
}

beforeEach(() => {
  cleanup()
  ctx.data = undefined
})

describe('every catalog feature has a lock or a recorded reason', () => {
  it('classifies all of them — no silent gaps', () => {
    const unclassified = FEATURE_KEYS.filter(
      (key) => !(key in LOCKED_IN) && !(key in NO_CLIENT_LOCK),
    )
    expect(
      unclassified,
      'New catalog feature with no client-lock decision. Add it to LOCKED_IN (and build the lock) or to NO_CLIENT_LOCK with a reason.',
    ).toEqual([])
  })

  it('never claims both at once', () => {
    const both = FEATURE_KEYS.filter((key) => key in LOCKED_IN && key in NO_CLIENT_LOCK)
    expect(both).toEqual([])
  })

  it('every recorded reason is an actual sentence, not a placeholder', () => {
    for (const [key, reason] of Object.entries(NO_CLIENT_LOCK)) {
      expect(reason.length, `reason for ${key} is too short to be a decision`).toBeGreaterThan(20)
    }
  })

  it('every claimed lock really references its feature', () => {
    // A lock deleted during a refactor should fail here rather than leave this
    // table asserting something that stopped being true.
    for (const [key, file] of Object.entries(LOCKED_IN)) {
      expect(read(file), `${file} no longer references "${key}"`).toContain(key)
    }
  })

  it('every claimed lock uses the shared primitives', () => {
    for (const [, file] of Object.entries(LOCKED_IN)) {
      const source = read(file)
      expect(
        /FeatureLock|LockedButton|PlanGate/.test(source),
        `${file} gates without a shared lock component`,
      ).toBe(true)
    }
  })
})

describe('the two Phase 2.5 locks render the shared surface', () => {
  it('Talent Search', () => {
    render(<FeatureLock feature="semantic_search" requiredPlan="pro" />)
    expect(screen.getByText('Semantic Search is available on the Pro plan.')).toBeInTheDocument()
    expect(screen.getByText('Search your talent pool by meaning, not keywords.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Upgrade to Pro' })).toBeInTheDocument()
  })

  it('Interview Intelligence', () => {
    render(<FeatureLock feature="interview_intelligence" requiredPlan="pro" />)
    expect(
      screen.getByText('Interview Intelligence is available on the Pro plan.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText("Generated interview packs grounded in the candidate's résumé."),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Upgrade to Pro' })).toBeInTheDocument()
  })
})

describe('Talent does not fire a search it knows will be refused', () => {
  it('disables the query on a resolved denial only', () => {
    const source = read('hirelens/talent/talent-screen.tsx')
    // Loading and error must NOT disable it: the server is the authority, and
    // withholding on a failed context check is the mistake this codebase keeps
    // designing out.
    expect(source).toContain("searchPlan.state !== 'denied'")
  })
})

describe('Export is deliberately unlocked, and stays local', () => {
  it('interview PDF export never calls the server', () => {
    // The moment this stops being true, `export_pdf` needs a client lock and
    // its NO_CLIENT_LOCK reason becomes false.
    const source = readFileSync(resolve(process.cwd(), 'lib/interview-pdf.ts'), 'utf-8')
    expect(source).not.toMatch(/fetch\(|axios|XMLHttpRequest|\/api\/v1/)
  })

  it('no client calls the gated /export routes', () => {
    const source = read('hirelens/analytics/analytics-screen.tsx')
    // Analytics "Export CSV" serialises the overview already in memory.
    expect(source).toContain('URL.createObjectURL')
    expect(source).not.toMatch(/\/api\/v1\/export/)
  })
})
