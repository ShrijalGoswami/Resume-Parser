'use client'

import { Input } from '../ui/input'
import type { SearchFilters } from '@/types/search'

const selectClass =
  'hl-small h-8 rounded-hl-md border border-hl-border bg-hl-canvas px-2 text-hl-fg outline-none focus-visible:border-hl-accent'

/** Advanced filters (UX Spec §8) — the fields the backend actually supports. */
export function TalentFilters({
  filters,
  onChange,
}: {
  filters: SearchFilters
  onChange: (patch: Partial<SearchFilters>) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={String(filters.min_score ?? 0)}
        onChange={(event) => onChange({ min_score: Number(event.target.value) || null })}
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
        value={String(filters.min_experience ?? 0)}
        onChange={(event) => onChange({ min_experience: Number(event.target.value) || null })}
        aria-label="Minimum experience"
        className={selectClass}
      >
        <option value="0">Any experience</option>
        <option value="2">2+ years</option>
        <option value="5">5+ years</option>
        <option value="8">8+ years</option>
      </select>
      <Input
        value={filters.location ?? ''}
        onChange={(event) => onChange({ location: event.target.value || null })}
        placeholder="Location"
        aria-label="Location"
        className="h-8 w-36"
      />
    </div>
  )
}
