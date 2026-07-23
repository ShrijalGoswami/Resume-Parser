'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Users, Sparkles, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCandidates, useUpdateStage } from '../../lib/api/workspace'
import { Skeleton } from '../../ui/skeleton'
import { Card } from '../../ui/card'
import { EmptyState } from '../../states/empty-state'
import { ErrorState } from '../../states/error-state'
import { toast } from '../../ui/use-toast'
import { TriageQueue, type TriageAction } from './triage-queue'
import { TriagePiles } from './triage-piles'
import { BulkConfirmDrawer, type BulkKind } from './bulk-confirm-drawer'
import { partitionTriage } from './triage-grouping'
import type { CandidateRow } from '@/lib/candidate'
import type { PipelineStage } from '@/types/campaign'

const ACTION_STAGE: Record<Exclude<TriageAction, 'deeper'>, PipelineStage> = {
  advance: 'interview',
  shortlist: 'shortlisted',
  reject: 'rejected',
}
const ACTION_VERB: Record<Exclude<TriageAction, 'deeper'>, string> = {
  advance: 'Advanced',
  shortlist: 'Shortlisted',
  reject: 'Rejected',
}

function isEditable(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el) return false
  return (
    el.tagName === 'INPUT' ||
    el.tagName === 'TEXTAREA' ||
    el.tagName === 'SELECT' ||
    el.isContentEditable === true
  )
}

function Stat({ value, label, tone }: { value: number; label: string; tone?: string }) {
  return (
    <div className="flex flex-col">
      <span className={cn('font-hl-mono text-lg tabular-nums', tone ?? 'text-hl-fg')}>{value}</span>
      <span className="hl-caption uppercase tracking-wider text-hl-fg-tertiary">{label}</span>
    </div>
  )
}

export interface TriageLensProps {
  roleId: string
}

export function TriageLens({ roleId }: TriageLensProps) {
  const router = useRouter()
  const { data, isLoading, isError, refetch } = useCandidates(roleId)
  const updateStage = useUpdateStage(roleId)

  // "Deeper" is sustained evaluation — it leaves the queue for the full Dossier.
  const openDeepReview = React.useCallback(
    (id: string) => router.push(`/roles/${roleId}/candidates/${id}`),
    [router, roleId],
  )

  const [focused, setFocused] = React.useState(0)
  const [bulkKind, setBulkKind] = React.useState<BulkKind | null>(null)
  const undoRef = React.useRef<{ id: string; stage: PipelineStage }[]>([])

  const part = React.useMemo(() => partitionTriage(data ?? []), [data])
  const { accept, reject, needs, done, total } = part

  // Derive the cursor clamped to the (shrinking) queue — no effect needed.
  const focusedIndex = needs.length > 0 ? Math.min(focused, needs.length - 1) : 0

  const act = React.useCallback(
    (row: CandidateRow | undefined, action: TriageAction) => {
      if (!row) return
      if (action === 'deeper') {
        openDeepReview(row.id)
        return
      }
      const stage = ACTION_STAGE[action]
      const prev = row.raw.stage
      updateStage.mutate({ candidateId: row.id, stage })
      undoRef.current.push({ id: row.id, stage: prev })
      toast({
        title: `${ACTION_VERB[action]} ${row.name}`,
        action: {
          label: 'Undo',
          onClick: () => {
            updateStage.mutate({ candidateId: row.id, stage: prev })
            undoRef.current = undoRef.current.filter((u) => u.id !== row.id)
          },
        },
      })
    },
    [openDeepReview, updateStage],
  )

  const undo = React.useCallback(() => {
    const last = undoRef.current.pop()
    if (!last) return
    updateStage.mutate({ candidateId: last.id, stage: last.stage })
    toast({ title: 'Undone' })
  }, [updateStage])

  const onBulkConfirm = React.useCallback(
    (ids: string[]) => {
      if (!bulkKind) return
      const stage: PipelineStage = bulkKind === 'accept' ? 'interview' : 'rejected'
      const source = bulkKind === 'accept' ? accept : reject
      const prevs = ids
        .map((id) => source.find((r) => r.id === id))
        .filter((r): r is CandidateRow => Boolean(r))
        .map((r) => ({ id: r.id, stage: r.raw.stage }))
      ids.forEach((id) => updateStage.mutate({ candidateId: id, stage }))
      prevs.forEach((p) => undoRef.current.push(p))
      const verb = bulkKind === 'accept' ? 'Advanced' : 'Rejected'
      toast({
        title: `${verb} ${ids.length} candidate${ids.length === 1 ? '' : 's'}`,
        action: {
          label: 'Undo',
          onClick: () =>
            prevs.forEach((p) => updateStage.mutate({ candidateId: p.id, stage: p.stage })),
        },
      })
      setBulkKind(null)
    },
    [bulkKind, accept, reject, updateStage],
  )

  // Keyboard model (Stitch bottom bar): ↕ move · ↵ deeper · A/R/S/D · Z undo.
  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (isEditable(event.target)) return
      // Don't act on the queue while a drawer/dialog (e.g. Deeper) is open over it.
      if (document.querySelector('[role="dialog"][data-state="open"]')) return
      if (needs.length === 0) return
      const key = event.key.toLowerCase()
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setFocused(Math.min(focusedIndex + 1, needs.length - 1))
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        setFocused(Math.max(focusedIndex - 1, 0))
      } else if (key === 'a') {
        act(needs[focusedIndex], 'advance')
      } else if (key === 'r') {
        act(needs[focusedIndex], 'reject')
      } else if (key === 's') {
        act(needs[focusedIndex], 'shortlist')
      } else if (key === 'd' || event.key === 'Enter') {
        act(needs[focusedIndex], 'deeper')
      } else if (key === 'z') {
        undo()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [needs, focusedIndex, act, undo])

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-10 w-full max-w-sm" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (isError) {
    return <ErrorState variant="route" title="Couldn't load triage" onRetry={() => refetch()} />
  }

  if (!data || data.length === 0) {
    return (
      <Card variant="ai">
        <EmptyState
          variant="first-run"
          icon={Users}
          title="Nothing to triage yet"
          description="Add candidates and HireLens will sort the clear calls and surface the ones that need you."
        />
      </Card>
    )
  }

  const aiSorted = accept.length + reject.length
  const bulkRows = bulkKind === 'accept' ? accept : bulkKind === 'reject' ? reject : []

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4">
        <h2 className="hl-display-md text-hl-fg">Triage Overview</h2>
        <div className="flex flex-wrap items-end gap-x-10 gap-y-4">
          <Stat value={total} label="total" />
          <Stat value={aiSorted} label="AI-sorted" tone="text-hl-fg-secondary" />
          <Stat value={needs.length} label="need you" tone="text-hl-accent-fg" />
          <Stat value={done.length} label="done" tone="text-hl-fg-secondary" />
        </div>
        <p className="hl-small flex items-center gap-2 text-hl-fg-secondary">
          <Sparkles className="size-3.5 text-hl-prism-mid" aria-hidden />
          AI sorted {aiSorted} by fit and recommendation · {needs.length} need your judgment
          {done.length > 0 ? ` · ${done.length} resolved` : ''}.
        </p>
      </header>

      {needs.length === 0 && aiSorted === 0 ? (
        <Card>
          <EmptyState
            icon={CheckCircle2}
            title="Triage clear"
            description="Every candidate has been triaged. New arrivals will show up here for sorting."
          />
        </Card>
      ) : (
        <>
          <TriageQueue rows={needs} focusedIndex={focusedIndex} onFocusRow={setFocused} onAction={act} />
          <TriagePiles
            accept={accept}
            reject={reject}
            onReviewAccept={() => setBulkKind('accept')}
            onReviewReject={() => setBulkKind('reject')}
          />
        </>
      )}

      {bulkKind ? (
        <BulkConfirmDrawer
          key={bulkKind}
          kind={bulkKind}
          rows={bulkRows}
          pending={updateStage.isPending}
          onClose={() => setBulkKind(null)}
          onConfirm={onBulkConfirm}
          onOpenCandidate={openDeepReview}
        />
      ) : null}

      {/* Keyboard legend (Stitch bottom bar) */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-hl-border-subtle pt-4 font-hl-mono text-[10px] uppercase tracking-wide text-hl-fg-tertiary">
        <span>↕ move</span>
        <span>↵ deeper</span>
        <span>A advance</span>
        <span>R reject</span>
        <span>S shortlist</span>
        <span>D deeper</span>
        <span>Z undo</span>
      </div>
    </div>
  )
}
