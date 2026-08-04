'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowUpRight } from 'lucide-react'
import { Drawer, DrawerContent, DrawerHeader, DrawerBody, DrawerTitle } from '../ui/drawer'
import { Button } from '../ui/button'
import { Kbd } from '../ui/kbd'
import { LoadingLines } from '../states/loading'
import { ErrorState } from '../states/error-state'
import { useCandidateObject, useCandidateShortcuts } from './use-candidate-object'
import { NoteDialog } from './note-dialog'
import { CandidateHeader } from './sections/header'
import { CandidateVerdict } from './sections/ai'
import { CandidateStrengths, CandidateRisks } from './sections/evidence'
import { CandidateDecisionBar } from './sections/decision-bar'

/**
 * CandidatePeek — the rack-focus peek. One shared model at condensed density:
 * identity + verdict + the top evidence + the decision. Full-screen on mobile,
 * 480px right drawer on tablet/desktop (via the Drawer primitive). "Full review"
 * (or `F`) promotes to the deep-linkable dossier. Renders the SAME section
 * components as the Full dossier — never a second Candidate UI.
 */
export function CandidatePeek({
  roleId,
  candidateId,
  open,
  onOpenChange,
}: {
  roleId: string
  candidateId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const c = useCandidateObject(roleId, candidateId, { onDecided: () => onOpenChange(false) })
  const [noteOpen, setNoteOpen] = React.useState(false)

  const goFull = React.useCallback(() => {
    onOpenChange(false)
    router.push(`/roles/${roleId}/candidates/${candidateId}`)
  }, [onOpenChange, roleId, candidateId, router])

  useCandidateShortcuts(
    open && c.model
      ? {
          advance: c.advance,
          hold: c.hold,
          reject: c.reject,
          openResume: c.openResume,
          full: goFull,
          close: () => onOpenChange(false),
        }
      : {},
  )

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent size="candidate" className="p-0">
        <DrawerHeader>
          <DrawerTitle className="sr-only">{c.model?.name ?? 'Candidate'}</DrawerTitle>
          {c.model ? (
            <div className="min-w-0 flex-1">
              <CandidateHeader model={c.model} dense />
            </div>
          ) : (
            <span className="hl-h1">Candidate</span>
          )}
          <Button variant="ghost" size="sm" onClick={goFull} className="shrink-0">
            <ArrowUpRight /> Full review <Kbd className="ml-1">F</Kbd>
          </Button>
        </DrawerHeader>

        <DrawerBody className="flex flex-col gap-6">
          {c.isLoading ? (
            <LoadingLines />
          ) : c.isError || !c.model ? (
            <ErrorState variant="inline" title="Couldn't load this candidate" onRetry={c.refetch} />
          ) : (
            <>
              {/* CandidateConfidence is deliberately NOT rendered here.
                  `CandidateVerdict` wraps AIAnswer, which already prints a
                  confidence pill from the same `model.confidence` — so the Peek
                  showed "High confidence" twice, in adjacent rows, once inside
                  the verdict card and again immediately under it. Same fact,
                  same value, stated twice. The standalone pill is kept for
                  surfaces that show confidence WITHOUT the verdict card above
                  it; here the verdict owns it. */}
              <CandidateVerdict model={c.model} onOpenResume={c.openResume} />
              <CandidateStrengths model={c.model} />
              <CandidateRisks model={c.model} />
            </>
          )}
        </DrawerBody>

        {c.model ? (
          <CandidateDecisionBar
            onAdvance={c.advance}
            onHold={c.hold}
            onReject={c.reject}
            onAddNote={() => setNoteOpen(true)}
            pending={c.pending}
          />
        ) : null}
      </DrawerContent>

      <NoteDialog roleId={roleId} candidateId={candidateId} open={noteOpen} onOpenChange={setNoteOpen} />
    </Drawer>
  )
}
