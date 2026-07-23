'use client'

import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '../ui/button'
import { decisionHref } from './inbox-meta'
import type { Recommendation } from '@/types/agent'

/**
 * "Your next" rail (Stitch "The Briefing" right rail). The top decisions as an
 * ordered focus sequence, topped by the Prism hairline (AI-ordered). "Start
 * focus run" opens the first decision. Durations are intentionally omitted —
 * the backend has no per-decision time estimate to show.
 */
export function FocusRail({ items }: { items: Recommendation[] }) {
  if (items.length === 0) return null
  const first = items[0]

  return (
    <aside className="w-full shrink-0 lg:w-[280px]">
      <div className="relative overflow-hidden rounded-hl-xl border border-hl-border bg-hl-canvas p-5 lg:sticky lg:top-6">
        {/* Prism top hairline — AI ordered this */}
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-px"
          style={{
            background:
              'linear-gradient(90deg, var(--hl-prism-from), var(--hl-prism-mid), var(--hl-prism-to))',
          }}
        />
        <h4 className="font-hl-mono text-[10px] uppercase tracking-widest text-hl-fg-secondary">
          Your next {items.length}
        </h4>

        <ol className="relative mt-5 ml-1.5 flex flex-col gap-5 border-l border-hl-border pl-5">
          {items.map((rec, i) => (
            <li key={rec.id} className="relative">
              <span
                className={cn(
                  'absolute -left-[26px] top-1 size-2 rounded-full ring-4 ring-hl-canvas',
                  i === 0 ? 'bg-hl-accent' : 'bg-hl-border-strong',
                )}
                aria-hidden
              />
              <p className="hl-small line-clamp-1 font-medium text-hl-fg">{rec.title}</p>
              {rec.campaign_title ? (
                <p className="hl-caption mt-0.5 line-clamp-1 text-hl-fg-tertiary">
                  {rec.campaign_title}
                </p>
              ) : null}
            </li>
          ))}
        </ol>

        <Button variant="primary" size="lg" className="mt-6 w-full justify-between" asChild>
          <Link href={decisionHref(first)}>
            Start focus run
            <ArrowRight />
          </Link>
        </Button>

        <p className="mt-3 flex items-center gap-1.5 font-hl-mono text-[10px] uppercase tracking-wide text-hl-fg-tertiary">
          <Sparkles className="size-3 text-hl-prism-mid" aria-hidden />
          Prioritized by urgency and impact
        </p>
      </div>
    </aside>
  )
}
