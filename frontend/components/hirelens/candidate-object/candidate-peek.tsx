'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowUpRight } from 'lucide-react'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerTitle,
  DrawerDescription,
} from '../ui/drawer'
import { Button } from '../ui/button'
import { Kbd } from '../ui/kbd'
import { LoadingLines } from '../states/loading'
import { ErrorState } from '../states/error-state'
import { useCandidateObject, useCandidateShortcuts } from './use-candidate-object'
import { NoteDialog } from './note-dialog'
import { CandidateHeader } from './sections/header'
import { CandidateVerdict } from './sections/ai'
import { CandidateStrengths, CandidateRisks, CandidateSkills } from './sections/evidence'
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
    // DO NOT close the peek before navigating.
    //
    // This used to call `onOpenChange(false)` first, and that silently ate the
    // navigation. A host that opened the peek by PUSHING a history entry —
    // which `role-workspace.openCandidate` does whenever the drawer is opened
    // from a closed state, i.e. the normal "click a candidate" path — closes it
    // again with `window.history.back()`. History traversal is asynchronous, so
    // the sequence was: queue a back(), start the push, then let the queued
    // back() unwind it. The user landed right back on the role page with no
    // error anywhere.
    //
    // It only appeared to work when the peek had been opened by navigating
    // straight to `?candidate=…`, because then no history entry was pushed and
    // the close took a `replaceState` branch instead. That is also why source
    // and unit tests could not see it — the bug lives in the interaction
    // between two components' history handling, not in either one's code.
    //
    // Navigating unmounts the host page and the drawer with it, so there is
    // nothing left to close.
    //
    // The drawer's own `?candidate=` entry is REPLACED rather than left behind,
    // so Back from the dossier lands on a clean role page. Leaving it meant
    // Back returned to a URL that says a candidate drawer is open while none
    // is — Next serves the role route from its client cache and does not
    // re-read the param. `replaceState` is synchronous and starts no history
    // traversal, so unlike the `back()` above it cannot cancel the push. Only
    // the one param is dropped; `lens` and anything else survive.
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      if (url.searchParams.has('candidate')) {
        url.searchParams.delete('candidate')
        window.history.replaceState(null, '', url.pathname + url.search)
      }
    }
    router.push(`/jobs/${roleId}/candidates/${candidateId}`)
  }, [roleId, candidateId, router])

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
          {/* sr-only, like the title above it: the visual header is the
              CandidateHeader component; this pair exists for assistive tech
              and Radix's aria wiring. */}
          <DrawerDescription className="sr-only">
            Candidate summary with analysis verdict and decision actions.
          </DrawerDescription>
          {c.model ? (
            <div className="min-w-0 flex-1">
              <CandidateHeader model={c.model} dense />
            </div>
          ) : (
            <span className="hl-h1">Candidate</span>
          )}
          {/* The promotion out of quick review, and it must LOOK like one.
              This was `variant="ghost"` — the quietest control in the system —
              sitting beside the candidate's name, so the peek read as the whole
              of the review rather than the top of it. The complete evaluation
              lives on a page, and the way there has to be visible without
              knowing the `F` shortcut exists. */}
          <Button
            variant="secondary"
            size="sm"
            onClick={goFull}
            className="shrink-0"
            title="Open the complete evaluation — fit breakdown, core requirements, résumé evidence"
          >
            <ArrowUpRight /> Full review <Kbd className="ml-1">F</Kbd>
          </Button>
        </DrawerHeader>

        <DrawerBody className="flex flex-col gap-6">
          {c.isLoading ? (
            <LoadingLines />
          ) : c.isError || !c.model ? (
            <ErrorState variant="inline" title="Couldn’t load this candidate" onRetry={c.refetch} />
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
              {/* Matched vs missing skills — the checkable half of the read
                  (from the analysis's structured output), added to the Peek as
                  a v1.x composition change: an existing section, reused. The
                  strengths above assert; these chips are what a reader can
                  verify against the résumé in one glance. */}
              <CandidateSkills model={c.model} />
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
