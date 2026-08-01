'use client'

import * as React from 'react'
import { Upload, FileText, X } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { analyzeBatchWithProgress } from '@/services/api'
import { persistBatch, uploadResume } from '@/services/campaigns-api'
import { reindexCampaign } from '@/services/search-api'
import { roleKeys } from '../lib/api/workspace'
import { orgContextKey } from '../lib/api/org-context'
import { hashFiles, buildResumeUploadPlan, runPooled } from './resume-upload'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '../ui/dialog'
import { Button } from '../ui/button'
import { toast } from '../ui/use-toast'
import { QuotaLock, QuotaMeter, useQuota, usePlanDenialHandler } from '../entitlements'
import type { Campaign } from '@/types/campaign'

type Phase = 'idle' | 'analyzing' | 'persisting' | 'indexing' | 'error'

/**
 * Add candidates (UX Spec §7.1). The real 3-step flow: batch-analyze the
 * résumés against the role's JD, persist under the campaign, then reindex for
 * search. No mock — this mutates real data.
 */
export function AddCandidatesDialog({
  roleId,
  campaign,
  open,
  onOpenChange,
}: {
  roleId: string
  campaign: Campaign
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [files, setFiles] = React.useState<File[]>([])
  const [phase, setPhase] = React.useState<Phase>('idle')
  const [progress, setProgress] = React.useState(0)
  const [error, setError] = React.useState<string | null>(null)

  const hasJobDescription = Boolean(campaign.job_description?.trim())
  const busy = phase === 'analyzing' || phase === 'persisting' || phase === 'indexing'

  // CHECK THE QUOTA BEFORE THE EXPENSIVE THING.
  //
  // The backend already refuses at `/batch-analysis` before any AI call, so the
  // credits are never spent — but "before the spinner" and "after the spinner"
  // are completely different experiences. Accepting eight files, running an
  // upload bar to 100%, and only then saying "you have 2 credits" wastes the
  // customer's time and reads as a bug rather than a limit. The client should
  // not be worse than the server it fronts.
  const quota = useQuota('resumes')
  const handleDenial = usePlanDenialHandler()
  const exhausted = quota.state === 'ready' && quota.isExhausted
  const remaining = quota.state === 'ready' && !quota.unlimited ? quota.remaining : null
  // Null means "no ceiling worth mentioning" — unlimited, founding, or a state
  // we do not know yet. Never truncate a batch on a figure we are unsure of.
  const overflow = remaining !== null && files.length > remaining
  const analyzable = overflow ? (remaining as number) : files.length

  const reset = () => {
    setFiles([])
    setPhase('idle')
    setProgress(0)
    setError(null)
  }

  const handleOpenChange = (next: boolean) => {
    if (!next && !busy) reset()
    if (!busy) onOpenChange(next)
  }

  const addFiles = (list: FileList | null) => {
    if (!list) return
    const accepted = Array.from(list).filter(
      (file) => /\.(pdf|docx?)$/i.test(file.name) && file.size <= 10 * 1024 * 1024,
    )
    setFiles((prev) => [...prev, ...accepted])
  }

  const run = async () => {
    if (files.length === 0 || !hasJobDescription || exhausted) return
    setError(null)
    // Send only what the allowance covers. The alternative — sending all eight
    // and letting the server refuse the batch — analyses nothing at all, so a
    // customer with 2 credits left ends up with 0 candidates instead of 2.
    const sending = files.slice(0, analyzable)
    try {
      setPhase('analyzing')
      setProgress(0)
      const batch = await analyzeBatchWithProgress(
        campaign.job_description,
        sending,
        setProgress,
      )
      setPhase('persisting')
      const persisted = await persistBatch(roleId, batch)
      // A3: store the original résumé binaries (best-effort, mapped by content
      // hash). A failed upload just leaves that candidate's download gate closed —
      // it must never fail the ingestion, so this is wrapped and non-blocking.
      try {
        const fileByHash = await hashFiles(sending)
        const plan = buildResumeUploadPlan(batch.candidates, persisted, fileByHash)
        await runPooled(plan, 4, (p) => uploadResume(roleId, p.candidateId, p.file).then(() => undefined))
      } catch {
        /* best-effort — résumés can be re-uploaded later */
      }
      setPhase('indexing')
      await reindexCampaign(roleId).catch(() => undefined)
      await queryClient.invalidateQueries({ queryKey: roleKeys.candidates(roleId) })
      toast({
        variant: 'success',
        title: `Added ${sending.length} candidate${sending.length === 1 ? '' : 's'}`,
        // Truncation is never silent: a customer who selected eight files and
        // got two must be told which two, and why.
        description: overflow
          ? `${files.length - sending.length} not analyzed — you've used your résumé allowance.`
          : undefined,
      })
      reset()
      onOpenChange(false)
    } catch (caught) {
      setPhase('error')
      // A 402 that slipped through (a teammate consumed the last credit while
      // this dialog was open) opens the upgrade surface rather than printing
      // the server's sentence in red. Everything else stays an error, because
      // it is one.
      if (handleDenial(caught)) {
        setError(null)
        // Our cached figure was stale — that is how the 402 got through. Pull a
        // fresh context so the dialog now shows the wall rather than inviting
        // the same doomed attempt again.
        void queryClient.invalidateQueries({ queryKey: orgContextKey })
        return
      }
      setError(caught instanceof Error ? caught.message : 'Something went wrong')
    }
  }

  const phaseLabel =
    phase === 'analyzing'
      ? `Analyzing… ${progress}%`
      : phase === 'persisting'
        ? 'Saving…'
        : phase === 'indexing'
          ? 'Indexing…'
          : ''

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Add candidates</DialogTitle>
          <DialogDescription>
            Upload résumés (PDF or DOCX, up to 10MB). HireLens ranks them against this role.
          </DialogDescription>
        </DialogHeader>

        {!hasJobDescription ? (
          <div className="hl-small rounded-hl-md bg-hl-warning-bg p-3 text-hl-warning">
            Add a job description to this role before uploading — candidates are ranked against it.
          </div>
        ) : exhausted && quota.state === 'ready' ? (
          /* THE WALL, BEFORE THE FILE PICKER.
             Nothing to choose, nothing to upload, no spinner that ends in a
             refusal — the shared quota surface, stating what ran out and what
             an upgrade gives back. Selecting files first and failing after
             would be the same outcome delivered in the least useful order. */
          <QuotaLock
            metric="resumes"
            used={quota.used}
            limit={quota.limit}
            window={quota.window}
            requiredPlan={quota.requiredPlan}
          />
        ) : (
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="flex flex-col items-center gap-2 rounded-hl-lg border border-dashed border-hl-border-strong bg-hl-subtle px-6 py-8 text-center outline-none transition-colors hover:border-hl-accent disabled:opacity-60"
            >
              <Upload className="size-6 text-hl-fg-tertiary" aria-hidden />
              <span className="hl-body-medium">Choose résumés</span>
              <span className="hl-caption text-hl-fg-tertiary">PDF or DOCX · up to 10MB each</span>
            </button>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              multiple
              hidden
              onChange={(event) => addFiles(event.target.files)}
            />

            {files.length > 0 ? (
              <ul className="flex max-h-40 flex-col gap-1 overflow-y-auto">
                {files.map((file, index) => (
                  <li
                    key={`${file.name}-${index}`}
                    className="hl-small flex items-center gap-2 rounded-hl-sm bg-hl-subtle px-2 py-1"
                  >
                    <FileText className="size-3.5 shrink-0 text-hl-fg-tertiary" aria-hidden />
                    <span className="flex-1 truncate">{file.name}</span>
                    {!busy ? (
                      <button
                        type="button"
                        onClick={() => setFiles((prev) => prev.filter((_, i) => i !== index))}
                        aria-label={`Remove ${file.name}`}
                        className="text-hl-fg-tertiary outline-none hover:text-hl-fg"
                      >
                        <X className="size-3.5" />
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}

            {/* Running low, but not out: the same meter the Inbox shows, so
                the figure the recruiter already recognises is the one that
                appears at the moment of spending. */}
            <QuotaMeter metric="resumes" />

            {/* Over the allowance. Offered as a choice with the number stated,
                never a silent truncation — the customer must know before they
                press the button that six of their eight files are not going to
                be analysed. */}
            {overflow && !busy ? (
              <div className="hl-small rounded-hl-md bg-hl-warning-bg p-3 text-hl-warning">
                You selected {files.length} résumés and have {remaining} left. Analyzing the first{' '}
                {analyzable} — remove some to choose which.
              </div>
            ) : null}

            {busy ? (
              <div className="hl-small flex items-center gap-2 text-hl-fg-secondary">
                <span className="hl-ai-shimmer inline-block h-1.5 flex-1 rounded-full bg-hl-muted" />
                {phaseLabel}
              </div>
            ) : null}
            {error ? <p className="hl-body text-hl-danger">{error}</p> : null}
          </div>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" disabled={busy}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            variant="primary"
            onClick={run}
            disabled={!hasJobDescription || files.length === 0 || busy || exhausted}
            loading={busy}
          >
            {files.length > 0
              ? `Analyze ${analyzable} résumé${analyzable === 1 ? '' : 's'}`
              : 'Analyze'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
