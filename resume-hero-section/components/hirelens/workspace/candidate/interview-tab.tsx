import { Section, EmptyHint } from './parts'
import type { CandidateResult } from '@/types/batch'

/** Interview tab (UX Spec §7.4) — questions from the stored analysis. */
export function InterviewTab({ result }: { result: CandidateResult | null }) {
  const questions = result?.interview_questions ?? []
  if (questions.length === 0) {
    return <EmptyHint text="No interview questions were generated for this candidate." />
  }
  return (
    <Section title="Suggested interview questions">
      <ol className="flex flex-col gap-2">
        {questions.map((question, index) => (
          <li key={index} className="hl-small flex gap-2">
            <span className="hl-mono shrink-0 text-hl-fg-tertiary">{index + 1}.</span>
            <span className="text-hl-fg">{question}</span>
          </li>
        ))}
      </ol>
    </Section>
  )
}
