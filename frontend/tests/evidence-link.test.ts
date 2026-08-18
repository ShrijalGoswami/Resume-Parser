import { describe, it, expect } from 'vitest'
import { findClaimSupport } from '../components/hirelens/candidate-object/evidence-link'
import type { ResumeData } from '../types/batch'

/**
 * The evidence lookup's contract is mostly about what it REFUSES to do. It is
 * a search over the parsed résumé, not a citation index, so the tests that
 * matter are the ones proving it stays quiet when it has nothing — a false
 * match here would put invented provenance under a hiring decision.
 */
const resume = (over: Partial<ResumeData> = {}): ResumeData => ({
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  phone: '',
  skills: ['Docker', 'Go', 'PostgreSQL'],
  education: [
    { institution: 'VIT Bhopal', degree: 'B.Tech Computer Science', duration: '2024 – 2028', gpa: '8.4' },
  ],
  experience: [
    {
      company: 'Pinnacle Labs',
      role: 'AI/ML Engineer',
      duration: '2025 – 2026',
      description: ['Built retrieval pipelines with Sentence Transformer embeddings and BM25'],
    },
  ],
  projects: [
    { title: 'Hirevo', description: ['Containerized the ranking service and deployed it on Render'] },
  ],
  certifications: ['DataForge Hackathon Finalist'],
  ...over,
})

describe('findClaimSupport — a lookup, never an invented citation', () => {
  it('links a claim to a skill it names, when the résumé lists that skill', () => {
    const found = findClaimSupport('Familiarity with containerization using Docker', resume())
    expect(found.some((f) => f.category === 'skill' && f.detail === 'Docker')).toBe(true)
  })

  it('matches a whole word only, so "Go" cannot match "Google"', () => {
    const found = findClaimSupport('Worked extensively with Google Cloud', resume())
    expect(found.some((f) => f.category === 'skill' && f.detail === 'Go')).toBe(false)
  })

  it('returns a résumé line that shares distinctive wording, verbatim', () => {
    const found = findClaimSupport('Built retrieval pipelines using embeddings', resume())
    const line = found.find((f) => f.category === 'experience')
    expect(line?.detail).toBe(
      'Built retrieval pipelines with Sentence Transformer embeddings and BM25',
    )
    expect(line?.context).toBe('AI/ML Engineer · Pinnacle Labs')
  })

  it('returns NOTHING when the résumé does not echo the claim', () => {
    expect(findClaimSupport('Led a team of twelve engineers through a reorg', resume())).toEqual([])
  })

  it('does not match on a single common word', () => {
    // "pipelines" alone appears in the résumé, but one shared word is noise.
    expect(findClaimSupport('Owns delivery pipelines', resume())).toEqual([])
  })

  it('returns nothing when there is no parsed résumé at all', () => {
    expect(findClaimSupport('Anything at all', null)).toEqual([])
  })
})
