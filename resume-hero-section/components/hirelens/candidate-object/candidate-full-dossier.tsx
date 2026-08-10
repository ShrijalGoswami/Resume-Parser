'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AppShell } from '../shell'
import { useSession } from '../lib/api/use-session'
import { useProfile } from '../lib/api/hooks'
import { LoadingScreen } from '../states/loading'
import { ErrorState } from '../states/error-state'
import { Button } from '../ui/button'
import { useCandidateObject, useCandidateShortcuts } from './use-candidate-object'
import { NoteDialog } from './note-dialog'
import { PendingAnalysis } from './sections/primitives'
import { CandidateHeader } from './sections/header'
import { CandidateVerdict, CandidateSummary } from './sections/ai'
import {
  CandidateEvidence,
  CandidateSkills,
  CandidateInterviewQuestions,
} from './sections/evidence'
import { CandidateClaimEvidence } from './sections/claim-evidence'
import { CandidateResume, CandidateNotes, CandidateActivity } from './sections/record'
import { CandidateScorecard } from './sections/scorecard'
import { CandidateResumeRecord } from './sections/resume-record'
import { CandidateDecisionBar } from './sections/decision-bar'

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
 * CandidateFullDossier — the deep-linkable candidate object at full density. One
 * continuous scroll (NO tabs, no nested navigation): identity → the verdict →
 * evidence → the record (résumé/notes/activity) → the decision. Renders the SAME
 * section components as the Peek. Deep-link home: /roles/[roleId]/candidates/[id].
 */
export function CandidateFullDossier({ roleId, candidateId }: { roleId: string; candidateId: string }) {
  const { session, loading, configured } = useSession()

  if (!configured) {
    return (
      <AppShell title="Candidate review">
        <Notice title="Sign-in isn’t configured" />
      </AppShell>
    )
  }
  if (loading) {
    return (
      <AppShell title="Candidate review">
        <LoadingScreen />
      </AppShell>
    )
  }
  if (!session) {
    return (
      <AppShell title="Candidate review">
        <Notice title="Sign in to continue" showSignIn />
      </AppShell>
    )
  }
  return <AuthedDossier roleId={roleId} candidateId={candidateId} />
}

function AuthedDossier({ roleId, candidateId }: { roleId: string; candidateId: string }) {
  const router = useRouter()
  const profile = useProfile()
  const [noteOpen, setNoteOpen] = React.useState(false)
  const c = useCandidateObject(roleId, candidateId, { onDecided: () => router.back() })

  useCandidateShortcuts(
    c.model
      ? {
          advance: c.advance,
          hold: c.hold,
          reject: c.reject,
          openResume: c.openResume,
          // F is a no-op here — this is already the full dossier.
          close: () => router.back(),
        }
      : {},
  )

  const account = profile.data
    ? { name: profile.data.full_name ?? profile.data.email, email: profile.data.email }
    : undefined
  const crumbs = [
    { label: c.roleTitle ?? 'Role', href: `/roles/${roleId}` },
    { label: c.model?.name ?? 'Candidate' },
  ]

  if (c.isLoading) {
    return (
      <AppShell breadcrumbs={crumbs} account={account}>
        <LoadingScreen label="Loading candidate" />
      </AppShell>
    )
  }
  if (c.isError || !c.model) {
    return (
      <AppShell breadcrumbs={crumbs} account={account}>
        <ErrorState variant="route" title="Couldn’t load this candidate" onRetry={c.refetch} />
      </AppShell>
    )
  }

  const model = c.model

  return (
    <AppShell breadcrumbs={crumbs} account={account}>
      {/* THE CASE FILE.
          The dossier was a 760px column on a 1440px screen: two thirds of the
          viewport carried nothing, and the reader scrolled past the judgment
          to reach the material it rests on. It is now two columns — the READ
          on the left, the RECORD on the right — so a claim and the résumé it
          came from are on screen together, which is the whole act of checking
          a hiring decision. Below `lg` it collapses to the original single
          column and the record follows the read, unchanged in order. */}
      {/* `pb-24` clears the sticky decision bar. At `pb-12` the bar sat on top
          of the last ~15px of the page — the missing-skills chips and the end
          of the activity list were behind it, which is exactly the content a
          reader is looking at when they reach for Advance. */}
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-6 pb-24 pt-10">
        <CandidateHeader model={model} />

        {/* The decision's inputs, before the decision's argument. */}
        <CandidateScorecard model={model} />

        {model.hasAnalysis ? (
          <div className="grid grid-cols-1 items-start gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)]">
            <div className="flex min-w-0 flex-col gap-8">
              <CandidateVerdict model={model} onOpenResume={c.openResume} />
              <CandidateSummary model={model} />
              {/* Claims carrying the résumé lines that echo them. The plain
                  strength/risk lists (still used by the Peek, where there is
                  no room for support) are replaced here — at full density the
                  page can afford to show what each assertion rests on. */}
              <CandidateClaimEvidence model={model} kind="strengths" />
              <CandidateEvidence model={model} />
              <CandidateClaimEvidence model={model} kind="risks" />
              <CandidateSkills model={model} />
              <CandidateInterviewQuestions model={model} />
            </div>

            <aside className="flex min-w-0 flex-col gap-8 lg:sticky lg:top-6">
              <CandidateResumeRecord model={model} />
              <CandidateResume model={model} onOpenResume={c.openResume} />
            </aside>
          </div>
        ) : (
          <>
            <PendingAnalysis />
            <CandidateResume model={model} onOpenResume={c.openResume} />
          </>
        )}

        <div className="border-t border-hl-border-subtle" />

        {/* The working record stays full width: notes are written across the
            page and activity is a timeline, neither belongs in a rail. */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <CandidateNotes roleId={roleId} candidateId={candidateId} />
          <CandidateActivity roleId={roleId} candidateId={candidateId} />
        </div>
      </div>

      <CandidateDecisionBar
        onAdvance={c.advance}
        onHold={c.hold}
        onReject={c.reject}
        onAddNote={() => setNoteOpen(true)}
        pending={c.pending}
      />

      <NoteDialog roleId={roleId} candidateId={candidateId} open={noteOpen} onOpenChange={setNoteOpen} />
    </AppShell>
  )
}
