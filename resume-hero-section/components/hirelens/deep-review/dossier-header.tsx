'use client'

import { X } from 'lucide-react'
import { Avatar } from '../ui/avatar'
import { focusBand } from '../lib/focus-scale'
import { ScoreRing } from './score-ring'
import type { Candidate } from '@/types/campaign'
import type { CandidateResult } from '@/types/batch'

/** A calm identity line from real résumé data: current role, tenure. */
function subtitle(candidate: Candidate, result: CandidateResult | null): string {
  const exp = result?.resume_data?.experience?.[0]
  const parts: string[] = []
  if (exp?.role && exp?.company) parts.push(`${exp.role} at ${exp.company}`)
  else if (exp?.company) parts.push(exp.company)
  const yrs = result?.years_experience
  if (yrs) parts.push(`${yrs} yr${yrs === 1 ? '' : 's'} experience`)
  return parts.join(' · ') || candidate.email || ''
}

export function DossierHeader({
  candidate,
  result,
  name,
  onClose,
}: {
  candidate: Candidate
  result: CandidateResult | null
  name: string
  onClose: () => void
}) {
  const fit = result?.overall_score ?? null
  const band = focusBand(fit)
  const sub = subtitle(candidate, result)

  return (
    <header className="flex items-start justify-between gap-6">
      <div className="flex min-w-0 items-center gap-4">
        <Avatar name={name} size={52} />
        <div className="min-w-0">
          <h1 className="hl-display-md truncate text-hl-fg">{name}</h1>
          {sub ? <p className="hl-small mt-0.5 text-hl-fg-secondary">{sub}</p> : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-5">
        {fit !== null ? (
          <div className="flex items-center gap-3">
            <ScoreRing score={fit} />
            <div className="hidden flex-col sm:flex">
              <span className="font-hl-mono text-[10px] uppercase tracking-widest text-hl-fg-tertiary">
                Fit score
              </span>
              <span className={`hl-body-medium ${band.text}`}>{band.label}</span>
            </div>
          </div>
        ) : null}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close review"
          className="rounded-hl-sm p-1.5 text-hl-fg-tertiary outline-none transition-colors hover:bg-hl-subtle hover:text-hl-fg"
        >
          <X className="size-5" />
        </button>
      </div>
    </header>
  )
}
