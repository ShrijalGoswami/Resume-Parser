'use client'

import * as React from 'react'
import { Upload, FileText, X } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
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

type Phase = 'idle' | 'uploading' | 'analyzing' | 'persisting' | 'indexing' | 'error'

/**
 * What the server is doing while we wait, in the order `batch_service` does it.
 *
 * NONE OF THESE IS A COMPLETION CLAIM. `/batch-analysis` is one POST and one
 * JSON response — no stream, no job id, no per-file events — so the client
 * cannot know which résumé is being read or how far along the batch is. These
 * name the work truthfully and advance at a readable pace; they never tick a
 * step off, and they never assert a percentage.
 */
export const ANALYSIS_STAGES = [
  'Reading résumés',
  'Extracting skills and experience',
  'Analyzing candidate profiles',
  'Comparing candidates against this role',
  'Building your candidate ranking',
] as const

/** How long each line holds. Slow enough to read, quick enough to feel alive. */
const STAGE_MS = 2800

/**
 * Copy for the tail phases, where the work is no longer a guess.
 *
 * Analysis is opaque, so it gets the rotating stages. Persisting and indexing
 * are NOT opaque — the client issued those calls itself and knows exactly which
 * one is outstanding — so each gets its own line and the rotation stops. Naming
 * them is honest in a way the rotation could not be.
 *
 * Returns undefined for every other phase, which is what keeps the rotation on
 * during `analyzing`.
 */
export function savingLabelFor(phase: Phase): string | undefined {
  if (phase === 'persisting') return 'Saving your candidates…'
  if (phase === 'indexing') return 'Finishing up…'
  return undefined
}

/** The fan of the résumé stack. Rotation is per-card so the float keeps it. */
const DOC_CARDS = [
  { rotate: '-9deg', x: '-30px', delay: '0s', z: 'z-10' },
  { rotate: '-3deg', x: '-10px', delay: '0.9s', z: 'z-20' },
  { rotate: '3deg', x: '10px', delay: '1.8s', z: 'z-20' },
  { rotate: '9deg', x: '30px', delay: '2.7s', z: 'z-10' },
] as const

/** One stylized résumé: paper, a hairline edge, and ruled lines. No artwork. */
function DocumentCard({
  rotate,
  x,
  delay,
  z,
}: {
  rotate: string
  x: string
  delay: string
  z: string
}) {
  return (
    <span
      className={`absolute ${z} block h-[74px] w-[56px] rounded-[3px] border border-hl-border bg-hl-elevated shadow-[var(--hl-shadow-sm)]`}
      style={{
        left: `calc(50% - 28px + ${x})`,
        // Consumed by `hl-doc-float`, so the card breathes without unfanning.
        ['--doc-rotate' as string]: rotate,
        animation: `hl-doc-float 7s ease-in-out ${delay} infinite`,
      }}
      aria-hidden
    >
      {/* Ruled lines read as a résumé at this size; a document glyph would
          read as a file-type badge instead. */}
      <span className="absolute inset-x-[8px] top-[10px] block h-[3px] rounded-full bg-hl-fg-tertiary opacity-40" />
      <span className="absolute inset-x-[8px] top-[19px] block h-[2px] w-[24px] rounded-full bg-hl-border-strong" />
      {[30, 38, 46, 54, 62].map((top, i) => (
        <span
          key={top}
          className="absolute left-[8px] block h-[2px] rounded-full bg-hl-border-strong"
          style={{ top: `${top}px`, right: i % 2 === 0 ? '8px' : '18px' }}
        />
      ))}
    </span>
  )
}

/**
 * The processing chamber — what fills the dropzone while the server works.
 *
 * WHY THIS EXISTS AND WHAT IT REFUSES TO DO. `/batch-analysis` is one opaque
 * POST: no stream, no job id, no per-file events. The wait it covers is real
 * (parse → extract → model → rank → persist) and can run tens of seconds, but
 * nothing about its position is knowable. So this occupies the wait rather
 * than measuring it — there is no percentage and no bar, because the previous
 * bar showed `xhr.upload` bytes under the word "Analyzing" and therefore read
 * "Analyzing… 100%" for exactly as long as the model was actually working.
 *
 * Three motions, all slow, all reusing the primitives in `globals.css`: paper
 * that breathes, a beam that reads top-to-bottom, and an accent glow under
 * 0.2 opacity. The reduced-motion rule that covers `.hl` neutralizes all
 * three, so there is no second code path to maintain or forget.
 *
 * The stage interval is owned by an effect, so completion, error and cancel
 * all stop it by unmounting this — no timer outlives the request.
 *
 * It also stays mounted through persisting and indexing. Unmounting it there
 * dropped the recruiter back onto the dashed dropzone for the last second of a
 * flow that had been continuous until then — the paper vanished, an empty
 * upload box flashed, and only then did the dialog close. The animation is the
 * same; only the line under it changes, because by that point the client knows
 * exactly which call is outstanding and can say so.
 */
export function AnalyzingState({
  fileCount,
  /** Set once the work has a name — stops the rotation and states the phase. */
  savingLabel,
}: {
  fileCount: number
  savingLabel?: string
}) {
  const [stage, setStage] = React.useState(0)

  React.useEffect(() => {
    // No rotation once the phase is known: re-running the guesses over a call
    // we can name would be inventing uncertainty we do not have.
    if (savingLabel) return
    const id = window.setInterval(() => {
      // Advances and HOLDS on the last line. Looping back to "Reading résumés"
      // would tell the reader the work had gone backwards.
      setStage((current) => Math.min(current + 1, ANALYSIS_STAGES.length - 1))
    }, STAGE_MS)
    return () => window.clearInterval(id)
  }, [savingLabel])

  return (
    <div
      className="flex flex-col items-center gap-3 rounded-hl-lg border border-hl-border bg-hl-subtle px-6 py-5"
      role="status"
      aria-live="polite"
      data-testid="processing-chamber"
    >
      {/* Fixed height: the stack and beam move inside a box that never
          resizes, so nothing below it shifts while the modal waits. */}
      <div className="relative h-[112px] w-full overflow-hidden">
        {/* Ambient intelligence. Behind the paper, never over it. */}
        <span
          className="absolute left-1/2 top-1/2 block size-[150px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--hl-accent-solid)] blur-2xl"
          style={{ animation: 'hl-doc-glow 4.5s ease-in-out infinite' }}
          aria-hidden
        />
        <div className="absolute inset-0 flex items-center justify-center">
          {DOC_CARDS.map((card) => (
            <DocumentCard key={card.rotate} {...card} />
          ))}
        </div>
        {/* The beam. One hairline, gradient-faded at both ends so it reads as
            light passing over paper rather than a rule drawn across it. */}
        <span
          className="absolute inset-x-8 top-0 z-30 block h-px"
          style={{
            background:
              'linear-gradient(90deg, transparent, var(--hl-accent-secondary), transparent)',
            animation: 'hl-doc-scan 2.6s ease-in-out infinite',
          }}
          aria-hidden
        />
      </div>

      <div className="flex min-h-[2.75rem] flex-col items-center gap-1 text-center">
        <p className="hl-body-medium">
          {fileCount} résumé{fileCount === 1 ? '' : 's'} processing
        </p>
        <p className="hl-small text-hl-fg-secondary">
          {savingLabel ?? `${ANALYSIS_STAGES[stage]}…`}
        </p>
      </div>
    </div>
  )
}

/** 10MB. Stated once so the check and the sentence explaining it cannot drift. */
const MAX_BYTES = 10 * 1024 * 1024
const ACCEPTED = /\.(pdf|docx?)$/i

interface RejectedFile {
  name: string
  reason: 'type' | 'size'
  /** Only meaningful for a size rejection. */
  sizeMb: string
}

/** "photo.png (not a PDF or Word file)" · "scan.pdf (14.2MB, limit 10MB)" */
export function describeRejection(file: RejectedFile): string {
  return file.reason === 'type'
    ? `${file.name} (not a PDF or Word file)`
    : `${file.name} (${file.sizeMb}MB, limit 10MB)`
}

/**
 * Split a selection into what we will analyse and what we will not.
 *
 * THE REJECTED HALF IS THE POINT. This filtering already existed, inline and
 * silent: anything that was not a PDF or Word file, or was over 10MB, was
 * dropped with no message at all. A recruiter selecting twelve files from an
 * email export saw eight appear, with no error and no count — and the most
 * likely reading of that is that the app is broken, the second most likely that
 * they miscounted. Four candidates never entered the pipeline.
 *
 * The constraint is printed under the picker, but a constraint stated once and
 * then enforced invisibly is not communication. Extracted and exported so the
 * behaviour is testable without a DOM.
 */
export function partitionFiles(list: File[]): { accepted: File[]; rejected: RejectedFile[] } {
  const accepted: File[] = []
  const rejected: RejectedFile[] = []
  for (const file of list) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1)
    if (!ACCEPTED.test(file.name)) rejected.push({ name: file.name, reason: 'type', sizeMb })
    else if (file.size > MAX_BYTES) rejected.push({ name: file.name, reason: 'size', sizeMb })
    else accepted.push(file)
  }
  return { accepted, rejected }
}

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
  /** Files the picker took and we would not — named, never silently dropped. */
  const [rejected, setRejected] = React.useState<RejectedFile[]>([])
  const [dragging, setDragging] = React.useState(false)

  const hasJobDescription = Boolean(campaign.job_description?.trim())
  const busy =
    phase === 'uploading' ||
    phase === 'analyzing' ||
    phase === 'persisting' ||
    phase === 'indexing'

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
    setRejected([])
  }

  // Clear on OPEN, not on close. A successful run closes the dialog while the
  // chamber is still showing, so the teardown has to happen somewhere that is
  // not mid-exit-animation; the next open is the only moment that is both
  // guaranteed to happen and invisible to the user.
  //
  // Adjusted during render rather than in an effect — React's documented
  // "adjusting state when a prop changes" pattern. An effect here would set
  // state synchronously on every open and cascade a second render, which is
  // what `react-hooks/set-state-in-effect` exists to catch.
  const [wasOpen, setWasOpen] = React.useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setFiles([])
      setPhase('idle')
      setProgress(0)
      setError(null)
      setRejected([])
    }
  }

  const handleOpenChange = (next: boolean) => {
    if (!next && !busy) reset()
    if (!busy) onOpenChange(next)
  }

  const addFiles = (list: FileList | null) => {
    if (!list) return
    const { accepted, rejected: skipped } = partitionFiles(Array.from(list))
    setFiles((prev) => [...prev, ...accepted])
    // Replaces the previous notice rather than accumulating: this describes the
    // selection just made, and a list growing across four attempts is noise.
    setRejected(skipped)
  }

  /**
   * DRAG AND DROP, because the target already looked like it accepted one.
   *
   * The drop zone is a full-width dashed rectangle with an upload glyph — the
   * universal drag-and-drop affordance — and nothing in the component handled a
   * drop. Dragging résumés onto it did nothing, and worse: with no handler the
   * browser takes the default action and NAVIGATES AWAY to open the PDF,
   * destroying the dialog and any files already staged. Bulk résumé intake is
   * drag-and-drop-shaped work; this is the product's core loop.
   *
   * `dragEnter`/`dragOver` must both preventDefault or the drop never fires.
   */
  const onDrop = (event: React.DragEvent) => {
    event.preventDefault()
    setDragging(false)
    if (busy || exhausted) return
    addFiles(event.dataTransfer.files)
  }

  const run = async () => {
    if (files.length === 0 || !hasJobDescription || exhausted) return
    setError(null)
    // Send only what the allowance covers. The alternative — sending all eight
    // and letting the server refuse the batch — analyses nothing at all, so a
    // customer with 2 credits left ends up with 0 candidates instead of 2.
    const sending = files.slice(0, analyzable)
    try {
      // TWO DIFFERENT WAITS, AND ONLY THE FIRST ONE IS KNOWABLE.
      // Sending the files is measurable in bytes, so that half keeps its real
      // percentage. Everything after — parse, extract, model, rank — happens
      // inside one opaque request, so it becomes an indeterminate wait rather
      // than a number the client would have to invent.
      setPhase('uploading')
      setProgress(0)
      const batch = await analyzeBatchWithProgress(
        campaign.job_description,
        sending,
        setProgress,
        undefined,
        () => setPhase('analyzing'),
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
          ? `${files.length - sending.length} not analyzed — you’ve used your résumé allowance.`
          : undefined,
      })
      // CLOSE WITH THE CHAMBER STILL ON SCREEN.
      //
      // `reset()` used to run here, and it put phase back to `idle` while the
      // dialog was still playing its exit animation — so the last thing the
      // recruiter saw was the chamber vanishing and an empty dashed dropzone
      // fading out in its place. The state is cleared on the next open instead
      // (see the effect above), which leaves nothing stale and nothing to time.
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
          <div
            className="flex flex-col gap-3"
            onDragEnter={(event) => {
              event.preventDefault()
              if (!busy) setDragging(true)
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => {
              // Only when the pointer leaves the zone itself, not when it
              // crosses one of the children inside it.
              if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false)
            }}
            onDrop={onDrop}
          >
            {/* The dropzone becomes the chamber once the files are the
                server's problem, and STAYS the chamber until the dialog
                closes. Same slot, so the modal does not reshuffle — the box a
                recruiter just dropped four résumés into is the box that shows
                them being read, saved and indexed, without the dashed outline
                flashing back between the last two. */}
            {phase === 'analyzing' || phase === 'persisting' || phase === 'indexing' ? (
              <AnalyzingState fileCount={analyzable} savingLabel={savingLabelFor(phase)} />
            ) : (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={busy}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-hl-lg border border-dashed bg-hl-subtle px-6 py-8 text-center outline-none transition-colors hover:border-hl-accent disabled:opacity-60',
                  dragging ? 'border-hl-accent bg-hl-accent-subtle' : 'border-hl-border-strong',
                )}
              >
                <Upload className="size-6 text-hl-fg-tertiary" aria-hidden />
                <span className="hl-body-medium">
                  {dragging ? 'Drop to add' : 'Drop résumés here, or choose files'}
                </span>
                <span className="hl-caption text-hl-fg-tertiary">PDF or DOCX · up to 10MB each</span>
              </button>
            )}

            {/* WHAT WE WOULD NOT TAKE, AND WHY. Named individually: "2 files
                skipped" still leaves the recruiter to work out which two. */}
            {rejected.length > 0 ? (
              <div className="hl-small rounded-hl-md bg-hl-warning-bg p-3 text-hl-warning" role="status">
                <p className="font-medium">
                  {rejected.length === 1
                    ? "1 file wasn’t added"
                    : `${rejected.length} files weren’t added`}
                </p>
                <ul className="mt-1 flex flex-col gap-0.5">
                  {rejected.map((file) => (
                    <li key={`${file.name}-${file.reason}`}>{describeRejection(file)}</li>
                  ))}
                </ul>
              </div>
            ) : null}
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

            {/* Uploading is the one measurable wait, so it keeps a real bar and
                a real number — and now says what the number means. */}
            {phase === 'uploading' ? (
              <div className="flex flex-col gap-2" role="status" aria-live="polite">
                <div className="hl-small flex items-center justify-between text-hl-fg-secondary">
                  <span>Uploading résumés</span>
                  <span className="hl-mono">{progress}%</span>
                </div>
                <span
                  className="block h-1.5 w-full overflow-hidden rounded-full bg-hl-muted"
                  role="progressbar"
                  aria-valuenow={progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Uploading résumés"
                >
                  <span
                    className="block h-full rounded-full bg-[var(--hl-accent-secondary)] transition-[width] duration-[var(--hl-dur-fast)]"
                    style={{ width: `${progress}%` }}
                  />
                </span>
              </div>
            ) : null}
            {/* Nothing else goes here. Analyzing, persisting and indexing are
                all carried by the chamber above, which names the phase itself;
                a second shimmer under it would state the same thing twice. */}
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
