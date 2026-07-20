'use client'

import * as React from 'react'
import { Plus, Users } from 'lucide-react'
import {
  useCandidates,
  useUpdateStage,
  useBulkDeleteCandidates,
} from '../lib/api/workspace'
import { PipelineTable } from './pipeline-table'
import { PipelineBoard } from './pipeline-board'
import {
  PipelineFilterBar,
  type PipelineFilters,
  type ViewMode,
} from './pipeline-filter-bar'
import { MultiselectToolbar } from './multiselect-toolbar'
import { STAGE_LABELS } from './stages'
import { Skeleton } from '../ui/skeleton'
import { Button } from '../ui/button'
import { EmptyState } from '../states/empty-state'
import { ErrorState } from '../states/error-state'
import { Card } from '../ui/card'
import { toast } from '../ui/use-toast'
import type { CandidateRow } from '@/lib/candidate'
import type { PipelineStage } from '@/types/campaign'

function filterAndSort(rows: CandidateRow[], filters: PipelineFilters): CandidateRow[] {
  let out = rows
  if (filters.stage !== 'all') out = out.filter((row) => row.raw.stage === filters.stage)
  if (filters.minFit > 0) out = out.filter((row) => (row.overallScore ?? 0) >= filters.minFit)
  const query = filters.search.trim().toLowerCase()
  if (query) {
    out = out.filter((row) =>
      `${row.name} ${row.topSkills.join(' ')} ${row.matchingSkills.join(' ')}`
        .toLowerCase()
        .includes(query),
    )
  }
  const sorted = [...out]
  sorted.sort((a, b) => {
    switch (filters.sort) {
      case 'fit':
        return (b.overallScore ?? -1) - (a.overallScore ?? -1)
      case 'ats':
        return (b.atsScore ?? -1) - (a.atsScore ?? -1)
      case 'name':
        return a.name.localeCompare(b.name)
      case 'recent':
        return (b.analysisAt ?? b.uploadedAt ?? '').localeCompare(a.analysisAt ?? a.uploadedAt ?? '')
      default:
        return 0
    }
  })
  return sorted
}

export interface PipelineLensProps {
  roleId: string
  onCompare: (candidateIds: string[]) => void
  onAddCandidates: () => void
  onOpenCandidate: (candidateId: string) => void
}

export function PipelineLens({
  roleId,
  onCompare,
  onAddCandidates,
  onOpenCandidate,
}: PipelineLensProps) {
  const { data, isLoading, isError, refetch } = useCandidates(roleId)
  const updateStage = useUpdateStage(roleId)
  const bulkDelete = useBulkDeleteCandidates(roleId)

  const [selected, setSelected] = React.useState<Set<string>>(() => new Set())
  const [view, setView] = React.useState<ViewMode>('table')
  const [filters, setFilters] = React.useState<PipelineFilters>({
    search: '',
    stage: 'all',
    minFit: 0,
    sort: 'fit',
  })

  const rows = React.useMemo(() => filterAndSort(data ?? [], filters), [data, filters])

  // Workspace keyboard shortcuts (Design Bible §7.9): `/` focus search,
  // `V` toggle view, `A` add candidates. Ignored while typing in a field.
  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return
      }
      if (event.key === '/') {
        event.preventDefault()
        document.getElementById('hl-pipeline-search')?.focus()
      } else if (event.key.toLowerCase() === 'v') {
        setView((current) => (current === 'table' ? 'board' : 'table'))
      } else if (event.key.toLowerCase() === 'a') {
        event.preventDefault()
        onAddCandidates()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onAddCandidates])

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const toggleAll = () =>
    setSelected((prev) => (prev.size === rows.length ? new Set() : new Set(rows.map((r) => r.id))))
  const clear = () => setSelected(new Set())

  const move = (stage: PipelineStage) => {
    const ids = [...selected]
    ids.forEach((candidateId) => updateStage.mutate({ candidateId, stage }))
    toast({ title: `Moved ${ids.length} to ${STAGE_LABELS[stage]}` })
    clear()
  }
  const remove = () => {
    const ids = [...selected]
    bulkDelete.mutate(ids, {
      onSuccess: () => toast({ title: `Removed ${ids.length} candidates` }),
    })
    clear()
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-full max-w-md" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (isError) {
    return (
      <ErrorState
        variant="route"
        title="Couldn't load this pipeline"
        onRetry={() => refetch()}
      />
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card variant="ai">
        <EmptyState
          variant="first-run"
          icon={Users}
          title="Add candidates to start"
          description="Upload résumés and HireLens ranks them against this role."
          action={
            <Button variant="primary" onClick={onAddCandidates}>
              <Plus /> Add candidates
            </Button>
          }
        />
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <PipelineFilterBar
        filters={filters}
        onChange={(patch) => setFilters((f) => ({ ...f, ...patch }))}
        view={view}
        onViewChange={setView}
      />

      {selected.size > 0 ? (
        <MultiselectToolbar
          count={selected.size}
          canCompare={selected.size >= 2 && selected.size <= 5}
          onCompare={() => onCompare([...selected])}
          onMove={move}
          onReject={() => move('rejected')}
          onRemove={remove}
          onClear={clear}
        />
      ) : null}

      {rows.length === 0 ? (
        <EmptyState
          variant="zero-results"
          title="No matches"
          description="No candidates match the current filters."
          action={
            <Button
              variant="secondary"
              onClick={() => setFilters({ search: '', stage: 'all', minFit: 0, sort: 'fit' })}
            >
              Clear filters
            </Button>
          }
        />
      ) : view === 'table' ? (
        <PipelineTable
          rows={rows}
          selected={selected}
          onToggle={toggle}
          onToggleAll={toggleAll}
          onStageChange={(id, stage) => updateStage.mutate({ candidateId: id, stage })}
          onOpenCandidate={onOpenCandidate}
        />
      ) : (
        <PipelineBoard
          rows={rows}
          selected={selected}
          onToggle={toggle}
          onOpenCandidate={onOpenCandidate}
        />
      )}
    </div>
  )
}
