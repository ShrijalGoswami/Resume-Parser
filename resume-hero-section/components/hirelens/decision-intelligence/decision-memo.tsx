'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AppShell } from '../shell'
import { useSession } from '../lib/api/use-session'
import { useProfile, useUpdateRecommendation } from '../lib/api/hooks'
import { useCampaign } from '../lib/api/workspace'
import { useAllRecommendations } from '../lib/api/ask'
import { useCandidateDetail, getCandidateResult } from '../lib/api/candidate'
import { LoadingScreen } from '../states/loading'
import { ErrorState } from '../states/error-state'
import { Button } from '../ui/button'
import { Kbd } from '../ui/kbd'
import { toast } from '../ui/use-toast'
import { focusBand } from '../lib/focus-scale'
import { ConfidenceChip } from './confidence-chip'
import { AnalystBrief } from './analyst-brief'
import { ConfidencePanel } from './confidence-panel'
import { signalsFromResult } from './signals'
import type { CandidateResult } from '@/types/batch'
import type { Recommendation } from '@/types/agent'

type Account = { name: string; email: string } | undefined

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

/**
 * Decision Intelligence memo (Stitch). The Approve/Override surface for an AI
 * recommendation — "should I trust this?". Concise and executive; the long-form
 * evidence read lives in the Dossier ("Read full review"). Deep-linkable at
 * /roles/[roleId]/decisions/[decisionId].
 */
export function DecisionMemo({ roleId, decisionId }: { roleId: string; decisionId: string }) {
  const { session, loading, configured } = useSession()

  if (!configured) return <AppShell title="Decision"><Notice title="Sign-in isn't configured" /></AppShell>
  if (loading) return <AppShell title="Decision"><LoadingScreen /></AppShell>
  if (!session) return <AppShell title="Decision"><Notice title="Sign in to continue" showSignIn /></AppShell>
  return <AuthedMemo roleId={roleId} decisionId={decisionId} />
}

function AuthedMemo({ roleId, decisionId }: { roleId: string; decisionId: string }) {
  const profile = useProfile()
  const campaign = useCampaign(roleId)
  const recs = useAllRecommendations()

  const account: Account = profile.data
    ? { name: profile.data.full_name ?? profile.data.email, email: profile.data.email }
    : undefined
  const roleTitle = campaign.data?.title ?? 'Role'
  const crumbs = [{ label: roleTitle, href: `/roles/${roleId}` }, { label: 'Decision' }]

  if (recs.isLoading) {
    return (
      <AppShell breadcrumbs={crumbs} account={account}>
        <LoadingScreen label="Loading decision" />
      </AppShell>
    )
  }

  const rec = recs.data?.find((r) => r.id === decisionId)
  if (recs.isError || !rec) {
    return (
      <AppShell breadcrumbs={crumbs} account={account}>
        <ErrorState variant="route" title="Couldn't find this decision" onRetry={() => recs.refetch()} />
      </AppShell>
    )
  }

  if (rec.candidate_id) {
    return (
      <MemoWithCandidate
        roleId={roleId}
        candidateId={rec.candidate_id}
        rec={rec}
        roleTitle={roleTitle}
        account={account}
      />
    )
  }
  return <MemoLayout roleId={roleId} rec={rec} result={null} roleTitle={roleTitle} account={account} />
}

function MemoWithCandidate({
  roleId,
  candidateId,
  rec,
  roleTitle,
  account,
}: {
  roleId: string
  candidateId: string
  rec: Recommendation
  roleTitle: string
  account: Account
}) {
  const detail = useCandidateDetail(roleId, candidateId)
  const result = getCandidateResult(detail.data)
  return <MemoLayout roleId={roleId} rec={rec} result={result} roleTitle={roleTitle} account={account} />
}

function MemoLayout({
  roleId,
  rec,
  result,
  roleTitle,
  account,
}: {
  roleId: string
  rec: Recommendation
  result: CandidateResult | null
  roleTitle: string
  account: Account
}) {
  const router = useRouter()
  const update = useUpdateRecommendation()

  const signals = signalsFromResult(result)
  const fit = result?.overall_score ?? null
  const band = focusBand(fit)
  const watchouts = result?.weaknesses ?? []

  const resolve = React.useCallback(
    (status: 'approved' | 'dismissed', verb: string) => {
      update.mutate({ id: rec.id, status })
      toast({
        title: `${verb} ${rec.title}`,
        action: { label: 'Undo', onClick: () => update.mutate({ id: rec.id, status: 'pending' }) },
      })
      router.back()
    },
    [rec.id, rec.title, router, update],
  )

  const approve = React.useCallback(() => resolve('approved', 'Approved'), [resolve])
  const override = React.useCallback(() => resolve('dismissed', 'Overrode'), [resolve])

  // Enter approves (Stitch ⏎). Dormant in fields / dialogs.
  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (isEditable(event.target)) return
      if (document.querySelector('[role="dialog"][data-state="open"]')) return
      if (event.key === 'Enter') {
        event.preventDefault()
        approve()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [approve])

  const crumbs = [{ label: roleTitle, href: `/roles/${roleId}` }, { label: 'Decision' }]

  return (
    <AppShell breadcrumbs={crumbs} account={account}>
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 pb-16 pt-10">
        <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
          <div className="min-w-0">
            <p className="font-hl-mono text-[10px] uppercase tracking-widest text-hl-fg-tertiary">
              Decision brief · {roleTitle}
            </p>
            <h1 className="hl-display-md mt-1 text-hl-fg">{rec.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <ConfidenceChip confidence={rec.confidence} />
              {fit !== null ? (
                <span className={cn('hl-caption rounded-hl-sm bg-hl-subtle px-2 py-0.5 font-hl-mono tabular-nums', band.text)}>
                  {fit} · {band.label}
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="primary" onClick={approve} loading={update.isPending}>
              Approve <Kbd className="ml-1">⏎</Kbd>
            </Button>
            <Button variant="ghost" onClick={override} disabled={update.isPending}>
              Override
            </Button>
          </div>
        </header>

        <AnalystBrief rec={rec} signals={signals} watchouts={watchouts} />

        <ConfidencePanel signals={signals} />

        {rec.candidate_id ? (
          <Link
            href={`/roles/${roleId}/candidates/${rec.candidate_id}`}
            className="hl-small flex items-center gap-1 self-start text-hl-accent-fg outline-none hover:underline"
          >
            Read full review <ArrowUpRight className="size-3.5" aria-hidden />
          </Link>
        ) : null}
      </div>
    </AppShell>
  )
}
