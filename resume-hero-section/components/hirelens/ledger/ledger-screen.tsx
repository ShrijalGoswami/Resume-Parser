'use client'

import * as React from 'react'
import Link from 'next/link'
import { BookText } from 'lucide-react'
import { AppShell } from '../shell'
import { useSession } from '../lib/api/use-session'
import { useProfile } from '../lib/api/hooks'
import { useAllRecommendations } from '../lib/api/ask'
import { LoadingScreen } from '../states/loading'
import { EmptyState } from '../states/empty-state'
import { ErrorState } from '../states/error-state'
import { Button } from '../ui/button'
import { LedgerTable } from './ledger-table'
import { LedgerRecordDrawer } from './ledger-record-drawer'
import { isResolved, sortLedger, fmtDate } from './ledger-meta'
import type { Recommendation } from '@/types/agent'

const LEDGER_CRUMBS = [{ label: 'Ledger' }]
const PAGE_SIZE = 12

function Notice({ title, showSignIn }: { title: string; showSignIn?: boolean }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-24 text-center">
      <h1 className="hl-display-md">{title}</h1>
      {showSignIn ? (
        <Button variant="primary" asChild>
          <Link href="/auth/login">Sign in</Link>
        </Button>
      ) : null}
    </div>
  )
}

/**
 * Decision Ledger (Stitch "The Permanent Record"). The immutable audit journal of
 * AI recommendations that reached a decision — read as they stood at the moment
 * of the call. Resolved recommendations only; no outcome, regret, or
 * retrospective scoring.
 */
export function LedgerScreen() {
  const { session, loading, configured } = useSession()

  if (!configured) {
    return (
      <AppShell breadcrumbs={LEDGER_CRUMBS}>
        <Notice title="Sign-in isn't configured" />
      </AppShell>
    )
  }
  if (loading) {
    return (
      <AppShell breadcrumbs={LEDGER_CRUMBS}>
        <LoadingScreen />
      </AppShell>
    )
  }
  if (!session) {
    return (
      <AppShell breadcrumbs={LEDGER_CRUMBS}>
        <Notice title="Sign in to continue" showSignIn />
      </AppShell>
    )
  }
  return <AuthedLedger />
}

function AuthedLedger() {
  const profile = useProfile()
  const recs = useAllRecommendations()
  const [selected, setSelected] = React.useState<Recommendation | null>(null)
  const [page, setPage] = React.useState(0)

  const account = profile.data
    ? { name: profile.data.full_name ?? profile.data.email, email: profile.data.email }
    : undefined

  const resolved = React.useMemo(
    () => sortLedger((recs.data ?? []).filter(isResolved)),
    [recs.data],
  )

  const pageCount = Math.max(1, Math.ceil(resolved.length / PAGE_SIZE))
  const clampedPage = Math.min(page, pageCount - 1)
  const pageRows = resolved.slice(clampedPage * PAGE_SIZE, clampedPage * PAGE_SIZE + PAGE_SIZE)
  const rangeStart = resolved.length === 0 ? 0 : clampedPage * PAGE_SIZE + 1
  const rangeEnd = Math.min((clampedPage + 1) * PAGE_SIZE, resolved.length)
  const newest = resolved[0]?.updated_at ?? resolved[0]?.created_at
  const oldest =
    resolved[resolved.length - 1]?.updated_at ?? resolved[resolved.length - 1]?.created_at

  let body: React.ReactNode
  if (recs.isLoading) {
    body = <LoadingScreen label="Loading the ledger" />
  } else if (recs.isError) {
    body = (
      <ErrorState variant="route" title="Couldn't load the ledger" onRetry={() => recs.refetch()} />
    )
  } else if (resolved.length === 0) {
    body = (
      <EmptyState
        icon={BookText}
        title="No decisions recorded yet"
        description="Decisions you approve or override in the Inbox are written here — permanently, as they stood."
      />
    )
  } else {
    body = (
      <div className="flex flex-col gap-4">
        <LedgerTable rows={pageRows} onOpen={setSelected} />
        <div className="flex items-center justify-between">
          <p className="hl-small text-hl-fg-tertiary">
            Showing <span className="font-hl-mono tabular-nums">{rangeStart}–{rangeEnd}</span> of{' '}
            <span className="font-hl-mono tabular-nums">{resolved.length}</span> records
          </p>
          {pageCount > 1 ? (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={clampedPage === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={clampedPage >= pageCount - 1}
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              >
                Next
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <AppShell breadcrumbs={LEDGER_CRUMBS} account={account}>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 pb-16 pt-10">
        <header className="flex flex-col gap-3">
          {oldest ? (
            <p className="font-hl-mono text-[11px] uppercase tracking-widest text-hl-fg-tertiary">
              {fmtDate(oldest)} — {fmtDate(newest)}
            </p>
          ) : null}
          <h1 className="hl-display-md text-hl-fg">The decisions you&rsquo;ve made.</h1>
          <p className="hl-body max-w-2xl text-hl-fg-secondary">
            Every decision and the evidence behind it — recorded as it stood at the moment of the
            call.
          </p>
        </header>
        {body}
      </div>
      <LedgerRecordDrawer rec={selected} onClose={() => setSelected(null)} />
    </AppShell>
  )
}
