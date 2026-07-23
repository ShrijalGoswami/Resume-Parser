'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AppShell } from '../shell'
import { useSession } from '../lib/api/use-session'
import { useProfile } from '../lib/api/hooks'
import { useCampaign, useUpdateStage } from '../lib/api/workspace'
import { useCandidateDetail, getCandidateResult, useCreateNote, useResumeUrl } from '../lib/api/candidate'
import { LoadingScreen } from '../states/loading'
import { ErrorState } from '../states/error-state'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog'
import { toast } from '../ui/use-toast'
import { DossierHeader } from './dossier-header'
import { DossierContent } from './dossier-content'
import { DecisionBar } from './decision-bar'
import type { EvidenceConflict } from './evidence-conflict'
import type { PipelineStage } from '@/types/campaign'

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
 * Deep Review — the full-page candidate Dossier (Stitch "Deep Review"). An
 * editorial decision document: THE VERDICT, an evidence-first read of the real
 * analysis, and the decision as its quiet conclusion. Deep-linkable at
 * /roles/[roleId]/candidates/[candidateId]; Back returns to the prior workspace.
 */
export function DeepReview({ roleId, candidateId }: { roleId: string; candidateId: string }) {
  const { session, loading, configured } = useSession()

  if (!configured) {
    return (
      <AppShell title="Candidate review">
        <Notice title="Sign-in isn't configured" />
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
  const campaign = useCampaign(roleId)
  const detail = useCandidateDetail(roleId, candidateId)
  const updateStage = useUpdateStage(roleId)
  const createNote = useCreateNote(roleId, candidateId)
  const resume = useResumeUrl(roleId, candidateId, false)

  const [noteOpen, setNoteOpen] = React.useState(false)
  const [noteText, setNoteText] = React.useState('')

  const candidate = detail.data
  const result = getCandidateResult(candidate)
  const name =
    candidate?.full_name || result?.name || candidate?.resume_filename || 'Candidate'

  // No source-conflict engine yet — the renderer stays ready, the array stays empty.
  const conflicts: EvidenceConflict[] = []

  const account = profile.data
    ? { name: profile.data.full_name ?? profile.data.email, email: profile.data.email }
    : undefined
  const crumbs = [
    { label: campaign.data?.title ?? 'Role', href: `/roles/${roleId}` },
    { label: name },
  ]

  const decide = React.useCallback(
    (stage: PipelineStage, verb: string, goBack: boolean) => {
      if (!candidate) return
      const prev = candidate.stage
      updateStage.mutate({ candidateId, stage })
      toast({
        title: `${verb} ${name}`,
        action: goBack
          ? { label: 'Undo', onClick: () => updateStage.mutate({ candidateId, stage: prev }) }
          : undefined,
      })
      if (goBack) router.back()
    },
    [candidate, candidateId, name, router, updateStage],
  )

  const onAdvance = React.useCallback(() => decide('interview', 'Advanced', true), [decide])
  const onReject = React.useCallback(() => decide('rejected', 'Rejected', true), [decide])
  const onHold = React.useCallback(() => decide('screening', 'Holding', false), [decide])

  // Decision keys: A advance · S hold · R reject. Dormant in fields / dialogs.
  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (isEditable(event.target)) return
      if (document.querySelector('[role="dialog"][data-state="open"]')) return
      const key = event.key.toLowerCase()
      if (key === 'a') onAdvance()
      else if (key === 's') onHold()
      else if (key === 'r') onReject()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onAdvance, onHold, onReject])

  const onOpenResume = React.useCallback(async () => {
    try {
      const { data } = await resume.refetch({ throwOnError: true })
      if (data?.url) window.open(data.url, '_blank', 'noopener,noreferrer')
      else toast({ variant: 'warning', title: 'No résumé on file for this candidate' })
    } catch {
      toast({ variant: 'danger', title: "Couldn't open the résumé" })
    }
  }, [resume])

  const saveNote = () => {
    const body = noteText.trim()
    if (!body) return
    createNote.mutate(body, {
      onSuccess: () => {
        toast({ title: 'Note saved to the record' })
        setNoteText('')
        setNoteOpen(false)
      },
    })
  }

  if (detail.isLoading && !candidate) {
    return (
      <AppShell breadcrumbs={crumbs} account={account}>
        <LoadingScreen label="Loading candidate" />
      </AppShell>
    )
  }
  if (detail.isError || !candidate) {
    return (
      <AppShell breadcrumbs={crumbs} account={account}>
        <ErrorState variant="route" title="Couldn't load this candidate" onRetry={() => detail.refetch()} />
      </AppShell>
    )
  }

  return (
    <AppShell breadcrumbs={crumbs} account={account}>
      <div className="mx-auto flex w-full max-w-[760px] flex-col gap-10 px-6 pb-12 pt-10">
        <DossierHeader
          candidate={candidate}
          result={result}
          name={name}
          onClose={() => router.back()}
        />
        {result ? (
          <DossierContent result={result} conflicts={conflicts} onOpenResume={onOpenResume} />
        ) : (
          <p className="hl-body text-hl-fg-secondary">
            This candidate hasn’t been analyzed yet. Run the analysis to see the verdict and evidence.
          </p>
        )}
      </div>

      <DecisionBar
        onAdvance={onAdvance}
        onHold={onHold}
        onReject={onReject}
        onToggleNote={() => setNoteOpen(true)}
        noteOpen={noteOpen}
        pending={updateStage.isPending}
      />

      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a note for the record</DialogTitle>
          </DialogHeader>
          <textarea
            autoFocus
            value={noteText}
            onChange={(event) => setNoteText(event.target.value)}
            placeholder="What should the record remember about this decision?"
            className="hl-body min-h-28 w-full resize-y rounded-hl-md border border-hl-border bg-hl-canvas p-3 text-hl-fg outline-none placeholder:text-hl-fg-tertiary focus-visible:border-hl-accent"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNoteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={saveNote}
              loading={createNote.isPending}
              disabled={!noteText.trim()}
            >
              Save note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}
