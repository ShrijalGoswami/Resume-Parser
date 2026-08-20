// @vitest-environment jsdom
/**
 * Customers interact with Hirevo, not the LLM vendor underneath it.
 *
 * `GAB-D1` found `"Powered by Groq LLM"` on the footer of every exported PDF
 * the backend generates. That is fixed and guarded there
 * (`backend/tests/test_export_attribution.py`). This file guards the frontend's
 * only equivalent: the interview pack, which is assembled here as an HTML
 * document and handed to the browser's print dialog.
 *
 * It was already clean. That is exactly when a guard is cheapest to add — the
 * backend one was written *after* the violation shipped and sat unnoticed for
 * months, because nothing failed.
 *
 * Two reasons the rule holds, and the second outlives the governance rule:
 *
 *   1. Naming the supplier presents a procurement choice as a quality signal
 *      (Checklist §8.9, Gate 2).
 *   2. It is a claim that goes stale on its own. Provider selection is
 *      configuration with a fallback chain, so the vendor that answered is not
 *      knowable when the template is written — and an exported pack outlives
 *      the request that made it.
 *
 * SCOPE: the rendered artifact only. `Groq` is referenced legitimately across
 * the repo (adapters, env vars, the model registry, ADRs, and the skills
 * taxonomy — candidates list it on their résumés). This bans it on what a
 * customer receives, nowhere else. It is not a snapshot: it asserts what must
 * be absent and the one attribution that must be present, so wording and layout
 * stay free to change.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { exportInterviewPdf } from '@/lib/interview-pdf'
import type { InterviewPack } from '@/types/interview'

/** Model vendors, and the phrasing that turns one into a quality signal. */
const VENDOR =
  /\b(groq|openai|anthropic|claude|gemini|llama|mistral|moonshot|kimi|openrouter|gpt|powered\s+by)\b/i

const REQUIRED_ATTRIBUTION = /Hirevo/

/**
 * Deliberately bland: nothing in the fixture trips VENDOR on its own, so a hit
 * is always the template's doing. (The denylist includes `claude` and `gemini`,
 * which are also human names — safe here only because this is a fixture we
 * control. It is a build-time guard on the template, never a filter on
 * customer data.)
 */
function pack(overrides: Partial<InterviewPack> = {}): InterviewPack {
  return {
    executive_summary: {
      who: 'Backend engineer, eight years',
      why_shortlisted: 'Depth in payments infrastructure.',
      key_differentiators: ['Scaled a ledger to 40k writes/sec'],
    },
    interview_strategy: {
      recommended_duration_minutes: 60,
      stages: [{ name: 'Systems design', duration_minutes: 40, focus: 'Consistency trade-offs' }],
      priority_focus_areas: ['Idempotency'],
      suggested_interviewer_profile: 'Senior backend engineer',
    },
    technical_questions: [
      {
        question: 'How would you make a payment webhook idempotent?',
        skill: 'Distributed systems',
        difficulty: 'Hard',
        reason: 'Directly matches the role.',
        expected_answer: 'Insert-first on a composite key.',
        red_flags: ['Relies on client-side dedupe'],
        followups: ['What about replays?'],
        evaluation_criteria: ['Names a durable key'],
      },
    ],
    behavioral_questions: [
      {
        question: 'Describe a rollback you led.',
        competency: 'Ownership',
        reason: 'Signals incident maturity.',
        expected_answer: 'Specific, with a measured outcome.',
        warning_signs: ['Blames another team'],
      },
    ],
    skill_verifications: [
      {
        skill: 'PostgreSQL',
        verification_method: 'Live query review',
        hands_on_exercise: 'Explain an index choice',
        discussion_topic: 'Locking',
        confidence_level: 'Medium',
      },
    ],
    risks: [
      { category: 'Tenure', detail: 'Two short stints', how_to_investigate: 'Ask about context' },
    ],
    scorecard: [
      { category: 'Systems design', weight: 40, suggested_focus: 'Trade-offs', notes: '' },
    ],
    final_recommendation: {
      recommendation: 'Hire',
      reasoning: 'Strong core match.',
      uncertainty: 'Limited exposure to our stack.',
    },
    candidate_id: 'c-1',
    candidate_name: 'Test Candidate',
    campaign_id: 'r-1',
    focus: 'blueprint',
    sources_used: [],
    degraded: false,
    ...overrides,
  }
}

/** Capture the HTML the exporter writes, without opening a real window. */
function renderedHtml(p: InterviewPack = pack()): string {
  let written = ''
  const fake = {
    document: {
      write: (html: string) => {
        written += html
      },
      close: () => {},
    },
    focus: () => {},
    print: () => {},
  }
  vi.spyOn(window, 'open').mockReturnValue(fake as unknown as Window)
  exportInterviewPdf(p)
  return written
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('exported interview pack attribution', () => {
  it('names no model vendor anywhere in the document', () => {
    const match = renderedHtml().match(VENDOR)
    expect(
      match?.[0],
      `The exported interview pack names "${match?.[0]}" — a customer-visible model-vendor attribution (GAB-D1, Checklist §8.9 Gate 2).`,
    ).toBeUndefined()
  })

  it('carries the neutral Hirevo attribution', () => {
    // Asserted positively so that deleting the attribution — the lazy way to
    // satisfy an absence test — fails too.
    expect(renderedHtml()).toMatch(REQUIRED_ATTRIBUTION)
  })

  it('names no vendor on the degraded path either', () => {
    // The degraded pack takes a different branch and is the one most likely to
    // grow an explanatory "the model was unavailable" line naming the model.
    expect(renderedHtml(pack({ degraded: true }))).not.toMatch(VENDOR)
  })

  it('actually captured a document', () => {
    // Without this, a stubbed window.open returning nothing would make every
    // absence assertion above pass against an empty string.
    const html = renderedHtml()
    expect(html).toContain('Interview Pack')
    expect(html.length).toBeGreaterThan(500)
  })

  it('carries the Hirevo export identity: watermark, per-page footer, export date', () => {
    const html = renderedHtml()
    // Diagonal watermark behind the content on every printed page: a fixed,
    // negative-z-index pseudo-element, with print-color-adjust so the light
    // brand tint survives the print dialog.
    expect(html).toContain("content: 'HIREVO'")
    expect(html).toContain('position: fixed')
    expect(html).toContain('z-index: -1')
    expect(html).toContain('print-color-adjust: exact')
    // Deliberately faint (≤4% opacity): branding, not a design element.
    expect(html).toContain('rgba(37, 99, 235, 0.035)')
    // A4 page box owns the print margins so content cannot reach the edge.
    expect(html).toContain('size: A4')
    // Per-page footer via @page margin boxes (Chromium prints it on each page).
    expect(html).toContain("'Generated by Hirevo · hirevo.in · Page ' counter(page)")
    // Export date in the header attribution line.
    expect(html).toMatch(/Hirevo Interview Intelligence · hirevo\.in · Exported /)
  })

  it('the guard bites on the exact string GAB-D1 removed', () => {
    // Proof the pattern is not vacuous.
    expect('Generated by Hirevo • Powered by Groq LLM • Confidential').toMatch(VENDOR)
    expect('Generated by Hirevo • Confidential').not.toMatch(VENDOR)
  })
})
