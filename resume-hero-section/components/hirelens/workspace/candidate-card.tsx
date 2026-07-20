'use client'

import { cn } from '@/lib/utils'
import { Card } from '../ui/card'
import { Avatar } from '../ui/avatar'
import { Badge } from '../ui/badge'
import { ScoreMeter } from '../domain/score-meter'
import { HireBadge } from './hire-badge'
import type { CandidateRow } from '@/lib/candidate'

/**
 * CandidateCard (UX Spec §7.2, board). Shows the inline evidence available
 * today (fit, verdict, top skills). Selection is a real action (feeds Compare);
 * click-to-peek is deferred until the Candidate Drawer phase, so the card is
 * not a link — no fake interaction.
 */
export interface CandidateCardProps {
  row: CandidateRow
  selected?: boolean
  onToggleSelect?: () => void
  onOpen?: () => void
}

export function CandidateCard({ row, selected, onToggleSelect, onOpen }: CandidateCardProps) {
  return (
    <Card
      className={cn(
        'flex flex-col gap-2 p-3',
        selected && 'ring-2 ring-[color:var(--hl-accent-solid)]',
      )}
    >
      <div className="flex items-start gap-2">
        {onToggleSelect ? (
          <input
            type="checkbox"
            checked={Boolean(selected)}
            onChange={onToggleSelect}
            aria-label={`Select ${row.name}`}
            className="mt-1 size-3.5 shrink-0 accent-[var(--hl-accent-solid)]"
          />
        ) : null}
        <Avatar name={row.name} size={24} />
        {onOpen ? (
          <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left outline-none">
            <p className="hl-body-medium truncate hover:underline">{row.name}</p>
            {row.matchCategory ? (
              <p className="hl-caption truncate text-hl-fg-tertiary">{row.matchCategory}</p>
            ) : null}
          </button>
        ) : (
          <div className="min-w-0 flex-1">
            <p className="hl-body-medium truncate">{row.name}</p>
            {row.matchCategory ? (
              <p className="hl-caption truncate text-hl-fg-tertiary">{row.matchCategory}</p>
            ) : null}
          </div>
        )}
        <HireBadge hire={row.hire} />
      </div>

      {row.overallScore !== null ? (
        <ScoreMeter score={row.overallScore} showLabel={false} />
      ) : row.status === 'awaiting' || row.status === 'analyzing' ? (
        <span className="hl-caption text-hl-fg-tertiary">Analyzing…</span>
      ) : null}

      {row.topSkills.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {row.topSkills.slice(0, 2).map((skill) => (
            <Badge key={skill}>{skill}</Badge>
          ))}
        </div>
      ) : null}
    </Card>
  )
}
