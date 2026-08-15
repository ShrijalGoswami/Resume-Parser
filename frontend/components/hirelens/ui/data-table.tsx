'use client'

import * as React from 'react'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'
import { Input } from './input'
import { Skeleton } from './skeleton'

/**
 * DataTable — the shared, data-dense table for the HireLens product surface.
 *
 * Consolidates the sort / search / paginate / select behaviour that was being
 * re-implemented per screen (Ledger, audit log, admin console). Every surface
 * that renders a flat list of records should reach for this rather than hand-
 * rolling a `<table>`.
 *
 * NOT a replacement for `workspace/pipeline-table` — that one is virtualized
 * (Design Bible §12: virtualize ≥100 rows) and owns a sticky-header scroll
 * container. Pagination and virtualization are different answers to the same
 * problem; this component is the paginated one.
 *
 * Presentation only: it never fetches, mutates, or derives domain state. Rows
 * arrive already-loaded and already-authorized from the caller.
 *
 * Accessibility: `aria-sort` on the active header, real `<button>` sort
 * affordances, `scope="col"`, and — when `onRowClick` is set — rows are
 * keyboard-activable (Enter/Space) with an explicit `row` role rather than the
 * bare clickable `<tr>` that fails keyboard users.
 */

export type SortDirection = 'asc' | 'desc'

export interface DataTableColumn<T> {
  /** Stable identity for sorting + React keys. */
  key: string
  header: React.ReactNode
  render: (row: T) => React.ReactNode
  /**
   * Supplying this makes the column sortable. Return `null` for "no value" —
   * those rows sort last in both directions rather than pretending to be 0/"".
   */
  sortValue?: (row: T) => string | number | null | undefined
  align?: 'left' | 'right'
  /** Applied to both the `<th>` and every `<td>` in the column. */
  className?: string
  headerClassName?: string
  /** Inline width for the `<col>`, e.g. `'12rem'` or `'8%'`. */
  width?: string
}

export interface DataTableProps<T> {
  rows: T[]
  columns: DataTableColumn<T>[]
  /** Row identity — used for React keys and as the selection token. */
  getRowId: (row: T) => string

  /* ── Search ─────────────────────────────────────────────────────────── */
  /** Return the haystack for a row. Presence of this prop enables the search box. */
  getSearchText?: (row: T) => string
  searchPlaceholder?: string

  /* ── Pagination ─────────────────────────────────────────────────────── */
  /** Rows per page. `0` disables pagination and renders every row. */
  pageSize?: number

  /* ── Selection ──────────────────────────────────────────────────────── */
  selectable?: boolean
  /** Controlled selection. Omit for the component to own it internally. */
  selected?: ReadonlySet<string>
  onSelectedChange?: (next: Set<string>) => void
  /** Rendered in the toolbar in place of the row count while rows are selected. */
  bulkActions?: (selected: string[], clear: () => void) => React.ReactNode

  /* ── Interaction ────────────────────────────────────────────────────── */
  onRowClick?: (row: T) => void
  /** Accessible label for a row's activation, e.g. `(r) => \`Open ${r.name}\``. */
  getRowLabel?: (row: T) => string

  /* ── States ─────────────────────────────────────────────────────────── */
  loading?: boolean
  skeletonRows?: number
  /** Shown when `rows` is empty. Search misses render their own inline notice. */
  empty?: React.ReactNode

  /* ── Chrome ─────────────────────────────────────────────────────────── */
  /** Extra filter controls, placed beside the search box. */
  toolbar?: React.ReactNode
  /** Screen-reader description of the table. */
  caption?: string
  initialSort?: { key: string; direction?: SortDirection }
  /** Min table width before horizontal scroll kicks in, e.g. `'48rem'`. */
  minWidth?: string
  className?: string
}

/* Cell rhythm. Row *height* is the `h-hl-row` token, so cells only own the
   horizontal gutter; `py-2` is the floor
   that keeps a two-line cell from touching its neighbours. 44px with 14px text
   is the band Linear, Attio and the Stripe Dashboard all sit in. */
const CELL_X = 'px-4'

function compare(a: string | number, b: string | number): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' })
}

export function DataTable<T>({
  rows,
  columns,
  getRowId,
  getSearchText,
  searchPlaceholder = 'Search…',
  pageSize = 0,
  selectable = false,
  selected: selectedProp,
  onSelectedChange,
  bulkActions,
  onRowClick,
  getRowLabel,
  loading = false,
  skeletonRows = 6,
  empty,
  toolbar,
  caption,
  initialSort,
  minWidth,
  className,
}: DataTableProps<T>) {
  const [query, setQuery] = React.useState('')
  const [sortKey, setSortKey] = React.useState<string | null>(initialSort?.key ?? null)
  const [sortDir, setSortDir] = React.useState<SortDirection>(initialSort?.direction ?? 'asc')
  const [page, setPage] = React.useState(1)
  const [internalSelected, setInternalSelected] = React.useState<Set<string>>(new Set())

  const selected = selectedProp ?? internalSelected
  const setSelected = React.useCallback(
    (next: Set<string>) => {
      if (onSelectedChange) onSelectedChange(next)
      if (selectedProp === undefined) setInternalSelected(next)
    },
    [onSelectedChange, selectedProp],
  )

  const searchable = typeof getSearchText === 'function'

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q || !getSearchText) return rows
    return rows.filter((row) => getSearchText(row).toLowerCase().includes(q))
  }, [rows, query, getSearchText])

  const sorted = React.useMemo(() => {
    if (!sortKey) return filtered
    const column = columns.find((c) => c.key === sortKey)
    if (!column?.sortValue) return filtered
    const read = column.sortValue
    // Decorate-sort-undecorate keeps the sort stable and calls sortValue once
    // per row rather than O(n log n) times.
    return filtered
      .map((row, index) => ({ row, index, value: read(row) }))
      .sort((a, b) => {
        const av = a.value
        const bv = b.value
        const aEmpty = av === null || av === undefined || av === ''
        const bEmpty = bv === null || bv === undefined || bv === ''
        // Missing values sink to the bottom regardless of direction.
        if (aEmpty && bEmpty) return a.index - b.index
        if (aEmpty) return 1
        if (bEmpty) return -1
        const cmp = compare(av, bv)
        if (cmp !== 0) return sortDir === 'asc' ? cmp : -cmp
        return a.index - b.index
      })
      .map((entry) => entry.row)
  }, [filtered, sortKey, sortDir, columns])

  const paginated = pageSize > 0
  const totalPages = paginated ? Math.max(1, Math.ceil(sorted.length / pageSize)) : 1
  const safePage = Math.min(page, totalPages)
  const visible = React.useMemo(
    () => (paginated ? sorted.slice((safePage - 1) * pageSize, safePage * pageSize) : sorted),
    [sorted, paginated, safePage, pageSize],
  )

  // Snap back into range when filtering shrinks the result set under the
  // current page. Derived during render rather than in an effect so we never
  // paint an empty page first.
  if (paginated && page !== safePage) setPage(safePage)

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
    setPage(1)
  }

  const clearSelection = () => setSelected(new Set())

  const visibleIds = visible.map(getRowId)
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id))

  const toggleAllVisible = () => {
    const next = new Set(selected)
    if (allVisibleSelected) visibleIds.forEach((id) => next.delete(id))
    else visibleIds.forEach((id) => next.add(id))
    setSelected(next)
  }

  const toggleRow = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  const showToolbar = searchable || Boolean(toolbar) || Boolean(bulkActions)

  return (
    <div
      className={cn(
        'hl-surface overflow-hidden rounded-hl-lg border border-hl-border',
        className,
      )}
    >
      {showToolbar ? (
        <div className="flex flex-wrap items-center gap-2.5 border-b border-hl-border-subtle p-2.5">
          {searchable ? (
            <div className="relative min-w-[14rem] max-w-sm flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-hl-icon-sm -translate-y-1/2 text-hl-fg-tertiary"
                aria-hidden
              />
              <Input
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setPage(1)
                }}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                className="pl-10"
              />
            </div>
          ) : null}
          {toolbar}
          <div className="ml-auto flex items-center gap-2">
            {selected.size > 0 && bulkActions ? (
              bulkActions(Array.from(selected), clearSelection)
            ) : (
              <span className="hl-mono text-hl-fg-tertiary">
                {sorted.length} {sorted.length === 1 ? 'row' : 'rows'}
              </span>
            )}
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="flex flex-col gap-1.5 p-3" aria-busy>
          {Array.from({ length: skeletonRows }, (_, index) => (
            <Skeleton key={index} className="h-[var(--hl-row-h)]" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        (empty ?? (
          // An empty state is the one place the product has the reader's whole
          // attention — `hl-body-lg` so it reads as a considered message
          // rather than as a caption apologising for itself.
          <p className="hl-body-lg px-4 py-14 text-center text-hl-fg-secondary">
            Nothing here yet.
          </p>
        ))
      ) : sorted.length === 0 ? (
        <div className="px-4 py-14 text-center">
          <p className="hl-body-lg text-hl-fg-secondary">
            No results{query ? ` for “${query}”` : ''}.
          </p>
          {query ? (
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => setQuery('')}>
              Clear search
            </Button>
          ) : null}
        </div>
      ) : (
        /*
          A scroll container that a keyboard can actually operate.

          Below `sm` these tables are wider than the space they are given —
          measured at 390: Reports 416px in 284px, Interviews 504px, Settings
          usage 473px. That part is fine and stays: the overflow is BOUNDED
          here, so the page itself never scrolls sideways, and a pointer or
          touch user drags the table to reach the last columns.

          A keyboard or screen-reader user could not. The container had no
          `tabindex`, so it was never focusable, and nothing else scrolls it —
          which meant the "Match" and "ATS" headers and their sort buttons were
          reachable by mouse and by nothing else. `tabindex="0"` on a scrollable
          region is the standard remedy (WCAG 2.1.1); `role="region"` plus a
          name is what stops that new tab stop from being an unlabelled one,
          and it reuses the caption these tables already pass.

          `focus:outline-none` is deliberately NOT set: the focus ring is the
          only thing telling a keyboard user this strip is scrollable.
        */
        <div
          className="overflow-x-auto"
          tabIndex={0}
          role="region"
          aria-label={caption ? `${caption} (scrollable)` : 'Table (scrollable)'}
        >
          <table
            className="w-full border-collapse text-left"
            style={minWidth ? { minWidth } : undefined}
          >
            {caption ? <caption className="sr-only">{caption}</caption> : null}
            {columns.some((c) => c.width) ? (
              <colgroup>
                {selectable ? <col style={{ width: '2.25rem' }} /> : null}
                {columns.map((column) => (
                  <col key={column.key} style={column.width ? { width: column.width } : undefined} />
                ))}
              </colgroup>
            ) : null}
            <thead>
              {/* The header's rule is the DEFAULT border; every row divider
                  below it is the SUBTLE one. Both used to be subtle, so the
                  boundary between the header and the data carried exactly as
                  much weight as the boundary between row 4 and row 5 — and a
                  table whose every horizontal line is the same weight has no
                  structure, it has stripes. One step of contrast at the top is
                  what makes the header hold the table down.

                  It also resolves a collision: the header fill and the
                  row-hover fill are both `--hl-bg-subtle`, so a hovered first
                  row was previously continuous with the header. */}
              <tr className="border-b border-hl-border bg-hl-subtle">
                {selectable ? (
                  <th scope="col" className={cn(CELL_X, 'w-9 py-2')}>
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleAllVisible}
                      aria-label="Select all rows on this page"
                      className="size-hl-icon-sm accent-[var(--hl-accent-solid)]"
                    />
                  </th>
                ) : null}
                {columns.map((column) => {
                  const isSorted = sortKey === column.key
                  const sortable = typeof column.sortValue === 'function'
                  return (
                    <th
                      key={column.key}
                      scope="col"
                      aria-sort={
                        isSorted ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined
                      }
                      className={cn(
                        // `hl-label`: 12px/560/uppercase with tracking. A table
                        // header has to read as a different *kind* of thing
                        // from the data under it — casing and tracking do that
                        // at a smaller size than weight alone could.
                        'hl-label py-2.5 whitespace-nowrap text-hl-fg-tertiary',
                        CELL_X,
                        column.align === 'right' && 'text-right',
                        column.className,
                        column.headerClassName,
                      )}
                    >
                      {sortable ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(column.key)}
                          className={cn(
                            // `[text-transform:inherit]` IS LOAD-BEARING.
                            // Tailwind's preflight ships `button, select {
                            // text-transform: none }`. The `<th>` carries
                            // `hl-label`, which is uppercase — but the label
                            // lives inside this button on sortable columns, so
                            // the reset won and every SORTABLE header rendered
                            // "Member" while every non-sortable one rendered
                            // "MEMBER". Same header row, two casings, entirely
                            // invisible to a static read of the classes.
                            // Caught by reading computed style in a browser.
                            'inline-flex items-center gap-1 rounded-hl-sm outline-none transition-colors hover:text-hl-fg [text-transform:inherit]',
                            column.align === 'right' && 'flex-row-reverse',
                          )}
                        >
                          {column.header}
                          {isSorted ? (
                            sortDir === 'asc' ? (
                              <ArrowUp className="size-3" aria-hidden />
                            ) : (
                              <ArrowDown className="size-3" aria-hidden />
                            )
                          ) : null}
                        </button>
                      ) : (
                        column.header
                      )}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => {
                const id = getRowId(row)
                const isSelected = selected.has(id)
                const clickable = Boolean(onRowClick)
                return (
                  <tr
                    key={id}
                    onClick={clickable ? () => onRowClick?.(row) : undefined}
                    onKeyDown={
                      clickable
                        ? (event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              onRowClick?.(row)
                            }
                          }
                        : undefined
                    }
                    tabIndex={clickable ? 0 : undefined}
                    role={clickable ? 'button' : undefined}
                    aria-label={clickable ? getRowLabel?.(row) : undefined}
                    data-selected={isSelected || undefined}
                    className={cn(
                      // Rows carry the dense step (14px) at a token row height —
                      // one step under body, which is where Linear/Attio/Stripe sit.
                      'hl-small hl-row-hover h-hl-row border-b border-hl-border-subtle last:border-b-0',
                      isSelected ? 'bg-hl-accent-subtle' : 'hover:bg-hl-subtle',
                      clickable && 'cursor-pointer outline-none',
                    )}
                  >
                    {selectable ? (
                      <td
                        className={cn(CELL_X, 'py-2')}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRow(id)}
                          aria-label={getRowLabel ? `Select ${getRowLabel(row)}` : `Select row ${id}`}
                          className="size-hl-icon-sm accent-[var(--hl-accent-solid)]"
                        />
                      </td>
                    ) : null}
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={cn(
                          'py-2 align-middle',
                          CELL_X,
                          // Right-aligned columns are numeric by convention;
                          // tabular figures stop the column from shimmying as
                          // values change.
                          column.align === 'right' && 'hl-num text-right',
                          column.className,
                        )}
                      >
                        {column.render(row)}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && paginated && totalPages > 1 ? (
        <div className="flex items-center justify-between border-t border-hl-border-subtle px-3 py-2">
          <span className="hl-mono text-hl-fg-tertiary">
            Page {safePage} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              disabled={safePage === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
            >
              <ChevronLeft className="size-4" aria-hidden />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={safePage === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Next page"
            >
              <ChevronRight className="size-4" aria-hidden />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
