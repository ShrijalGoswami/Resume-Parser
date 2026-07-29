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
        className="grid size-10 shrink-0 place-items-center rounded-full bg-hl-subtle hl-mono text-hl-fg-secondary"
      >
        {initials(model.name) || '—'}
      </span>
      <div className="min-w-0 flex-1">
        {/* The name is the object. In the drawer — where recruiters spend most
            of their time — it takes `hl-h1` (24px) rather than the section
            step, so it reads as the subject of the panel and everything under
            it reads as attributes of that subject. */}
        <h1 className={dense ? 'hl-h1 truncate' : 'hl-display-md'}>{model.name}</h1>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          {model.matchCategory ? (
            <Badge variant="outline" className="capitalize">
              {model.matchCategory}
            </Badge>
          ) : null}
          <span className="hl-small capitalize text-hl-fg-tertiary">
            Stage · {model.stage}
          </span>
        </div>
      </div>
    </div>
  )
}
