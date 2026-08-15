'use client'

import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { Avatar } from '../ui/avatar'
import { Badge } from '../ui/badge'
import { ScoreMeter } from '../domain/score-meter'
import { DRAWER_FOCUS_KEY } from '../ui/drawer'
import { HireBadge } from './hire-badge'
import { StageMenu } from './stage-menu'
import { relativeTime } from '../lib/format'
import type { PipelineTableProps } from './pipeline-table'

/**
 * Pipeline card list — the narrow-viewport presentation of the SAME rows the
 * table shows, below `md`.
 *
 * WHY IT EXISTS. The table is intrinsically ~985px wide: ten columns of real
 * data, and no honest way to make them narrower. At 390 its scroller is 284px,
 * so `#` and `Candidate` were the only columns on screen and Fit, ATS, Matched
 * skills, Stage, Verdict, Updated and Full review sat behind a horizontal
 * scroll nested inside the page's vertical one. That is the product's primary
 * work surface, reached by the gesture people are worst at.
 *
 * WHAT IT IS NOT. It is not a reduced view. Every column has a home here —
 * see the mapping below — because a card that quietly drops Verdict or Updated
 * is a different product on a phone, not a responsive one. `Stage` keeps the
 * real `StageMenu` (so it stays actionable and permission-gated by the same
 * component), and `Full review` becomes a full-width control rather than a
 * caption-sized link, because at this width it is the primary way out.
 *
 *   table column   → card
 *   ─────────────────────────────────────────────────────────
 *   select         → checkbox, identity row
 *   #              → position, trailing the identity row
 *   Candidate      → avatar + name button + summary line
 *   Fit            → labelled ScoreMeter, metrics row
 *   ATS            → labelled number, metrics row
 *   Matched skills → chip row
 *   Stage          → StageMenu, actions row
 *   Verdict        → HireBadge, actions row
 *   Updated        → relative time, actions row
 *   Review         → full-width CTA at the card foot
 *
 * Not virtualized, unlike the table. The table virtualizes because it renders
 * ≥100 rows at desktop density; this list is mounted only below `md`, where the
 * same role is read a few cards at a time. Adding a second virtualizer here
 * would buy nothing and put a second scroll container inside the page scroll —
 * the exact nesting this component exists to remove.
 */
export function PipelineCardList({
  rows,
  roleId,
  selected,
  onToggle,
  onToggleAll,
  onStageChange,
  onOpenCandidate,
}: PipelineTableProps) {
  const allSelected = rows.length > 0 && rows.every((row) => selected.has(row.id))

  return (
    <div className="flex flex-col gap-2">
      {/* The table's header carried "select all"; without this it would be the
          one control that disappears below `md`. */}
      <label className="hl-caption flex min-h-6 items-center gap-2 px-1 text-hl-fg-tertiary">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={onToggleAll}
          className="size-3.5 accent-[var(--hl-accent-solid)]"
        />
        Select all
      </label>

      <ul className="flex list-none flex-col gap-2">
        {rows.map((row, index) => {
          // Evidence against this role first; generic top skills only when the
          // analysis produced no matches — identical rule to the table.
          const skills = row.matchingSkills.length > 0 ? row.matchingSkills : row.topSkills
          const shown = skills.slice(0, 3)
          const rest = skills.length - shown.length

          return (
            <li
              key={row.id}
              className="flex flex-col gap-3 rounded-hl-lg border border-hl-border bg-hl-canvas p-3"
            >
              {/* Identity */}
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={selected.has(row.id)}
                  onChange={() => onToggle(row.id)}
                  aria-label={`Select ${row.name}`}
                  className="mt-1 size-3.5 shrink-0 accent-[var(--hl-accent-solid)]"
                />
                <Avatar name={row.name} size={32} className="shrink-0" />
                <button
                  type="button"
                  onClick={() => onOpenCandidate(row.id)}
                  {...{ [DRAWER_FOCUS_KEY]: `candidate-${row.id}` }}
                  className="min-w-0 flex-1 text-left outline-none"
                >
                  <p className="hl-body-medium hover:underline">{row.name}</p>
                  {row.summary || row.matchCategory ? (
                    <p className="hl-caption line-clamp-2 text-hl-fg-tertiary">
                      {row.summary ?? row.matchCategory}
                    </p>
                  ) : null}
                </button>
                <span className="hl-mono hl-caption shrink-0 text-hl-fg-tertiary" aria-hidden>
                  #{index + 1}
                </span>
              </div>

              {/* Fit + ATS. Both labelled: the table put these under column
                  headers, and a bare meter beside a bare number says nothing
                  once the header is gone. */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="hl-label text-hl-fg-tertiary">FIT</span>
                  {row.overallScore !== null ? (
                    <ScoreMeter score={row.overallScore} showLabel={false} />
                  ) : row.status === 'awaiting' || row.status === 'analyzing' ? (
                    <span
                      className="hl-skeleton inline-block h-3 w-16 rounded-full"
                      aria-label="Analyzing"
                    />
                  ) : (
                    <span className="hl-caption text-hl-fg-tertiary">—</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="hl-label text-hl-fg-tertiary">ATS</span>
                  <span className="hl-mono hl-caption text-hl-fg-tertiary">
                    {row.atsScore !== null ? Math.round(row.atsScore) : '—'}
                  </span>
                </div>
              </div>

              {/* Matched skills */}
              {shown.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1">
                  {shown.map((skill) => (
                    <Badge key={skill}>{skill}</Badge>
                  ))}
                  {rest > 0 ? <span className="hl-mono text-hl-fg-tertiary">+{rest}</span> : null}
                </div>
              ) : null}

              {/* Stage · Verdict · Updated */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <StageMenu
                  stage={row.raw.stage}
                  onChange={(stage) => onStageChange(row.id, stage)}
                />
                <HireBadge hire={row.hire} />
                <span className="hl-caption ml-auto text-hl-fg-tertiary">
                  {relativeTime(row.analysisAt ?? row.uploadedAt)}
                </span>
              </div>

              {/* The way out. Full width and bordered rather than the table's
                  caption-sized link: at this width it is the primary action,
                  and it is also a 40px target instead of a 26px one. */}
              <Link
                href={`/jobs/${roleId}/candidates/${row.id}`}
                className="hl-body-medium flex min-h-10 items-center justify-center gap-1 rounded-hl-md border border-hl-border text-hl-fg-secondary outline-none transition-colors hover:bg-hl-subtle hover:text-hl-fg focus-visible:bg-hl-subtle [&_svg]:size-hl-icon-sm"
                aria-label={`Full review of ${row.name}`}
              >
                Full review <ArrowUpRight aria-hidden />
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
