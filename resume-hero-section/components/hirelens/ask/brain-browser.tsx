'use client'

import * as React from 'react'
import { Search, Sparkles, BrainCircuit } from 'lucide-react'
import { Button } from '../ui/button'
import { Skeleton } from '../ui/skeleton'
import { Badge } from '../ui/badge'
import { ConfidencePill } from '../domain'
import { EmptyState } from '../states/empty-state'
import { ErrorState } from '../states/error-state'
import { useMemoryList, useRetrieveMemory } from '../lib/api/ask'
import { PageHeader } from '../shell/page-header'
import type { MemoryHit, MemoryItem } from '@/types/knowledge'

/**
 * Browse the org brain (UX Spec §9.2, mode 1) — the supporting memory/decision
 * explorer for power users. Retrieval is explainable: each hit carries the
 * reasons it matched (`_why`). "Ask in a thread" promotes a query to the
 * conversational canvas where it is answered with grounded citations.
 */
export function BrainBrowser({ onAskInThread }: { onAskInThread: (query: string) => void }) {
  const [mode, setMode] = React.useState<'all' | 'decision'>('all')
  const [query, setQuery] = React.useState('')
  const [hits, setHits] = React.useState<MemoryHit[] | null>(null)

  const list = useMemoryList(mode === 'decision' ? 'decision' : undefined)
  const retrieve = useRetrieveMemory()

  const runSearch = () => {
    const q = query.trim()
    if (!q) return
    retrieve.mutate(q, { onSuccess: (results) => setHits(results) })
  }

  const clearSearch = () => {
    setHits(null)
    setQuery('')
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex max-w-[800px] flex-col gap-5 px-4 py-6">
        <PageHeader
          title="Org brain"
          description="Your organization’s hiring memory — accumulated automatically, used by every answer."
          spacing="none"
        />

        <div className="flex gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-hl-md border border-hl-border bg-hl-canvas px-3 focus-within:border-hl-accent">
            <Search className="size-4 shrink-0 text-hl-fg-tertiary" aria-hidden />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') runSearch()
              }}
              placeholder="Search the memory… e.g. who did we hire for backend?"
              aria-label="Search the org brain"
              className="hl-body h-[var(--hl-control-h-md)] flex-1 bg-transparent text-hl-fg outline-none placeholder:text-hl-fg-tertiary"
            />
          </div>
          <Button variant="secondary" onClick={runSearch} disabled={!query.trim()}>
            Retrieve
          </Button>
        </div>

        {retrieve.isError ? (
          <ErrorState variant="inline" title="Search didn’t run" onRetry={runSearch} />
        ) : null}

        {hits !== null ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="hl-small text-hl-fg-secondary">
                {hits.length} relevant {hits.length === 1 ? 'memory' : 'memories'} · explainable
                ranking
              </p>
              <div className="flex gap-2">
                <Button variant="ai" size="sm" onClick={() => onAskInThread(query)}>
                  <Sparkles /> Ask in a thread
                </Button>
                <Button variant="ghost" size="sm" onClick={clearSearch}>
                  Back to browse
                </Button>
              </div>
            </div>
            {hits.length === 0 ? (
              <EmptyState
                variant="zero-results"
                title="No matching memories"
                description="Try broader words, or ask the question in a thread to get a grounded answer."
              />
            ) : (
              hits.map((hit) => <MemoryCard key={hit.id} memory={hit} why={hit._why} />)
            )}
          </div>
        ) : (
          <>
            <div role="group" aria-label="Memory kind" className="flex gap-1.5">
              <FilterChip active={mode === 'all'} onClick={() => setMode('all')}>
                All memories
              </FilterChip>
              <FilterChip active={mode === 'decision'} onClick={() => setMode('decision')}>
                Decisions
              </FilterChip>
            </div>

            {list.isLoading ? (
              <div className="flex flex-col gap-2">
                {[0, 1, 2].map((index) => (
                  <Skeleton key={index} className="h-20" />
                ))}
              </div>
            ) : list.isError ? (
              <ErrorState
                variant="inline"
                title="Couldn’t load the org brain"
                onRetry={() => list.refetch()}
              />
            ) : (list.data ?? []).length === 0 ? (
              <EmptyState
                icon={BrainCircuit}
                title="The brain is still learning"
                description="Memory accumulates as you use HireLens — decisions, answers, and outcomes all feed it."
              />
            ) : (
              <div className="flex flex-col gap-2">
                {(list.data ?? []).slice(0, 40).map((memory) => (
                  <MemoryCard key={memory.id} memory={memory} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={
        active
          ? 'hl-small rounded-hl-md border border-hl-accent bg-hl-accent-subtle px-3 py-1 text-hl-accent-fg outline-none'
          : 'hl-small rounded-hl-md border border-hl-border bg-hl-canvas px-3 py-1 text-hl-fg-secondary outline-none hover:border-hl-border-strong'
      }
    >
      {children}
    </button>
  )
}

function MemoryCard({ memory, why }: { memory: MemoryItem; why?: string[] }) {
  return (
    <div className="rounded-hl-md border border-hl-border-subtle bg-hl-canvas p-3">
      <p className="hl-small text-hl-fg">{memory.value_text}</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <Badge variant="neutral" className="capitalize">
          {memory.source || 'unknown'}
        </Badge>
        {memory.occurred_at ? (
          <span className="hl-caption text-hl-fg-tertiary">{memory.occurred_at.slice(0, 10)}</span>
        ) : null}
        <ConfidencePill value={memory.confidence} />
        {memory.entities.slice(0, 4).map((entity, index) => (
          <span
            key={`${entity.name}-${index}`}
            className="hl-caption rounded-full bg-hl-accent-subtle px-2 py-0.5 text-hl-accent-fg"
          >
            {entity.name}
          </span>
        ))}
      </div>
      {why && why.length > 0 ? (
        <p className="hl-caption mt-1.5 italic text-hl-fg-tertiary">
          Why it matched: {why.join(' · ')}
        </p>
      ) : null}
    </div>
  )
}
