import * as React from 'react'
import { Section, PointList, SkillChips } from './primitives'
import type { CandidateModel } from '../model'

/** CandidateStrengths — "What stands out". Hidden when there's nothing real. */
export function CandidateStrengths({ model }: { model: CandidateModel }) {
  if (model.strengths.length === 0) return null
  return (
    <Section title="What stands out">
      <PointList points={model.strengths} />
    </Section>
  )
}

/** CandidateRisks — "What needs a closer look". */
export function CandidateRisks({ model }: { model: CandidateModel }) {
  if (model.risks.length === 0) return null
  return (
    <Section title="What needs a closer look">
      <PointList points={model.risks} />
    </Section>
  )
}

/** CandidateEvidence — experience relevance + relevant projects (the read). */
export function CandidateEvidence({ model }: { model: CandidateModel }) {
  if (!model.experienceRelevance && model.relevantProjects.length === 0) return null
  return (
    <Section title="Experience & relevance">
      {model.experienceRelevance ? (
        <p className="hl-body text-hl-fg-secondary">{model.experienceRelevance}</p>
      ) : null}
      {model.relevantProjects.length > 0 ? <PointList points={model.relevantProjects} /> : null}
    </Section>
  )
}

/** CandidateSkills — matched / missing skills. */
export function CandidateSkills({ model }: { model: CandidateModel }) {
  if (model.matchedSkills.length === 0 && model.missingSkills.length === 0) return null
  return (
    <Section title="Skills">
      <SkillChips label="Matched" skills={model.matchedSkills} tone="bg-hl-score-sharp/10 text-hl-score-sharp" />
      <SkillChips label="Missing" skills={model.missingSkills} tone="bg-hl-score-soft/10 text-hl-score-soft" />
    </Section>
  )
}

/** CandidateInterviewQuestions — "Questions to explore". */
export function CandidateInterviewQuestions({ model }: { model: CandidateModel }) {
  if (model.interviewQuestions.length === 0) return null
  return (
    <Section title="Questions to explore">
      <PointList points={model.interviewQuestions} />
    </Section>
  )
}
