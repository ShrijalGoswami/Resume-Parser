import * as React from 'react'
import { Avatar } from '../../ui/avatar'
import { stageLabel } from '../../workspace/stages'
import type { CandidateModel } from '../model'

/**
 * CandidateHeader — identity and decision context: name, stage, and the two
 * numbers a decision leans on (Fit, ATS), in mono because they are scores.
 * Same component at both densities; `dense` shrinks the headline for the Peek.
 *
 * The match-category badge is gone from here: the verdict card immediately
 * below carries the same words as its headline, and the audit's finding was
 * that "Moderate Match" repeated on every surface had stopped meaning
 * anything. Identity up here, judgment down there — stated once each.
 */
export function CandidateHeader({ model, dense }: { model: CandidateModel; dense?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      {/* The shared identity plate (theme-aware hue) rather than a hand-rolled
          grey circle — same face the table and inbox show for this person. */}
      <Avatar name={model.name} size={40} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        {/* The name is the object. In the drawer — where recruiters spend most
            of their time — it takes `hl-h1` (24px) rather than the section
            step, so it reads as the subject of the panel and everything under
            it reads as attributes of that subject. */}
        <h1 className={dense ? 'hl-h1 truncate' : 'hl-display-md'}>{model.name}</h1>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="hl-small text-hl-fg-tertiary">
            Stage · {stageLabel(model.stage)}
          </span>
          {model.confidence !== null ? (
            <span className="hl-caption text-hl-fg-secondary">
              Fit{' '}
              <span className="hl-mono text-hl-fg">{model.confidence}</span>
            </span>
          ) : null}
          {model.atsScore !== null ? (
            <span className="hl-caption text-hl-fg-tertiary">
              ATS <span className="hl-mono">{model.atsScore}</span>
            </span>
          ) : null}
        </div>
      </div>
    </div>
  )
}
