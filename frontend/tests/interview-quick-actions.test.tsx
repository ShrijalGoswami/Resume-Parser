// @vitest-environment jsdom
/**
 * Interview quick actions request only their scoped sections, and Regenerate
 * repeats the LAST request instead of always paying for a full pack.
 *
 * A full blueprint generation costs ~7K tokens; a scoped one ~2-4K. The merge
 * behaviour (scoped responses update only their sections) is what makes the
 * scoping safe — it is asserted here too.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import type { InterviewPack } from '@/types/interview'

const generateInterview = vi.fn()
vi.mock('@/services/interview-api', () => ({
  generateInterview: (...args: unknown[]) => generateInterview(...args),
}))
vi.mock('@/lib/interview-pdf', () => ({ exportInterviewPdf: vi.fn() }))

import { InterviewIntelligence } from '@/components/interview/interview-intelligence'

function pack(over: Partial<InterviewPack> = {}): InterviewPack {
  return {
    executive_summary: { who: 'Backend engineer', why_shortlisted: 'Depth', key_differentiators: [] },
    interview_strategy: { recommended_duration_minutes: 60, stages: [], priority_focus_areas: [], suggested_interviewer_profile: '' },
    technical_questions: [{ question: 'Original technical?', skill: '', difficulty: 'Hard', reason: '', expected_answer: '', red_flags: [], followups: [], evaluation_criteria: [] }],
    behavioral_questions: [{ question: 'Original behavioral?', competency: 'ownership', reason: '', expected_answer: '', warning_signs: [] }],
    skill_verifications: [],
    risks: [],
    scorecard: [],
    final_recommendation: { recommendation: 'Hire', reasoning: 'Solid.', uncertainty: '' },
    candidate_id: 'c-1', candidate_name: 'Test Person', campaign_id: 'r-1',
    focus: 'blueprint', sources_used: [], degraded: false,
    ...over,
  }
}

/** A scoped response: ONLY behavioral filled, everything else empty defaults. */
function behavioralOnly(): InterviewPack {
  return pack({
    executive_summary: { who: '', why_shortlisted: '', key_differentiators: [] },
    technical_questions: [],
    behavioral_questions: [{ question: 'New behavioral?', competency: 'conflict', reason: '', expected_answer: '', warning_signs: [] }],
    final_recommendation: { recommendation: '', reasoning: '', uncertainty: '' },
    focus: 'behavioral',
  })
}

afterEach(() => {
  cleanup()
  generateInterview.mockReset()
})

describe('interview quick actions', () => {
  it('scoped quick action requests only its sections and merges over the pack', async () => {
    generateInterview.mockResolvedValueOnce(pack())
    render(<InterviewIntelligence campaignId="r-1" candidateId="c-1" />)

    fireEvent.click(screen.getByRole('button', { name: /generate interview pack/i }))
    await waitFor(() => expect(screen.getByText('Original technical?')).toBeInTheDocument())
    expect(generateInterview).toHaveBeenLastCalledWith('r-1', 'c-1', { focus: 'blueprint' })

    generateInterview.mockResolvedValueOnce(behavioralOnly())
    fireEvent.click(screen.getByRole('button', { name: /only behavioral/i }))
    await waitFor(() => expect(screen.getByText('New behavioral?')).toBeInTheDocument())

    const req = generateInterview.mock.calls.at(-1)![2]
    expect(req.sections).toEqual(['behavioral_questions'])
    expect(req.focus).toBe('behavioral')
    // Merge kept the sections the scoped response left empty.
    expect(screen.getByText('Original technical?')).toBeInTheDocument()
    expect(screen.getByText(/Solid\./)).toBeInTheDocument()
  })

  it('Regenerate repeats the last request, not a full pack', async () => {
    generateInterview.mockResolvedValueOnce(pack())
    render(<InterviewIntelligence campaignId="r-1" candidateId="c-1" />)
    fireEvent.click(screen.getByRole('button', { name: /generate interview pack/i }))
    await waitFor(() => expect(screen.getByText('Original technical?')).toBeInTheDocument())

    generateInterview.mockResolvedValueOnce(behavioralOnly())
    fireEvent.click(screen.getByRole('button', { name: /only behavioral/i }))
    await waitFor(() => expect(screen.getByText('New behavioral?')).toBeInTheDocument())

    generateInterview.mockResolvedValueOnce(behavioralOnly())
    fireEvent.click(screen.getByRole('button', { name: /regenerate/i }))
    await waitFor(() => expect(generateInterview).toHaveBeenCalledTimes(3))

    const req = generateInterview.mock.calls.at(-1)![2]
    expect(req.sections).toEqual(['behavioral_questions'])
    expect(req.focus).toBe('behavioral')
  })

  it('Regenerate after only a full generation is still a full pack', async () => {
    generateInterview.mockResolvedValue(pack())
    render(<InterviewIntelligence campaignId="r-1" candidateId="c-1" />)
    fireEvent.click(screen.getByRole('button', { name: /generate interview pack/i }))
    await waitFor(() => expect(screen.getByText('Original technical?')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /regenerate/i }))
    await waitFor(() => expect(generateInterview).toHaveBeenCalledTimes(2))
    expect(generateInterview.mock.calls.at(-1)![2]).toEqual({ focus: 'blueprint' })
  })
})
