'use client'

import * as React from 'react'
import { useCampaign, useUpdateStage } from '../lib/api/workspace'
import { useCandidateDetail, useResumeUrl } from '../lib/api/candidate'
import { toast } from '../ui/use-toast'
import { buildCandidateModel, type CandidateModel } from './model'
import type { PipelineStage } from '@/types/campaign'

/**
 * The Candidate Object's shared controller — data + decision actions in ONE place
 * so every surface (Peek, Full, and later Inbox/Roles/Talent/Ledger) reuses the
 * same business logic. Decision verbs map to real pipeline stages (Advance →
 * interview, Hold → screening, Reject → rejected), optimistic with Undo. The
 * presentational sections stay pure; this hook is the only smart part.
 */
export interface CandidateObjectController {
  model: CandidateModel | null
  roleTitle: string | undefined
  isLoading: boolean
  isError: boolean
  refetch: () => void
  pending: boolean
  advance: () => void
  hold: () => void
  reject: () => void
  openResume: () => void
}

export function useCandidateObject(
  roleId: string,
  candidateId: string,
  opts?: { onDecided?: () => void },
): CandidateObjectController {
  const campaign = useCampaign(roleId)
  const detail = useCandidateDetail(roleId, candidateId)
  const updateStage = useUpdateStage(roleId)
  const resume = useResumeUrl(roleId, candidateId, false)

  const candidate = detail.data
  const model = React.useMemo(() => buildCandidateModel(roleId, candidate), [roleId, candidate])
  const onDecided = opts?.onDecided

  const decide = React.useCallback(
    (stage: PipelineStage, verb: string, done: boolean) => {
      if (!candidate) return
      const prev = candidate.stage
      updateStage.mutate({ candidateId, stage })
      toast({
        title: `${verb} ${candidate.full_name || 'candidate'}`,
        action: done
          ? { label: 'Undo', onClick: () => updateStage.mutate({ candidateId, stage: prev }) }
          : undefined,
      })
      if (done) onDecided?.()
    },
    [candidate, candidateId, updateStage, onDecided],
  )

  const advance = React.useCallback(() => decide('interview', 'Advanced', true), [decide])
  const hold = React.useCallback(() => decide('screening', 'Holding', false), [decide])
  const reject = React.useCallback(() => decide('rejected', 'Rejected', true), [decide])

  const openResume = React.useCallback(async () => {
    if (!model?.resumePath) {
      toast({ variant: 'warning', title: 'No résumé on file for this candidate' })
      return
    }
    try {
      const { data } = await resume.refetch({ throwOnError: true })
      if (data?.url) window.open(data.url, '_blank', 'noopener,noreferrer')
      else toast({ variant: 'warning', title: 'No résumé on file for this candidate' })
    } catch {
      toast({ variant: 'danger', title: "Couldn't open the résumé" })
    }
  }, [model, resume])

  return {
    model,
    roleTitle: campaign.data?.title,
    isLoading: detail.isLoading && !candidate,
    isError: detail.isError || (!detail.isLoading && !candidate),
    refetch: () => detail.refetch(),
    pending: updateStage.isPending,
    advance,
    hold,
    reject,
    openResume,
  }
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

export interface CandidateShortcutHandlers {
  advance?: () => void
  hold?: () => void
  reject?: () => void
  openResume?: () => void
  full?: () => void
  close?: () => void
}

/**
 * The Candidate Object keyboard contract (immutable): A advance · S hold · R
 * reject · E résumé · F full dossier · Esc close. Dormant while typing in a field
 * or when a modal dialog is open, so it never hijacks text input.
 */
export function useCandidateShortcuts(handlers: CandidateShortcutHandlers): void {
  const ref = React.useRef(handlers)
  React.useEffect(() => {
    ref.current = handlers
  })
  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (isEditable(event.target)) return
      const noteDialogOpen = document.querySelector('[role="dialog"][data-state="open"] textarea')
      if (noteDialogOpen) return
      const h = ref.current
      switch (event.key.toLowerCase()) {
        case 'a':
          h.advance?.()
          break
        case 's':
          h.hold?.()
          break
        case 'r':
          h.reject?.()
          break
        case 'e':
          h.openResume?.()
          break
        case 'f':
          h.full?.()
          break
        case 'escape':
          h.close?.()
          break
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
