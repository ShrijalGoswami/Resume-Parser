'use client'

import * as React from 'react'
import { Search, Sparkles, GitCompare, FolderPlus, X, Bookmark, Users } from 'lucide-react'
import { AppShell } from '../shell'
import { useSession } from '../lib/api/use-session'
import { useProfile } from '../lib/api/hooks'
import { useCompareCandidates } from '../lib/api/workspace'
import { useTalentSearch, useSimilarCandidates, type SimilarSeed } from '../lib/api/talent'
import { useSearchHistory, useSavedSearches, type CollectionItem, type SavedTalentSearch } from '../lib/talent-store'
import { TalentSidebar } from './talent-sidebar'
import { TalentFilters } from './talent-filters'
import { ResultsList } from './results-list'
import { CollectionView } from './collection-view'
import { AddToCollectionDialog } from './add-to-collection-dialog'
import { CandidateDrawer } from '../workspace/candidate/candidate-drawer'
import { ComparePanel } from '../workspace/compare-panel'
import { Button } from '../ui/button'
import { Skeleton } from '../ui/skeleton'
import { EmptyState } from '../states/empty-state'
import { ErrorState } from '../states/error-state'
import { LoadingScreen } from '../states/loading'
import { toast } from '../ui/use-toast'
import Link from 'next/link'
import type { SearchFilters, SearchResultItem } from '@/types/search'

const EXAMPLES = [
  'Senior Python engineers, FastAPI + fintech, 5+ years',
  'Product designers with a systems background',
  'Backend engineers who know Kubernetes and payments',
]

function syncUrl(query: string, filters: SearchFilters) {
  const url = new URL(window.location.href)
  const p = url.searchParams
  if (query) p.set('q', query)
  else p.delete('q')
  if (filters.min_score) p.set('min_score', String(filters.min_score))
  else p.delete('min_score')
  if (filters.min_experience) p.set('min_exp', String(filters.min_experience))
  else p.delete('min_exp')
  if (filters.location) p.set('location', filters.location)
  else p.delete('location')
  window.history.replaceState(null, '', `${url.pathname}${url.search}`)
}

export interface TalentInitial {
  q: string
  filters: SearchFilters
}

export function TalentScreen({ initial }: { initial: TalentInitial }) {
  const { session, loading, configured } = useSession()
  if (!configured) {
    return (
      <AppShell title="Talent">
        <div className="p-12 text-center hl-display">Sign-in isn&rsquo;t configured</div>
      </AppShell>
    )
  }
  if (loading) {
    return (
      <AppShell title="Talent">
        <LoadingScreen />
      </AppShell>
    )
  }
  if (!session) {
    return (
      <AppShell title="Talent">
        <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-24 text-center">
          <h1 className="hl-display">Sign in to continue</h1>
          <Button variant="primary" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </AppShell>
    )
  }
  return <AuthedTalent initial={initial} />
}

function AuthedTalent({ initial }: { initial: TalentInitial }) {
  const profile = useProfile()
  const account = profile.data
    ? { name: profile.data.full_name ?? profile.data.email, email: profile.data.email }
    : undefined

  const [draft, setDraft] = React.useState(initial.q)
  const [query, setQuery] = React.useState(initial.q)
  const [filters, setFilters] = React.useState<SearchFilters>(initial.filters)
  const [similarSeed, setSimilarSeed] = React.useState<SimilarSeed | null>(null)
  const [viewCollectionId, setViewCollectionId] = React.useState<string | null>(null)
  const [selected, setSelected] = React.useState<Set<string>>(() => new Set())
  const [activeIndex, setActiveIndex] = React.useState(0)
  const [drawerTarget, setDrawerTarget] = React.useState<{ roleId: string; candidateId: string } | null>(null)
  const [collectionItems, setCollectionItems] = React.useState<CollectionItem[] | null>(null)
  const [compareOpen, setCompareOpen] = React.useState(false)
  const [compareIds, setCompareIds] = React.useState<string[]>([])

  const searchInputRef = React.useRef<HTMLInputElement>(null)
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const history = useSearchHistory()
  const savedSearches = useSavedSearches()

  const searchActive = !similarSeed && !viewCollectionId
  const search = useTalentSearch({ query, filters }, searchActive)
  const similar = useSimilarCandidates(similarSeed)
  const active = similarSeed ? similar : search
  const results = React.useMemo<SearchResultItem[]>(() => active.data?.results ?? [], [active.data])

  const selectedResults = results.filter((result) => selected.has(result.candidate_id))
  const sharedCampaignId = React.useMemo(() => {
    const campaigns = new Set(selectedResults.map((result) => result.campaign_id))
    return campaigns.size === 1 ? ([...campaigns][0] ?? null) : null
  }, [selectedResults])
  const compare = useCompareCandidates(sharedCampaignId ?? '')

  const runSearch = (nextQuery: string, nextFilters: SearchFilters) => {
    setSimilarSeed(null)
    setViewCollectionId(null)
    setSelected(new Set())
    setActiveIndex(0)
    setDraft(nextQuery)
    setQuery(nextQuery)
    setFilters(nextFilters)
    syncUrl(nextQuery, nextFilters)
    if (nextQuery.trim()) history.add(nextQuery)
  }

  const changeFilters = (patch: Partial<SearchFilters>) => {
    const next = { ...filters, ...patch }
    setFilters(next)
    if (query.trim()) syncUrl(query, next)
  }

  const openResult = React.useCallback((result: SearchResultItem) => {
    if (result.campaign_id) {
      setDrawerTarget({ roleId: result.campaign_id, candidateId: result.candidate_id })
    } else {
      toast({ variant: 'warning', title: 'This candidate is not attached to a role yet' })
    }
  }, [])

  const findSimilar = (result: SearchResultItem) => {
    setSimilarSeed({ candidateId: result.candidate_id, campaignId: result.campaign_id, name: result.name })
    setSelected(new Set())
    setActiveIndex(0)
  }

  const toItem = (result: SearchResultItem): CollectionItem => ({
    candidateId: result.candidate_id,
    campaignId: result.campaign_id,
    name: result.name,
  })

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const runCompare = () => {
    const ids = selectedResults.map((r) => r.candidate_id)
    setCompareIds(ids)
    compare.mutate(ids)
    setCompareOpen(true)
  }

  // Keyboard: `/` focus search, ↑↓ move, ↵ open (when not typing).
  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement | null
      const typing =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      if (event.key === '/' && !typing) {
        event.preventDefault()
        searchInputRef.current?.focus()
      } else if (!typing && results.length > 0) {
        if (event.key === 'ArrowDown') {
          event.preventDefault()
          setActiveIndex((index) => Math.min(index + 1, results.length - 1))
        } else if (event.key === 'ArrowUp') {
          event.preventDefault()
          setActiveIndex((index) => Math.max(index - 1, 0))
        } else if (event.key === 'Enter') {
          event.preventDefault()
          const result = results[activeIndex]
          if (result) openResult(result)
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [results, activeIndex, openResult])

  const hasFilters = Boolean(filters.min_score || filters.min_experience || filters.location)
  const canCompare =
    selected.size >= 2 && selected.size <= 5 && sharedCampaignId !== null

  return (
    <AppShell title="Talent" account={account}>
      <div className="flex h-full">
        <aside className="hidden w-56 shrink-0 overflow-y-auto border-r border-hl-border-subtle p-4 lg:block">
          <TalentSidebar
            onRunQuery={(q) => runSearch(q, filters)}
            onRunSaved={(saved: SavedTalentSearch) => runSearch(saved.query, saved.filters)}
            onOpenCollection={(id) => setViewCollectionId(id)}
          />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="sticky top-0 z-10 border-b border-hl-border-subtle bg-hl-canvas p-4">
            <div className="mx-auto flex max-w-3xl flex-col gap-3">
              <div className="flex items-center gap-2 rounded-hl-lg border border-hl-border bg-hl-canvas px-3 focus-within:border-hl-accent">
                <Search className="size-5 shrink-0 text-hl-fg-tertiary" aria-hidden />
                <input
                  ref={searchInputRef}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') runSearch(draft, filters)
                  }}
                  placeholder="Describe who you're looking for…"
                  aria-label="Describe who you're looking for"
                  aria-keyshortcuts="/"
                  className="hl-body h-12 flex-1 bg-transparent text-hl-fg outline-none placeholder:text-hl-fg-tertiary"
                />
                <Button variant="primary" size="sm" onClick={() => runSearch(draft, filters)}>
                  Search
                </Button>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <TalentFilters filters={filters} onChange={changeFilters} />
                {query.trim() ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      savedSearches.save({ name: query.slice(0, 40), query, filters })
                      toast({ variant: 'success', title: 'Search saved' })
                    }}
                  >
                    <Bookmark /> Save search
                  </Button>
                ) : null}
              </div>
            </div>
          </div>

          {selected.size > 0 && !viewCollectionId ? (
            <div className="border-b border-hl-border-subtle bg-hl-subtle px-4 py-2">
              <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-2">
                <span className="hl-body-medium">{selected.size} selected</span>
                <span className="h-4 w-px bg-hl-border" aria-hidden />
                <Button size="sm" variant="secondary" onClick={runCompare} disabled={!canCompare}>
                  <GitCompare /> Compare
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setCollectionItems(selectedResults.map(toItem))}
                >
                  <FolderPlus /> Save to collection
                </Button>
                {!canCompare && selected.size >= 2 ? (
                  <span className="hl-caption text-hl-fg-tertiary">
                    Compare needs 2–5 candidates from the same role
                  </span>
                ) : null}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelected(new Set())}
                  className="ml-auto"
                >
                  <X /> Clear
                </Button>
              </div>
            </div>
          ) : null}

          <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto p-4">
            <div className="mx-auto max-w-3xl">
              {viewCollectionId ? (
                <CollectionView
                  collectionId={viewCollectionId}
                  onBack={() => setViewCollectionId(null)}
                  onOpen={(item) =>
                    item.campaignId
                      ? setDrawerTarget({ roleId: item.campaignId, candidateId: item.candidateId })
                      : undefined
                  }
                />
              ) : !query.trim() && !similarSeed ? (
                <EmptyState
                  icon={Users}
                  title="Find people across your talent pool"
                  description="Describe who you're looking for in plain language."
                >
                  <div className="flex flex-col items-center gap-2">
                    {EXAMPLES.map((example) => (
                      <button
                        key={example}
                        type="button"
                        onClick={() => runSearch(example, filters)}
                        className="hl-small rounded-hl-md border border-hl-border bg-hl-canvas px-3 py-1.5 text-hl-fg-secondary outline-none hover:border-hl-border-strong hover:text-hl-fg"
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                </EmptyState>
              ) : active.isLoading ? (
                <div className="flex flex-col gap-2">
                  {[0, 1, 2, 3].map((index) => (
                    <Skeleton key={index} className="h-32" />
                  ))}
                </div>
              ) : active.isError ? (
                <ErrorState
                  variant="inline"
                  title="Search didn't run"
                  onRetry={() => active.refetch()}
                />
              ) : results.length === 0 ? (
                <EmptyState
                  icon={Search}
                  title="No strong matches"
                  description={
                    hasFilters
                      ? 'Try relaxing your filters or broadening the description.'
                      : 'Try broadening the description.'
                  }
                  action={
                    hasFilters ? (
                      <Button
                        variant="secondary"
                        onClick={() =>
                          runSearch(query, { min_score: null, min_experience: null, location: null })
                        }
                      >
                        Clear filters
                      </Button>
                    ) : undefined
                  }
                />
              ) : (
                <>
                  <div className="mb-3 flex items-center gap-2">
                    {similarSeed ? (
                      <>
                        <Sparkles className="size-4 text-hl-prism-mid" aria-hidden />
                        <p className="hl-small text-hl-fg-secondary">
                          Similar to <span className="text-hl-fg">{similarSeed.name}</span> ·{' '}
                          {results.length} found
                        </p>
                        <Button variant="ghost" size="sm" onClick={() => setSimilarSeed(null)}>
                          Back to search
                        </Button>
                      </>
                    ) : (
                      <p className="hl-small text-hl-fg-secondary">
                        Found {active.data?.count ?? results.length} candidates · strongest first
                      </p>
                    )}
                  </div>
                  <ResultsList
                    results={results}
                    selected={selected}
                    activeIndex={activeIndex}
                    scrollRef={scrollRef}
                    onToggle={toggle}
                    onOpen={openResult}
                    onFindSimilar={findSimilar}
                    onAddToCollection={(result) => setCollectionItems([toItem(result)])}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <CandidateDrawer
        roleId={drawerTarget?.roleId ?? ''}
        candidateId={drawerTarget?.candidateId ?? null}
        onClose={() => setDrawerTarget(null)}
      />
      <ComparePanel
        open={compareOpen}
        count={compareIds.length}
        result={compare}
        onRetry={() => compare.mutate(compareIds)}
        onClose={() => {
          setCompareOpen(false)
          compare.reset()
        }}
      />
      <AddToCollectionDialog
        items={collectionItems ?? []}
        open={collectionItems !== null}
        onOpenChange={(open) => {
          if (!open) setCollectionItems(null)
        }}
      />
    </AppShell>
  )
}
