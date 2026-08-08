// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { CandidateVerdict, CandidateSummary } from '../components/hirelens/candidate-object/sections/ai'
import {
  CandidateStrengths,
  CandidateSkills,
  CandidateInterviewQuestions,
} from '../components/hirelens/candidate-object/sections/evidence'
import type { CandidateModel } from '../components/hirelens/candidate-object/model'

afterEach(cleanup)

const model = (over: Partial<CandidateModel> = {}): CandidateModel => ({
  id: 'c1',
  roleId: 'r1',
  name: 'Ada Lovelace',
  stage: 'sourced',
  email: null,
  phone: null,
  resumePath: 'u1/r1/c1/ada.pdf',
  resumeFilename: 'ada.pdf',
  hasAnalysis: true,
  matchCategory: 'strong match',
  confidence: 88,
  atsScore: 74,
  verdict: 'Advance to onsite',
  verdictReasoning: 'Deep systems background.',
  summary: 'A strong systems engineer.',
  strengths: ['Owned a 40M-user pipeline'],
  risks: ['Limited frontend exposure'],
  experienceRelevance: '8 years in distributed systems.',
  relevantProjects: [],
  matchedSkills: ['Kafka', 'Go'],
  missingSkills: ['React'],
  interviewQuestions: ['Walk through the ranking pipeline.'],
  ...over,
})

describe('CandidateVerdict — the AI answer renders the immutable contract order', () => {
  it('renders Answer → Sources → Confidence/Reasoning, with the résumé source', () => {
    const { container } = render(<CandidateVerdict model={model()} onOpenResume={() => {}} />)
    expect(screen.getByText('The verdict')).toBeInTheDocument()
    expect(screen.getByText('Advance to onsite')).toBeInTheDocument()
    expect(screen.getByText('Sources')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Résumé' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reasoning/i })).toBeInTheDocument()

    // Contract ORDER: the answer text precedes the Sources label in the DOM.
    const text = container.textContent ?? ''
    expect(text.indexOf('Advance to onsite')).toBeGreaterThanOrEqual(0)
    expect(text.indexOf('Advance to onsite')).toBeLessThan(text.indexOf('Sources'))
  })

  it('degrades to an honest pending note when there is no analysis (no fake verdict)', () => {
    render(<CandidateVerdict model={model({ hasAnalysis: false })} />)
    expect(screen.queryByText('The verdict')).not.toBeInTheDocument()
    expect(screen.getByText(/hasn’t been analyzed yet/i)).toBeInTheDocument()
  })
})

describe('Evidence sections — real data only, hidden when empty', () => {
  it('renders strengths and skills from the model', () => {
    render(
      <>
        <CandidateStrengths model={model()} />
        <CandidateSkills model={model()} />
      </>,
    )
    expect(screen.getByText('What stands out')).toBeInTheDocument()
    expect(screen.getByText('Owned a 40M-user pipeline')).toBeInTheDocument()
    expect(screen.getByText('Kafka')).toBeInTheDocument()
    expect(screen.getByText('React')).toBeInTheDocument() // missing skill still shown
  })

  it('renders nothing when the underlying data is empty', () => {
    const { container } = render(
      <>
        <CandidateStrengths model={model({ strengths: [] })} />
        <CandidateInterviewQuestions model={model({ interviewQuestions: [] })} />
        <CandidateSummary model={model({ summary: '' })} />
      </>,
    )
    expect(container.textContent?.trim()).toBe('')
  })
})
