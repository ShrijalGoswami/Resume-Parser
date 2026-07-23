'use client'

import * as React from 'react'
import { Sparkles } from 'lucide-react'
import { AIAnswer, type AIAnswerSource } from '../domain'
import { EvidenceConflicts, type EvidenceConflict } from './evidence-conflict'
import type { CandidateResult } from '@/types/batch'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="hl-h3 text-hl-fg">{title}</h2>
      {children}
    </section>
  )
}

/** A calm, readable list — one point per line, generous spacing (not a dense bullet stack). */
function PointList({ points }: { points: string[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {points.map((point, index) => (
        <li key={index} className="hl-body flex gap-2.5 text-hl-fg-secondary">
          <span className="mt-2 size-1 shrink-0 rounded-full bg-hl-border-strong" aria-hidden />
          <span>{point}</span>
        </li>
      ))}
    </ul>
  )
}

function SkillRow({ label, skills, tone }: { label: string; skills: string[]; tone: string }) {
  if (skills.length === 0) return null
  return (
    <div className="flex flex-col gap-1.5">
      <span className="hl-caption text-hl-fg-tertiary">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {skills.map((skill) => (
          <span
            key={skill}
            className={`rounded-hl-sm px-2 py-0.5 font-hl-mono text-[11px] ${tone}`}
          >
            {skill}
          </span>
        ))}
      </div>
    </div>
  )
}

export interface DossierContentProps {
  result: CandidateResult
  conflicts: EvidenceConflict[]
  onOpenResume?: () => void
}

/**
 * The Dossier body — an editorial read of the candidate. Leads with THE VERDICT
 * (the canonical AIAnswer surface, so the AI assists around the document rather
 * than dominating it), then flows through the real analysis. Every section is
 * conditional on real data (progressive disclosure); nothing is invented.
 */
export function DossierContent({ result, conflicts, onOpenResume }: DossierContentProps) {
  const sources: AIAnswerSource[] = []
  if (onOpenResume) sources.push({ label: 'Résumé', onClick: onOpenResume })

  const verdict = result.summary || result.recommendation

  return (
    <div className="flex flex-col gap-10">
      {verdict ? (
        <AIAnswer
          sources={sources.length > 0 ? sources : undefined}
          reasoning={result.recommendation_explanation || undefined}
        >
          <p className="flex items-center gap-1.5 font-hl-mono text-[10px] uppercase tracking-widest text-hl-fg-tertiary">
            <Sparkles className="size-3.5 text-hl-prism-mid" aria-hidden />
            The verdict
          </p>
          <p className="mt-2">{verdict}</p>
        </AIAnswer>
      ) : null}

      {result.strengths.length > 0 ? (
        <Section title="What stands out">
          <PointList points={result.strengths} />
        </Section>
      ) : null}

      {result.experience_relevance ? (
        <Section title="Experience & relevance">
          <p className="hl-body text-hl-fg-secondary">{result.experience_relevance}</p>
        </Section>
      ) : null}

      {result.weaknesses.length > 0 ? (
        <Section title="What needs a closer look">
          <PointList points={result.weaknesses} />
        </Section>
      ) : null}

      {result.matching_skills.length > 0 || result.missing_skills.length > 0 ? (
        <Section title="Skills">
          <SkillRow
            label="Matched"
            skills={result.matching_skills}
            tone="bg-hl-score-sharp/10 text-hl-score-sharp"
          />
          <SkillRow
            label="Missing"
            skills={result.missing_skills}
            tone="bg-hl-score-soft/10 text-hl-score-soft"
          />
        </Section>
      ) : null}

      {result.interview_questions.length > 0 ? (
        <Section title="Questions to explore">
          <PointList points={result.interview_questions} />
        </Section>
      ) : null}

      <EvidenceConflicts conflicts={conflicts} />
    </div>
  )
}
