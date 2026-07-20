'use client'

import { Search, LayoutGrid, Table as TableIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '../ui/input'
import { ALL_STAGES, STAGE_LABELS } from './stages'
import type { PipelineStage } from '@/types/campaign'

export type ViewMode = 'table' | 'board'
export type SortKey = 'fit' | 'ats' | 'recent' | 'name'

export interface PipelineFilters {
  search: string
  stage: PipelineStage | 'all'
  minFit: number
  sort: SortKey
}

const selectClass =
  'hl-small h-8 rounded-hl-md border border-hl-border bg-hl-canvas px-2 text-hl-fg outline-none focus-visible:border-hl-accent'

export interface PipelineFilterBarProps {
  filters: PipelineFilters
  onChange: (patch: Partial<PipelineFilters>) => void
  view: ViewMode
  onViewChange: (view: ViewMode) => void
}

export function PipelineFilterBar({ filters, onChange, view, onViewChange }: PipelineFilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-48 flex-1">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-hl-fg-tertiary"
          aria-hidden
        />
        <Input
          value={filters.search}
          onChange={(event) => onChange({ search: event.target.value })}
          placeholder="Search into this role…"
          aria-label="Search into this role"
          className="pl-8"
        />
      </div>

      <select
        value={filters.stage}
        onChange={(event) => onChange({ stage: event.target.value as PipelineStage | 'all' })}
        aria-label="Filter by stage"
        className={selectClass}
      >
        <option value="all">All stages</option>
        {ALL_STAGES.map((stage) => (
          <option key={stage} value={stage}>
            {STAGE_LABELS[stage]}
          </option>
        ))}
      </select>

      <select
        value={String(filters.minFit)}
        onChange={(event) => onChange({ minFit: Number(event.target.value) })}
        aria-label="Minimum fit"
        className={selectClass}
      >
        <option value="0">Any fit</option>
        <option value="40">Fit ≥ 40</option>
        <option value="55">Fit ≥ 55</option>
        <option value="70">Fit ≥ 70</option>
        <option value="85">Fit ≥ 85</option>
      </select>

      <select
        value={filters.sort}
        onChange={(event) => onChange({ sort: event.target.value as SortKey })}
        aria-label="Sort"
        className={selectClass}
      >
        <option value="fit">Sort: Fit</option>
        <option value="ats">Sort: ATS</option>
        <option value="recent">Sort: Recent</option>
        <option value="name">Sort: Name</option>
      </select>

      <div className="inline-flex rounded-hl-md bg-hl-muted p-1">
        <button
          type="button"
          onClick={() => onViewChange('table')}
          aria-label="Table view"
          aria-pressed={view === 'table'}
          className={cn(
            'rounded-hl-sm p-1 outline-none transition-colors',
            view === 'table'
              ? 'bg-hl-canvas text-hl-accent-fg shadow-[var(--hl-shadow-xs)]'
              : 'text-hl-fg-tertiary hover:text-hl-fg',
          )}
        >
          <TableIcon className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => onViewChange('board')}
          aria-label="Board view"
          aria-pressed={view === 'board'}
          className={cn(
            'rounded-hl-sm p-1 outline-none transition-colors',
            view === 'board'
              ? 'bg-hl-canvas text-hl-accent-fg shadow-[var(--hl-shadow-xs)]'
              : 'text-hl-fg-tertiary hover:text-hl-fg',
          )}
        >
          <LayoutGrid className="size-4" />
        </button>
      </div>
    </div>
  )
}
