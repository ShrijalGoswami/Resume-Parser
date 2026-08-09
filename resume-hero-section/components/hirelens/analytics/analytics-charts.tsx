'use client'

/**
 * V2 chart primitives for Analytics.
 *
 * WHY THESE EXIST RATHER THAN `components/workspace/charts.tsx`.
 * That file is shared with the frozen v1.0 app and is deliberately reused
 * verbatim — the `.hl` scope remaps its base tokens so it renders V3 colours
 * with no code change. But the remap only fixes COLOUR. It cannot fix
 * `rounded-2xl`, `shadow-sm`, `bg-card` or the raw `bg-amber-500` /
 * `bg-emerald-500` status fills, all of which are V2 violations, and editing
 * them in place would push those changes into the frozen app. So Analytics
 * gets its own primitives and the legacy file is left alone.
 *
 * THE DATA INK IS NEUTRAL, ON PURPOSE.
 * Terracotta means "you can act on this" and copper means "this is evidence or
 * a registration mark". A bar whose only job is to be longer than the bar below
 * it is neither, and painting forty of them in the accent spends the colour
 * that has to still mean something when the reader reaches a button. Magnitude
 * is carried by LENGTH — the encoding that actually does the work — in a single
 * recessive hue. Copper appears exactly once, as the threshold rule on the
 * match distribution, which is the one mark on this screen that is a stated
 * rule rather than a measurement.
 */

import * as React from 'react'
import { cn } from '@/lib/utils'

/** Section container. Same surface as every other V2 panel: no shadow. */
export function Panel({
  title,
  subtitle,
  note,
  actions,
  children,
  className,
}: {
  title: string
  subtitle?: string
  /** The denominator, the window, or the caveat. Rendered under the chart. */
  note?: React.ReactNode
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        'flex flex-col rounded-hl-lg border border-hl-border bg-hl-subtle p-5',
        className,
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="hl-h3 text-hl-fg">{title}</h3>
          {subtitle ? <p className="hl-caption text-hl-fg-tertiary">{subtitle}</p> : null}
        </div>
        {actions}
      </div>
      {children}
      {note ? <p className="mt-3 hl-caption text-hl-fg-tertiary">{note}</p> : null}
    </section>
  )
}

/** Nothing to draw. Says which question has no answer, not just "no data". */
export function NoData({ children }: { children: React.ReactNode }) {
  return <p className="py-6 hl-body text-hl-fg-tertiary">{children}</p>
}

/**
 * Horizontal magnitude rows — skills, gaps, stages.
 *
 * The count is the value the reader takes away, so it is mono and right-aligned
 * into a column; the bar is the comparison, not the number.
 */
export function MagnitudeRows({
  data,
  labelWidth = '9rem',
  emphasise,
}: {
  data: { label: string; value: number }[]
  labelWidth?: string
  /** Row label that carries a decision meaning and may take the copper mark. */
  emphasise?: string
}) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <ul className="flex flex-col gap-2" role="list">
      {data.map((d) => (
        <li
          key={d.label}
          className="grid items-center gap-3 hl-small"
          style={{ gridTemplateColumns: `${labelWidth} 1fr 2.5rem` }}
        >
          <span className="truncate text-hl-fg-secondary" title={d.label}>
            {d.label}
          </span>
          <span className="h-2 overflow-hidden rounded-full bg-hl-muted">
            <span
              className={cn(
                'block h-full rounded-full',
                emphasise === d.label
                  ? 'bg-[var(--hl-accent-secondary)]'
                  : 'bg-hl-fg-tertiary',
              )}
              style={{ width: `${d.value === 0 ? 0 : Math.max(2, (d.value / max) * 100)}%` }}
            />
          </span>
          <span className="hl-mono text-right text-hl-fg">{d.value}</span>
        </li>
      ))}
    </ul>
  )
}

/**
 * Vertical distribution.
 *
 * `markFrom` draws the copper threshold rule — the high-quality cutoff — as a
 * registration mark across the bands at or above it, so "how many clear the
 * bar" is readable from the shape instead of only from a sentence.
 */
export function Distribution({
  data,
  markFrom,
  markLabel,
}: {
  data: { range: string; count: number }[]
  markFrom?: string
  markLabel?: string
}) {
  const max = Math.max(1, ...data.map((d) => d.count))
  const total = data.reduce((s, d) => s + d.count, 0)
  if (total === 0) return <NoData>No scored candidates yet.</NoData>
  const markIndex = markFrom ? data.findIndex((d) => d.range === markFrom) : -1

  return (
    <div>
      <div className="flex items-stretch gap-2" style={{ height: 132 }}>
        {data.map((d, i) => (
          <div key={d.range} className="flex flex-1 flex-col items-center gap-1.5">
            <span className="hl-mono text-hl-fg">{d.count || ''}</span>
            <div className="flex min-h-0 w-full flex-1 items-end">
              <div
                className={cn(
                  'w-full rounded-t-sm',
                  d.count === 0 ? 'bg-hl-muted' : 'bg-hl-fg-tertiary',
                  markIndex >= 0 && i >= markIndex && d.count > 0 && 'bg-hl-fg-secondary',
                )}
                style={{ height: `${d.count === 0 ? 2 : Math.max(4, (d.count / max) * 100)}%` }}
                role="img"
                aria-label={`${d.range}: ${d.count}`}
              />
            </div>
            <span className="hl-caption text-hl-fg-tertiary">{d.range}</span>
          </div>
        ))}
      </div>
      {markIndex >= 0 ? (
        <div
          className="mt-2 border-t border-dashed border-[var(--hl-accent-secondary)] pt-1.5"
          style={{ marginLeft: `${(markIndex / data.length) * 100}%` }}
        >
          <span className="hl-caption text-hl-fg-secondary">{markLabel}</span>
        </div>
      ) : null}
    </div>
  )
}

/**
 * Two-part completeness bar. Colour never carries the meaning alone — each
 * part is named and counted in the legend beneath it.
 */
export function SplitBar({
  parts,
}: {
  parts: { label: string; count: number; tone: 'neutral' | 'warning' }[]
}) {
  const total = parts.reduce((s, p) => s + p.count, 0)
  if (total === 0) return <NoData>No candidates yet.</NoData>
  const fill = (tone: string) => (tone === 'warning' ? 'bg-hl-warning' : 'bg-hl-fg-tertiary')

  return (
    <div>
      <div className="flex h-2 overflow-hidden rounded-full bg-hl-muted" role="img" aria-label="Analysis coverage">
        {parts.map((p) => (
          <span
            key={p.label}
            className={fill(p.tone)}
            style={{ width: `${(p.count / total) * 100}%` }}
          />
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 hl-small">
        {parts.map((p) => (
          <li key={p.label} className="flex items-center gap-2">
            <span className={cn('size-2 shrink-0 rounded-full', fill(p.tone))} aria-hidden />
            <span className="text-hl-fg-secondary">{p.label}</span>
            <span className="hl-mono text-hl-fg">{p.count}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Résumés received per day.
 *
 * Every day the workspace has data for, in order — NOT "the last 30 days".
 * The backend applies no window, so the caller states the real first and last
 * date rather than implying a range nobody computed.
 */
export function DayColumns({ data }: { data: { date: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count))
  if (data.length === 0) return <NoData>No résumés received yet.</NoData>
  return (
    <div className="flex items-end gap-1" style={{ height: 96 }}>
      {data.map((d) => (
        <div
          key={d.date}
          className="min-w-[3px] flex-1 rounded-t-sm bg-hl-fg-tertiary"
          style={{ height: `${Math.max(4, (d.count / max) * 100)}%` }}
          title={`${d.date}: ${d.count}`}
          role="img"
          aria-label={`${d.date}: ${d.count} received`}
        />
      ))}
    </div>
  )
}
