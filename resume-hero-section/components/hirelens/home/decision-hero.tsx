'use client'

import Link from 'next/link'
import { ArrowRight, ArrowDownRight } from 'lucide-react'
import { Button } from '../ui/button'
import { decisionHref, relativeAge, severityDotClass } from './inbox-meta'
import type { Recommendation } from '@/types/agent'

/**
 * "Start here" hero (Stitch "The Briefing"). The single most urgent decision,
 * rendered on the AI surface with the Prism left hairline. Navigational — it
 * opens the decision; the decision itself is where approval happens.
 */
export function DecisionHero({ rec }: { rec: Recommendation }) {
  const age = relativeAge(rec.created_at)
  const confidence = Math.round((rec.confidence ?? 0) * 100)

  return (
    <section className="flex flex-col gap-3">
      <p className="flex items-center gap-2 font-hl-mono text-[11px] font-medium uppercase tracking-wide text-hl-accent-fg">
        <ArrowDownRight className="size-3.5" aria-hidden />
        Start here
      </p>

      <div className="hl-prism-edge rounded-hl-xl border border-hl-ai-border bg-hl-ai-surface p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="hl-h3 text-hl-fg">{rec.title}</h3>
            {rec.campaign_title || rec.candidate_name ? (
              <p className="hl-small mt-1 text-hl-fg-secondary">
                {[rec.candidate_name, rec.campaign_title].filter(Boolean).join(' · ')}
              </p>
            ) : null}
            {rec.why ? (
              <p className="hl-small mt-3 line-clamp-2 text-hl-fg-secondary">{rec.why}</p>
            ) : null}
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 font-hl-mono text-[11px] text-hl-fg-tertiary">
              <span className="flex items-center gap-1.5">
                <span
                  className={`size-1.5 rounded-full ${severityDotClass(rec.severity)}`}
                  aria-hidden
                />
                impact: {rec.severity}
              </span>
              <span className="tabular-nums">{confidence}% confident</span>
              {age ? <span className="tabular-nums">{age}</span> : null}
            </div>
          </div>
          <div className="shrink-0">
            <Button variant="primary" size="lg" className="w-full sm:w-auto" asChild>
              <Link href={decisionHref(rec)}>
                Open decision
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
