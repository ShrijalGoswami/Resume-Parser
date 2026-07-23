'use client'

import * as React from 'react'
import { Check, X, Sparkles, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerBody } from '../../ui/drawer'
import { Avatar } from '../../ui/avatar'
import { Button } from '../../ui/button'
import { focusBand, ACCEPT_MIN_SCORE, REJECT_MAX_SCORE } from './triage-grouping'
import type { CandidateRow } from '@/lib/candidate'

export type BulkKind = 'accept' | 'reject'

/** Near-threshold candidates — the edge cases held back for a human read by default. */
function borderlineIds(rows: CandidateRow[], kind: BulkKind): string[] {
  return rows
    .filter((r) => {
      if (r.overallScore == null) return true
      return kind === 'accept'
        ? r.overallScore < ACCEPT_MIN_SCORE + 5
        : r.overallScore >= REJECT_MAX_SCORE - 5
    })
    .map((r) => r.id)
}

function byScoreDesc(rows: CandidateRow[]): CandidateRow[] {
  return [...rows].sort((a, b) => (b.overallScore ?? -1) - (a.overallScore ?? -1))
}

/** Strongest / median / weakest — a truthful representative read of the group. */
function representative(rows: CandidateRow[]): { label: string; row: CandidateRow }[] {
  const sorted = byScoreDesc(rows)
  if (sorted.length === 0) return []
  const picks: { label: string; row: CandidateRow }[] = [{ label: 'Strongest', row: sorted[0] }]
  if (sorted.length >= 3) picks.push({ label: 'Median', row: sorted[Math.floor(sorted.length / 2)] })
  if (sorted.length >= 2) picks.push({ label: 'Weakest', row: sorted[sorted.length - 1] })
  return picks
}

function SampleRow({
  label,
  row,
  included,
  onToggle,
}: {
  label: string
  row: CandidateRow
  included: boolean
  onToggle: () => void
}) {
  const band = focusBand(row.overallScore)
  return (
    <div className="flex items-start gap-3 rounded-hl-lg border border-hl-border-subtle p-3">
      <Avatar name={row.name} size={32} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-hl-mono text-[10px] uppercase tracking-widest text-hl-fg-tertiary">
            {label}
          </span>
          <span className={cn('font-hl-mono text-xs tabular-nums', band.text)}>
            {row.overallScore ?? '—'}
          </span>
        </div>
        <p className="hl-body-medium mt-0.5 truncate text-hl-fg">{row.name}</p>
        {row.summary || row.recommendationText ? (
          <p className="hl-small mt-0.5 line-clamp-2 text-hl-fg-secondary">
            {row.summary || row.recommendationText}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={included}
        aria-label={included ? 'Included — click to hold' : 'Held — click to include'}
        className={cn(
          'flex size-7 shrink-0 items-center justify-center rounded-hl-sm border outline-none transition-colors',
          included
            ? 'border-hl-accent-border bg-hl-accent-subtle text-hl-accent-fg'
            : 'border-hl-border text-hl-fg-tertiary hover:text-hl-fg',
        )}
      >
        {included ? <Check className="size-4" /> : <X className="size-4" />}
      </button>
    </div>
  )
}

export interface BulkConfirmDrawerProps {
  kind: BulkKind
  rows: CandidateRow[]
  pending: boolean
  onClose: () => void
  onConfirm: (includedIds: string[]) => void
  onOpenCandidate: (candidateId: string) => void
}

/**
 * Bulk Confirm — an executive review surface (Stitch "Bulk Confirm Review"). It
 * leads with why the group is safe (evidence-first), lets you eyeball a
 * representative read and the pulled-out edge cases, states the truthful impact,
 * and only then presents the bulk action as the quiet conclusion. Every figure
 * is derived from real candidate data; nothing about confidence or calibration
 * is claimed.
 */
export function BulkConfirmDrawer({
  kind,
  rows,
  pending,
  onClose,
  onConfirm,
  onOpenCandidate,
}: BulkConfirmDrawerProps) {
  // Edge cases start held; everything else starts included.
  const [held, setHeld] = React.useState<Set<string>>(() => new Set(borderlineIds(rows, kind)))

  const scores = rows.map((r) => r.overallScore).filter((n): n is number => n != null)
  const min = scores.length ? Math.min(...scores) : null
  const max = scores.length ? Math.max(...scores) : null
  const median = scores.length ? byScoreDesc(rows)[Math.floor(rows.length / 2)]?.overallScore ?? null : null

  const sample = representative(rows)
  const edgeCases = rows.filter((r) => borderlineIds(rows, kind).includes(r.id))
  const includedIds = rows.map((r) => r.id).filter((id) => !held.has(id))
  const includedCount = includedIds.length
  const heldCount = rows.length - includedCount

  const toggle = (id: string) =>
    setHeld((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const isAccept = kind === 'accept'
  const targetLabel = isAccept ? 'Interview' : 'Rejected'
  const basis = isAccept
    ? `All ${rows.length} scored fit ≥ ${ACCEPT_MIN_SCORE} and were recommended to advance by the analysis.`
    : `All ${rows.length} scored fit < ${REJECT_MAX_SCORE} and were recommended to reject by the analysis.`

  return (
    <Drawer open onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <DrawerContent
        size="wide"
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.metaKey && includedCount > 0 && !pending) {
            event.preventDefault()
            onConfirm(includedIds)
          }
        }}
      >
        <DrawerHeader>
          <div className="min-w-0">
            <DrawerTitle className="hl-display-md">
              Review {rows.length} clear {isAccept ? 'advances' : 'rejects'}
            </DrawerTitle>
            <DrawerDescription className="font-hl-mono tabular-nums">
              {min != null && max != null ? `fit ${min}–${max}` : 'fit —'}
              {median != null ? ` · median ${median}` : ''}
            </DrawerDescription>
          </div>
        </DrawerHeader>

        <DrawerBody className="flex flex-col gap-8">
          {/* Why this group is safe — evidence first */}
          <section className="hl-prism-edge rounded-hl-lg border border-hl-ai-border bg-hl-ai-surface p-4">
            <div className="flex flex-col gap-3">
              <div>
                <p className="font-hl-mono text-[10px] uppercase tracking-widest text-hl-fg-tertiary">
                  Shared basis
                </p>
                <p className="hl-small mt-1 text-hl-fg-secondary">{basis}</p>
              </div>
              <div>
                <p className="font-hl-mono text-[10px] uppercase tracking-widest text-hl-fg-tertiary">
                  Guardrails
                </p>
                <p className="hl-small mt-1 text-hl-fg-secondary">
                  None on the wrong side of the fit line · {edgeCases.length} near the line, pulled
                  out below for your read.
                </p>
              </div>
            </div>
          </section>

          {/* Representative read */}
          {sample.length > 0 ? (
            <section className="flex flex-col gap-3">
              <h3 className="hl-h3 text-hl-fg">A representative read</h3>
              <div className="flex flex-col gap-2">
                {sample.map(({ label, row }) => (
                  <SampleRow
                    key={row.id}
                    label={label}
                    row={row}
                    included={!held.has(row.id)}
                    onToggle={() => toggle(row.id)}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {/* Edge cases held for review */}
          {edgeCases.length > 0 ? (
            <section className="flex flex-col gap-3">
              <h3 className="hl-h3 flex items-center gap-2 text-hl-fg">
                Held for your read
                <span className="font-hl-mono text-xs tabular-nums text-hl-fg-tertiary">
                  {edgeCases.filter((r) => held.has(r.id)).length} of {rows.length}
                </span>
              </h3>
              <div className="flex flex-col gap-2">
                {edgeCases.map((row) => {
                  const band = focusBand(row.overallScore)
                  const isHeld = held.has(row.id)
                  return (
                    <div
                      key={row.id}
                      className="flex items-center gap-3 rounded-hl-lg border border-hl-border-subtle p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="hl-body-medium truncate text-hl-fg">
                          {row.name}{' '}
                          <span className={cn('font-hl-mono text-xs tabular-nums', band.text)}>
                            fit {row.overallScore ?? '—'}
                          </span>
                        </p>
                        {row.summary ? (
                          <p className="hl-small mt-0.5 line-clamp-1 text-hl-fg-secondary">
                            {row.summary}
                          </p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onClose()
                          onOpenCandidate(row.id)
                        }}
                        className="hl-small flex shrink-0 items-center gap-0.5 text-hl-fg-secondary outline-none transition-colors hover:text-hl-fg"
                      >
                        Open <ArrowUpRight className="size-3.5" aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggle(row.id)}
                        className={cn(
                          'hl-small shrink-0 rounded-hl-sm border px-2 py-1 outline-none transition-colors',
                          isHeld
                            ? 'border-hl-border text-hl-fg-secondary hover:text-hl-fg'
                            : 'border-hl-accent-border bg-hl-accent-subtle text-hl-accent-fg',
                        )}
                      >
                        {isHeld ? 'Include' : 'Held'}
                      </button>
                    </div>
                  )
                })}
              </div>
            </section>
          ) : null}

          {/* Truthful impact */}
          <section className="flex items-center gap-2 border-t border-hl-border-subtle pt-4 font-hl-mono text-[11px] text-hl-fg-tertiary">
            <Sparkles className="size-3.5 text-hl-prism-mid" aria-hidden />
            <span className="tabular-nums">
              {includedCount} → {targetLabel}
              {heldCount > 0 ? ` · holding ${heldCount} for review` : ''}
            </span>
          </section>
        </DrawerBody>

        {/* The action — the quiet conclusion of the review */}
        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-hl-border-subtle bg-hl-canvas p-4">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={pending}
            disabled={includedCount === 0}
            onClick={() => onConfirm(includedIds)}
          >
            {isAccept ? 'Accept' : 'Reject'} {includedCount}
            {heldCount > 0 ? ` · hold ${heldCount}` : ''}
          </Button>
        </footer>
      </DrawerContent>
    </Drawer>
  )
}
