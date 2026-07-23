'use client'

import * as React from 'react'
import { Sparkles } from 'lucide-react'
import { Button } from '../ui/button'
import type { AgentBriefing } from '@/types/agent'

/**
 * Decision Inbox header (Stitch "The Briefing"). A mono date eyebrow, the single
 * serif headline, and a supporting line — driven by the on-demand AI brief when
 * one has been generated this session, otherwise derived from the real queue
 * count. A quiet AI action regenerates the brief.
 */
export interface BriefingHeaderProps {
  nowCount: number
  todayCount: number
  briefing: AgentBriefing | null
  onGenerate: () => void
  generating: boolean
}

function today(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

export function BriefingHeader({
  nowCount,
  todayCount,
  briefing,
  onGenerate,
  generating,
}: BriefingHeaderProps) {
  const total = nowCount + todayCount
  const headline =
    briefing?.headline ??
    (total === 0
      ? 'You’re all caught up.'
      : `${total} decision${total === 1 ? '' : 's'} need${total === 1 ? 's' : ''} your judgment.`)
  const summary =
    briefing?.summary ??
    (total === 0
      ? 'Nothing needs you right now. New decisions will surface here as they arrive.'
      : 'Reviewed and ranked by urgency. Start at the top and work down.')

  return (
    <header className="hl-enter flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <p className="font-hl-mono text-[11px] font-medium uppercase tracking-widest text-hl-fg-secondary">
          {today()}
        </p>
        <Button variant="ai" size="sm" onClick={onGenerate} loading={generating}>
          <Sparkles />
          {briefing ? 'Regenerate' : 'AI brief'}
        </Button>
      </div>
      <h1 className="hl-display-md text-hl-fg">{headline}</h1>
      <p className="hl-body max-w-2xl text-hl-fg-secondary">{summary}</p>

      {total > 0 ? (
        <div className="mt-1 flex items-center gap-3 border-y border-hl-border-subtle py-2.5 font-hl-mono text-[11px]">
          <span className="uppercase tracking-wider text-hl-fg-tertiary">Queue</span>
          <span className="h-3 w-px bg-hl-border" aria-hidden />
          <span className="tabular-nums text-hl-fg-secondary">
            {nowCount} <span className="text-hl-fg-tertiary">need you now</span>
          </span>
          <span className="h-3 w-px bg-hl-border" aria-hidden />
          <span className="tabular-nums text-hl-fg-secondary">
            {todayCount} <span className="text-hl-fg-tertiary">today</span>
          </span>
        </div>
      ) : null}
    </header>
  )
}
