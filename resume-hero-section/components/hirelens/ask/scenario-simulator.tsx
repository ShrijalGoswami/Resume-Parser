'use client'

import * as React from 'react'
import { Sparkles, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react'
import { Card } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Skeleton } from '../ui/skeleton'
import { ConfidencePill } from '../domain'
import { ErrorState } from '../states/error-state'
import { usePredictionTypes, useSimulate } from '../lib/api/ask'
import { formatForecastValue, guessForecast, humanize } from './intent'
import type { SimResult } from '@/types/prediction'

/**
 * ScenarioSimulator (UX Spec §9.2 · Design Bible §6.7) — the inline What-if
 * control that appears beneath a what-if answer in the thread. Deterministic:
 * every number comes from `/prediction/simulate` (baseline vs scenario). Shows
 * the delta, a confidence band, and drivers, with a compact re-run control.
 */
export function ScenarioSimulator({
  seedQuery,
  className,
}: {
  seedQuery?: string
  className?: string
}) {
  const types = usePredictionTypes()
  const simulation = useSimulate()

  const forecastTypes = React.useMemo(() => types.data?.forecast_types ?? [], [types.data])
  const scenarios = types.data?.scenarios ?? {}

  const [forecastType, setForecastType] = React.useState<string>('')
  const [levers, setLevers] = React.useState<Record<string, number>>({})

  // The forecast defaults to the closest match for the question until the user
  // picks another — derived, so no state-syncing effect is needed.
  const effectiveForecast = forecastType || guessForecast(seedQuery ?? '', forecastTypes)

  const run = () => {
    if (!effectiveForecast) return
    simulation.mutate({ forecastType: effectiveForecast, levers })
  }

  const result = simulation.data

  if (types.isLoading) {
    return (
      <Card variant="ai" className={className}>
        <div className="flex flex-col gap-2 p-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-24" />
        </div>
      </Card>
    )
  }

  if (types.isError) {
    return (
      <ErrorState
        variant="inline"
        title="The simulator isn’t available"
        onRetry={() => types.refetch()}
        className={className}
      />
    )
  }

  return (
    <Card variant="ai" className={className}>
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-hl-prism-mid" aria-hidden />
          <span className="hl-body-medium">What-if simulation</span>
        </div>

        <div className="flex flex-col gap-2">
          <label className="hl-caption text-hl-fg-tertiary" htmlFor="ask-sim-forecast">
            Outcome
          </label>
          <select
            id="ask-sim-forecast"
            value={effectiveForecast}
            onChange={(event) => setForecastType(event.target.value)}
            className="hl-body h-[var(--hl-control-h-md)] rounded-hl-md border border-hl-border bg-hl-canvas px-2 text-hl-fg outline-none focus-visible:border-hl-accent"
          >
            {forecastTypes.map((type) => (
              <option key={type} value={type}>
                {humanize(type)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <p className="hl-caption mb-1.5 text-hl-fg-tertiary">Levers</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {Object.entries(scenarios).map(([lever, description]) => (
              <label key={lever} className="flex items-center gap-2">
                <span
                  className="hl-small w-36 shrink-0 truncate text-hl-fg-secondary"
                  title={description}
                >
                  {humanize(lever)}
                </span>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={levers[lever] ?? ''}
                  onChange={(event) =>
                    setLevers((prev) => ({ ...prev, [lever]: Number(event.target.value) || 0 }))
                  }
                  placeholder="0"
                  aria-label={humanize(lever)}
                  className="w-20"
                />
              </label>
            ))}
          </div>
        </div>

        <div>
          <Button variant="ai" size="sm" onClick={run} loading={simulation.isPending}>
            {result ? 'Re-run' : 'Run simulation'}
          </Button>
        </div>

        {simulation.isError ? (
          <ErrorState variant="inline" title="The simulation didn’t run" onRetry={run} />
        ) : null}

        {result ? <SimulationResult result={result} /> : null}
      </div>
    </Card>
  )
}

function SimulationResult({ result }: { result: SimResult }) {
  const DirectionIcon =
    result.direction === 'improves'
      ? ArrowUpRight
      : result.direction === 'worsens'
        ? ArrowDownRight
        : Activity
  const directionTone =
    result.direction === 'improves'
      ? 'text-hl-success'
      : result.direction === 'worsens'
        ? 'text-hl-danger'
        : 'text-hl-fg-secondary'

  return (
    <div className="flex flex-col gap-3 border-t border-hl-border-subtle pt-3">
      <p className="hl-body-medium flex items-center gap-2">
        <DirectionIcon className={`size-4 ${directionTone}`} aria-hidden />
        {result.summary}
      </p>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-hl-md border border-hl-border-subtle bg-hl-canvas p-3">
          <p className="hl-caption text-hl-fg-tertiary">Baseline</p>
          <p className="hl-h2">{formatForecastValue(result.baseline)}</p>
          <p className="hl-small text-hl-fg-secondary">{result.baseline.summary}</p>
        </div>
        <div className="rounded-hl-md border border-hl-border bg-hl-ai-surface p-3">
          <p className="hl-caption text-hl-fg-tertiary">With scenario</p>
          <p className="hl-h2">{formatForecastValue(result.scenario)}</p>
          <p className="hl-small text-hl-fg-secondary">{result.scenario.summary}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <ConfidencePill value={result.scenario.confidence} />
        {result.scenario.factors.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {result.scenario.factors.map((factor, index) => (
              <span
                key={`${factor.name}-${index}`}
                className="hl-caption rounded-full border border-hl-border bg-hl-canvas px-2 py-0.5 text-hl-fg-secondary"
                title={factor.detail}
              >
                {factor.name}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
