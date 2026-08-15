'use client'

import Link from 'next/link'
import { GitCompareArrows, FolderPlus, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from '../ui/card'
import { Avatar } from '../ui/avatar'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { DRAWER_FOCUS_KEY } from '../ui/drawer'
import { ScoreMeter } from '../domain/score-meter'
import { WEAK_SIMILARITY } from './relevance'
import type { SearchResultItem } from '@/types/search'

/**
 * Talent result (UX Spec §8) — an evidence card, never a raw table row. Leads
 * with who/where + fit, then the matched concepts for "why this person", then
 * per-result actions.
 *
 * SIMILARITY IS NOT A MATCH SCORE, and the card no longer calls it one. The
 * backend returns a cosine similarity between the query embedding and the
 * candidate's; the audit found gibberish scoring 0.0153 and still being
 * returned, because vector search always has a nearest neighbour. Labelling
 * that "2% match" put an unrelated person on screen wearing the same clothes
 * as a real result. It now says what it is — similarity — and a result below
 * the weak floor says so in words beside the number.
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
  const similarityPct = Math.round(result.similarity * 100)
  const weak = result.similarity < WEAK_SIMILARITY
  const meta = [
    result.campaign_title,
    result.years_experience !== null ? `${result.years_experience}y exp` : null,
    result.stage,
  ].filter(Boolean)

  return (
    <Card
      className={cn(
        'flex flex-col gap-2 p-3',
        // Selection is copper (V2 §14), matching every other multi-select
        // surface; terracotta stays with the actions.
        selected && 'shadow-[inset_2px_0_0_var(--hl-accent-secondary)]',
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
          <button
            type="button"
            onClick={onOpen}
            // Talent results are virtualized too, so focus is restored by key
            // rather than by node reference — see DRAWER_FOCUS_KEY.
            {...{ [DRAWER_FOCUS_KEY]: `candidate-${result.candidate_id}` }}
            className="max-w-full text-left outline-none"
          >
            <p className="hl-body-medium truncate hover:underline">{result.name}</p>
          </button>
          {meta.length > 0 ? (
            <p className="hl-caption truncate text-hl-fg-tertiary">{meta.join(' · ')}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {fit !== null ? <ScoreMeter score={fit} showLabel={false} /> : null}
          {/* A number, in mono, named for what it measures. */}
          <span className="hl-caption text-hl-fg-tertiary">
            <span className="hl-mono">{similarityPct}%</span> similarity
          </span>
          {weak ? (
            <span className="hl-caption text-hl-fg-tertiary">Weak match</span>
          ) : null}
        </div>
      </div>

      {result.matched_concepts.length > 0 ? (
        // Copper marks evidence (V2 §16); the chips are neutral because
        // terracotta belongs to decisions, not to a list of concepts.
        <div className="flex items-start gap-2 border-l-2 border-[var(--hl-accent-secondary)] pl-2.5">
          <div className="flex flex-wrap gap-1">
            {result.matched_concepts.slice(0, 8).map((concept) => (
              <Badge key={concept} variant="neutral">
                {concept}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex items-center gap-1">
        {/* Two levels, named as such. "Open" was the only action here and it
            opens the quick-review drawer, so a searcher who wanted the complete
            evaluation had to open the drawer and then find the promotion inside
            it. `campaign_id` is nullable on a search result — without it there
            is no route to build, and the quick review remains available. */}
        <Button size="sm" variant="ghost" onClick={onOpen}>
          Quick review
        </Button>
        {result.campaign_id ? (
          <Button size="sm" variant="ghost" asChild>
            <Link
              href={`/jobs/${result.campaign_id}/candidates/${result.candidate_id}`}
              aria-label={`Full review of ${result.name}`}
            >
              Full review <ArrowUpRight aria-hidden />
            </Link>
          </Button>
        ) : null}
        <Button size="sm" variant="ghost" onClick={onFindSimilar}>
          {/* Was a sparkle. Finding similar people is a comparison, and the
              icon now says that (V2 §8). */}
          <GitCompareArrows /> Find similar
        </Button>
        <Button size="sm" variant="ghost" onClick={onAddToCollection}>
          <FolderPlus /> Save
        </Button>
      </div>
    </Card>
  )
}
