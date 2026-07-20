'use client'

import * as React from 'react'
import { Upload, FileText, X } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { analyzeBatchWithProgress } from '@/services/api'
import { persistBatch } from '@/services/campaigns-api'
import { reindexCampaign } from '@/services/search-api'
import { roleKeys } from '../lib/api/workspace'
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
    if (files.length === 0 || !hasJobDescription) return
    setError(null)
    try {
      setPhase('analyzing')
      setProgress(0)
      const batch = await analyzeBatchWithProgress(
        campaign.job_description,
        files,
        setProgress,
      )
      setPhase('persisting')
      await persistBatch(roleId, batch)
      setPhase('indexing')
      await reindexCampaign(roleId).catch(() => undefined)
      await queryClient.invalidateQueries({ queryKey: roleKeys.candidates(roleId) })
      toast({
        variant: 'success',
        title: `Added ${files.length} candidate${files.length === 1 ? '' : 's'}`,
      })
      reset()
      onOpenChange(false)
    } catch (caught) {
      setPhase('error')
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

            {busy ? (
              <div className="hl-small flex items-center gap-2 text-hl-fg-secondary">
                <span className="hl-ai-shimmer inline-block h-1.5 flex-1 rounded-full bg-hl-muted" />
                {phaseLabel}
              </div>
            ) : null}
            {error ? <p className="hl-small text-hl-danger">{error}</p> : null}
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
            disabled={!hasJobDescription || files.length === 0 || busy}
            loading={busy}
          >
            {files.length > 0 ? `Analyze ${files.length} résumé${files.length === 1 ? '' : 's'}` : 'Analyze'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
