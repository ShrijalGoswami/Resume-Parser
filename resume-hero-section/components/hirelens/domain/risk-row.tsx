'use client'

import { Sparkles } from 'lucide-react'
import { ConfidencePill } from './confidence-pill'
import type { Forecast } from '@/types/prediction'

/**
 * RiskRow (UX Spec §6). Surfaces a forecast from the backend's prediction engine
 * as a risk: its own summary is the one-line cause, its confidence the pill.
 * "Ask" pre-seeds the Copilot (available today). "Open" is deferred until the
 * per-role Forecast lens route exists — no dead link is shown.
 */
export interface RiskRowProps {
  forecast: Forecast
  onAsk: () => void
}

export function RiskRow({ forecast, onAsk }: RiskRowProps) {
  return (
    <div className="flex items-center gap-3 border-b border-hl-border-subtle py-3 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="hl-body-medium truncate">{forecast.target || forecast.type}</p>
        {forecast.summary ? (
          <p className="hl-small truncate text-hl-fg-secondary">{forecast.summary}</p>
        ) : null}
      </div>
      <ConfidencePill value={forecast.confidence} className="hidden sm:inline-flex" />
      <button
        type="button"
        onClick={onAsk}
        className="hl-small inline-flex shrink-0 items-center gap-1 rounded-hl-md px-2 py-1 text-hl-accent-fg outline-none transition-colors hover:bg-hl-accent-subtle"
      >
        <Sparkles className="size-3.5" aria-hidden />
        Ask
      </button>
    </div>
  )
}
