'use client'

import { BarChart3 } from 'lucide-react'
import { useCandidates } from '../lib/api/workspace'
import { Card } from '../ui/card'
import { Skeleton } from '../ui/skeleton'
import { ErrorState } from '../states/error-state'
import { EmptyState } from '../states/empty-state'
import { ALL_STAGES, STAGE_LABELS } from './stages'
import { scoreBand } from '../lib/format'

/**
 * Analytics lens (UX Spec §7.5). Derived client-side from the hydrated candidate
 * list (no per-role analytics endpoint) — real data, computed here. Calm bars
 * per Design Bible §3.12.
 */
function MetricTile({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="p-4">
      <p className="hl-caption text-hl-fg-tertiary">{label}</p>
      <p className="hl-display-xl mt-1">{value}</p>
    </Card>
  )
}

function BarList({ items, total }: { items: { label: string; value: number }[]; total: number }) {
  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => {
        const pct = total > 0 ? Math.round((item.value / total) * 100) : 0
        return (
          <div key={item.label} className="flex items-center gap-3">
            <span className="hl-small w-28 shrink-0 text-hl-fg-secondary">{item.label}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-hl-muted">
              <div className="h-full rounded-full bg-hl-accent" style={{ width: `${pct}%` }} />
            </div>
            <span className="hl-mono w-8 text-right text-[13px]">{item.value}</span>
          </div>
        )
      })}
    </div>
  )
}

export function AnalyticsLens({ roleId }: { roleId: string }) {
  const { data, isLoading, isError, refetch } = useCandidates(roleId)

  if (isLoading) {
    return (
      <div className="mt-2 grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-24" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <ErrorState
        variant="inline"
        title="Couldn't load analytics"
        onRetry={() => refetch()}
        className="mt-2"
      />
    )
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No analytics yet"
        description="Add and analyze candidates to see this role's metrics."
      />
    )
  }

  const analyzed = data.filter((row) => row.overallScore !== null)
  const avgFit = analyzed.length
    ? Math.round(analyzed.reduce((sum, row) => sum + (row.overallScore ?? 0), 0) / analyzed.length)
    : 0
  const stageItems = ALL_STAGES.map((stage) => ({
    label: STAGE_LABELS[stage],
    value: data.filter((row) => row.raw.stage === stage).length,
  }))
  const bandLabels = ['In focus', 'Sharp', 'Legible', 'Soft', 'Out of focus']
  const bandCounts: Record<string, number> = {}
  analyzed.forEach((row) => {
    const band = scoreBand(row.overallScore ?? 0)
    bandCounts[band.label] = (bandCounts[band.label] ?? 0) + 1
  })

  return (
    <div className="mt-2 flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricTile label="Candidates" value={data.length} />
        <MetricTile label="Avg fit" value={avgFit} />
        <MetricTile label="Analyzed" value={`${analyzed.length}/${data.length}`} />
      </div>
      <Card className="p-4">
        <h3 className="hl-h3 mb-3">Pipeline funnel</h3>
        <BarList items={stageItems} total={data.length} />
      </Card>
      <Card className="p-4">
        <h3 className="hl-h3 mb-3">Fit distribution</h3>
        <BarList
          items={bandLabels.map((label) => ({ label, value: bandCounts[label] ?? 0 }))}
          total={analyzed.length}
        />
      </Card>
    </div>
  )
}
