'use client'

import { useForecasts } from '../lib/api/hooks'
import { RiskRow } from '../domain'
import { Section } from './section'
import { Card } from '../ui/card'
import { Skeleton } from '../ui/skeleton'
import { useShell } from '../shell/shell-context'
import { useCopilot } from '../copilot/copilot-context'
import type { Forecast } from '@/types/prediction'

/**
 * Hiring Risks (UX Spec §6). Surfaces the backend's forecast output directly —
 * no invented thresholds. "Ask" opens the Copilot rail seeded with a question
 * about that risk. Collapses when there are no forecasts.
 */
export function RisksSection() {
  const { data, isLoading, isError } = useForecasts()
  const { setRailOpen } = useShell()
  const { setContextLabel, setSuggestions } = useCopilot()

  const ask = (forecast: Forecast) => {
    const label = forecast.target || forecast.type
    setContextLabel(label)
    setSuggestions([`Why is "${label}" at risk?`, `What can I do about ${label}?`])
    setRailOpen(true)
  }

  if (isLoading) {
    return (
      <Section title="Hiring risks">
        <Card className="px-4">
          {[0, 1].map((index) => (
            <Skeleton key={index} className="my-3 h-8" />
          ))}
        </Card>
      </Section>
    )
  }

  if (isError || !data || data.length === 0) return null

  return (
    <Section title="Hiring risks" count={data.length}>
      <Card className="px-4">
        {data.map((forecast, index) => (
          <RiskRow key={`${forecast.type}-${index}`} forecast={forecast} onAsk={() => ask(forecast)} />
        ))}
      </Card>
    </Section>
  )
}
