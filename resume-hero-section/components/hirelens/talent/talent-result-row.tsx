'use client'

import { Sparkles, FolderPlus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from '../ui/card'
import { Avatar } from '../ui/avatar'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { ScoreMeter } from '../domain/score-meter'
import type { SearchResultItem } from '@/types/search'

/**
 * Talent result (UX Spec §8) — an evidence card, never a raw table row. Leads
 * with who/where + fit, then the AI evidence (matched concepts) for "why this
 * person", then per-result actions.
 */
export interface TalentResultRowProps {
  result: SearchResultItem
  selected: boolean
  active?: boolean
  onToggleSelect: () => void
  onOpen: () => void
  onFindSimilar: () => void
  onAddToCollection: () => void
}

export function TalentResultRow({
  result,
  selected,
  active,
  onToggleSelect,
  onOpen,
  onFindSimilar,
  onAddToCollection,
}: TalentResultRowProps) {
  const fit = result.overall_score
  const matchPct = Math.round(result.similarity * 100)
  const meta = [
    result.campaign_title,
    result.years_experience !== null ? `${result.years_experience}y exp` : null,
    result.stage,
  ].filter(Boolean)

  return (
    <Card
      className={cn(
        'flex flex-col gap-2 p-3',
        selected && 'ring-2 ring-[color:var(--hl-accent-solid)]',
        active && !selected && 'border-hl-border-strong',
      )}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          aria-label={`Select ${result.name}`}
          className="mt-1 size-3.5 shrink-0 accent-[var(--hl-accent-solid)]"
        />
        <Avatar name={result.name} size={28} />
        <div className="min-w-0 flex-1">
          <button type="button" onClick={onOpen} className="max-w-full text-left outline-none">
            <p className="hl-body-medium truncate hover:underline">{result.name}</p>
          </button>
          {meta.length > 0 ? (
            <p className="hl-caption truncate text-hl-fg-tertiary">{meta.join(' · ')}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {fit !== null ? <ScoreMeter score={fit} showLabel={false} /> : null}
          <span className="hl-caption text-hl-fg-tertiary">{matchPct}% match</span>
        </div>
      </div>

      {result.matched_concepts.length > 0 ? (
        <div className="flex items-start gap-1.5">
          <Sparkles className="mt-0.5 size-3.5 shrink-0 text-hl-prism-mid" aria-hidden />
          <div className="flex flex-wrap gap-1">
            {result.matched_concepts.slice(0, 8).map((concept) => (
              <Badge key={concept} variant="accent">
                {concept}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex items-center gap-1">
        <Button size="sm" variant="ghost" onClick={onOpen}>
          Open
        </Button>
        <Button size="sm" variant="ghost" onClick={onFindSimilar}>
          <Sparkles /> Find similar
        </Button>
        <Button size="sm" variant="ghost" onClick={onAddToCollection}>
          <FolderPlus /> Save
        </Button>
      </div>
    </Card>
  )
}
