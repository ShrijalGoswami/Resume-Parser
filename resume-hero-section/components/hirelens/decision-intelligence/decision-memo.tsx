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
import { toast } from '../ui/use-toast'
import { focusBand } from '../lib/focus-scale'
import { useCan, PERMS } from '../lib/use-can'
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
  const canDecide = useCan(PERMS.AGENT_MANAGE)

  const signals = signalsFromResult(result)
  const fit = result?.overall_score ?? null
  const band = focusBand(fit)
  const watchouts = result?.weaknesses ?? []

  const resolve = React.useCallback(
    (status: 'approved' | 'dismissed', verb: string) => {
      // Approve / Override write the recommendation (`agent.manage`). Guarded
      // here as well as in the header because ⏎ is bound to approve by an effect
      // that runs whether or not the buttons rendered.
      if (!canDecide) return
      update.mutate({ id: rec.id, status })
      // NO UNDO. This toast used to offer one, which PATCHed the record back to
      // `pending` — an action the database refuses: the trigger behind
      // `decided_at`/`decided_by` freezes both on write and rejects any
      // re-decision (see `agent_repository.update_status`). So the control was
      // offering a route that could only ever fail, on the screen whose entire
      // job is making a decision feel accountable.
      //
      // The honest replacement is to say the decision is permanent. A rollback
      // faked on the client would be worse than the failing button: the Ledger
      // is the record of what was decided, and it would disagree.
      toast({
        variant: 'success',
        title: `${verb} · ${rec.title}`,
        description:
          status === 'approved'
            ? 'Decision recorded. This decision is permanent.'
            : 'Decision recorded as overridden. This decision is permanent.',
      })
      router.back()
    },
    [rec.id, rec.title, router, update, canDecide],
  )

  const approve = React.useCallback(() => resolve('approved', 'Approved'), [resolve])
  const override = React.useCallback(() => resolve('dismissed', 'Overridden'), [resolve])

  // NO GLOBAL ENTER-TO-APPROVE.
  //
  // This screen used to bind `keydown` on `window` and approve on Enter. Its
  // only guards were modifier keys, editable targets and an open dialog — it
  // never checked that focus was on, or even inside, this memo. So Enter with
  // focus on the body, a link, or the nav rail recorded an approval, and
  // `preventDefault()` swallowed whatever the focused element would have done.
  //
  // That is an irreversible write — the database freezes `decided_at`/
  // `decided_by` and refuses re-decision — reachable from a keystroke the
  // reader never aimed at this control. A stray Enter is not consent.
  //
  // Approving now requires an explicit action on the button: a click, or Enter
  // or Space while it is focused, which the browser already gives every
  // <button> natively. Nothing replaces the global listener, because the
  // correct number of ways to irreversibly approve a hiring decision without
  // touching the control is zero.

  const crumbs = [{ label: roleTitle, href: `/roles/${roleId}` }, { label: 'Decision' }]

  return (
    <AppShell breadcrumbs={crumbs} account={account}>
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 pb-16 pt-10">
        <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
          <div className="min-w-0">
            <p className="hl-label-sm font-hl-mono text-hl-fg-tertiary">
              Decision brief · {roleTitle}
            </p>
            <h1 className="hl-display mt-1 text-hl-fg">{rec.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <ConfidenceChip confidence={rec.confidence} />
              {fit !== null ? (
                <span className={cn('hl-caption rounded-hl-sm bg-hl-subtle px-2 py-0.5 font-hl-mono tabular-nums', band.text)}>
                  {fit} · {band.label}
                </span>
              ) : null}
            </div>
          </div>
          {canDecide ? (
            <div className="flex shrink-0 items-center gap-2">
              {/* The `⏎` hint is gone with the global handler it advertised —
                  a badge promising a shortcut that no longer exists would be
                  worse than no badge. The button still takes Enter/Space when
                  focused, which is the browser's own behaviour. */}
              <Button variant="primary" onClick={approve} loading={update.isPending}>
                Approve
              </Button>
              <Button variant="ghost" onClick={override} disabled={update.isPending}>
                Override
              </Button>
            </div>
          ) : null}
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
