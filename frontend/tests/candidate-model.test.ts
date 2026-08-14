import { describe, it, expect } from 'vitest'
import { buildCandidateModel, type CandidateModel } from '../components/hirelens/candidate-object/model'
import type { Candidate } from '@/types/campaign'

// Minimal Candidate with an embedded analysis result (the shape getCandidateResult reads).
function candidate(overrides: Partial<Candidate>, result?: Record<string, unknown>): Candidate {
  return {
    id: 'c1',
    campaign_id: 'r1',
    recruiter_id: 'u1',
    full_name: 'Ada Lovelace',
    email: null,
    phone: null,
    resume_path: null,
    resume_filename: null,
    stage: 'sourced',
    is_favorite: false,
    metadata: {},
    latest_analysis: result ? { result } : null,
    ...overrides,
  } as unknown as Candidate
}

const RESULT = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  phone: '+1',
  overall_score: 87.6,
  match_category: 'strong match',
  recommendation: 'Advance to onsite',
  recommendation_explanation: 'Deep systems background.',
  summary: 'A strong systems engineer.',
  strengths: ['Owned a 40M-user pipeline'],
  weaknesses: ['Limited frontend exposure'],
  experience_relevance: '8 years in distributed systems.',
  relevant_projects: ['Realtime ranking service'],
  matching_skills: ['Kafka', 'Go'],
  missing_skills: ['React'],
  interview_questions: ['Walk through the ranking pipeline.'],
}

describe('buildCandidateModel — the single normalized shape', () => {
  it('returns null for a missing candidate', () => {
    expect(buildCandidateModel('r1', null)).toBeNull()
    expect(buildCandidateModel('r1', undefined)).toBeNull()
  })

  it('normalizes an analyzed candidate (verdict = recommendation, summary separate)', () => {
    const m = buildCandidateModel('r1', candidate({}, RESULT)) as CandidateModel
    expect(m.hasAnalysis).toBe(true)
    expect(m.name).toBe('Ada Lovelace')
    expect(m.matchCategory).toBe('strong match')
    expect(m.confidence).toBe(88) // rounded overall_score
    expect(m.verdict).toBe('Advance to onsite') // recommendation, NOT summary
    expect(m.summary).toBe('A strong systems engineer.') // distinct from verdict
    expect(m.verdictReasoning).toBe('Deep systems background.')
    expect(m.strengths).toEqual(['Owned a 40M-user pipeline'])
    expect(m.risks).toEqual(['Limited frontend exposure']) // weaknesses → risks
    expect(m.matchedSkills).toEqual(['Kafka', 'Go'])
    expect(m.missingSkills).toEqual(['React'])
    expect(m.interviewQuestions).toEqual(['Walk through the ranking pipeline.'])
    expect(m.roleId).toBe('r1')
  })

  it('is honest when there is no analysis (hasAnalysis false, no invented values)', () => {
    const m = buildCandidateModel('r1', candidate({ full_name: 'No Analysis' })) as CandidateModel
    expect(m.hasAnalysis).toBe(false)
    expect(m.confidence).toBeNull()
    expect(m.verdict).toBe('')
    expect(m.summary).toBe('')
    expect(m.strengths).toEqual([])
    expect(m.name).toBe('No Analysis')
  })

  it('falls back through name sources and reflects résumé/stage', () => {
    const m = buildCandidateModel(
      'r1',
      candidate({ full_name: '', resume_filename: 'ada.pdf', resume_path: 'u1/r1/c1/ada.pdf', stage: 'interview' }),
    ) as CandidateModel
    expect(m.name).toBe('ada.pdf') // falls back to filename
    expect(m.resumePath).toBe('u1/r1/c1/ada.pdf')
    expect(m.resumeFilename).toBe('ada.pdf')
    expect(m.stage).toBe('interview')
  })
})

describe('Candidate Object barrel — every required section is exported', () => {
  // Explicit timeout: this assertion is structural (do the exports exist), but
  // its runtime is dominated by transforming the barrel's cold module graph,
  // which now includes the RBAC gate the decision bar and notes section read.
  // In isolation it lands just under the 5s default and just over it under full
  // suite load — a wall clock measuring bundler throughput, not correctness.
  it('exports all 13 sections + both compositions', async () => {
    const mod = await import('../components/hirelens/candidate-object')
    const required = [
      'CandidateHeader', 'CandidateVerdict', 'CandidateConfidence', 'CandidateSummary',
      'CandidateStrengths', 'CandidateRisks', 'CandidateEvidence', 'CandidateSkills',
      'CandidateInterviewQuestions', 'CandidateResume', 'CandidateNotes', 'CandidateActivity',
      'CandidateDecisionBar', 'CandidatePeek', 'CandidateFullDossier',
    ]
    for (const name of required) {
      expect(typeof (mod as Record<string, unknown>)[name]).toBe('function')
    }
  }, 30_000)
})
