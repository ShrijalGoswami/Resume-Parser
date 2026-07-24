import * as React from 'react'
import { Badge } from '../../ui/badge'
import type { CandidateModel } from '../model'

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

/**
 * CandidateHeader — identity: name, role stage, and the AI match category. Same
 * component at both densities; `dense` shrinks the headline for the Peek.
 */
export function CandidateHeader({ model, dense }: { model: CandidateModel; dense?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <span
        aria-hidden
        className="grid size-10 shrink-0 place-items-center rounded-full bg-hl-subtle font-hl-mono text-[13px] text-hl-fg-secondary"
      >
        {initials(model.name) || '—'}
      </span>
      <div className="min-w-0 flex-1">
        <h1 className={dense ? 'hl-h2 truncate' : 'hl-display-md'}>{model.name}</h1>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {model.matchCategory ? (
            <Badge variant="outline" className="capitalize">
              {model.matchCategory}
            </Badge>
          ) : null}
          <span className="hl-caption capitalize text-hl-fg-tertiary">Stage · {model.stage}</span>
        </div>
      </div>
    </div>
  )
}
