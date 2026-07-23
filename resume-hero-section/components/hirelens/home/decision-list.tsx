'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { decisionHref, isRecent, relativeAge, severityDotClass } from './inbox-meta'
import type { Recommendation } from '@/types/agent'

/** One decision row in a tier — dot + title/role, signals, age, chevron. Navigational. */
function DecisionRow({ rec }: { rec: Recommendation }) {
  const age = relativeAge(rec.created_at)
  const urgent = rec.severity === 'urgent' || rec.severity === 'high'

  return (
    <Link
      href={decisionHref(rec)}
      className="group flex items-center justify-between gap-3 px-4 py-3.5 outline-none transition-colors hover:bg-hl-subtle"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={cn('size-2 shrink-0 rounded-full', severityDotClass(rec.severity))}
          aria-hidden
        />
        <p className="hl-body-medium min-w-0 truncate text-hl-fg">
          {rec.title}
          {rec.campaign_title ? (
            <span className="font-normal text-hl-fg-secondary"> · {rec.campaign_title}</span>
          ) : null}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3 font-hl-mono text-[11px]">
        {isRecent(rec.created_at) ? (
          <span className="rounded-hl-sm bg-hl-score-legible/10 px-1.5 py-0.5 text-hl-score-legible">
            new
          </span>
        ) : null}
        {urgent ? (
          <span className="rounded-hl-sm bg-hl-score-outfocus/10 px-1.5 py-0.5 text-hl-score-outfocus">
            {rec.severity}
          </span>
        ) : null}
        {age ? <span className="tabular-nums text-hl-fg-tertiary">{age}</span> : null}
        <ChevronRight
          className="size-4 text-hl-border-strong transition-colors group-hover:text-hl-fg"
          aria-hidden
        />
      </div>
    </Link>
  )
}

/** A titled tier (Needs you now / Today) with a count chip and bordered list. */
export function DecisionTier({
  label,
  items,
}: {
  label: string
  items: Recommendation[]
}) {
  if (items.length === 0) return null
  return (
    <section className="flex flex-col gap-3">
      <h4 className="flex items-center gap-2 border-b border-hl-border-subtle pb-2 font-hl-mono text-[11px] uppercase tracking-wider text-hl-fg-tertiary">
        {label}
        <span className="rounded-hl-sm bg-hl-muted px-1.5 py-0.5 tabular-nums text-hl-fg-secondary">
          {items.length}
        </span>
      </h4>
      <div className="divide-y divide-hl-border-subtle overflow-hidden rounded-hl-lg border border-hl-border-subtle bg-hl-canvas">
        {items.map((rec) => (
          <DecisionRow key={rec.id} rec={rec} />
        ))}
      </div>
    </section>
  )
}
