'use client'

import * as React from 'react'
import { PencilLine } from 'lucide-react'
import { Button } from '../../ui/button'
import { Kbd } from '../../ui/kbd'

/**
 * CandidateDecisionBar — the decision as the quiet conclusion of the read.
 * Advance / Hold / Reject map to real stage moves (A / S / R); "Add note" records
 * to the candidate's notes. Sticks to the foot of the surface it's in.
 */
export function CandidateDecisionBar({
  onAdvance,
  onHold,
  onReject,
  onAddNote,
  pending,
}: {
  onAdvance: () => void
  onHold: () => void
  onReject: () => void
  onAddNote: () => void
  pending?: boolean
}) {
  return (
    <div className="sticky bottom-0 z-10 border-t border-hl-border-subtle bg-hl-canvas/95 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[760px] flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary" onClick={onAdvance} disabled={pending}>
            Advance <Kbd className="ml-1">A</Kbd>
          </Button>
          <Button variant="secondary" onClick={onHold} disabled={pending}>
            Hold <Kbd className="ml-1">S</Kbd>
          </Button>
          <Button variant="ghost" onClick={onReject} disabled={pending}>
            Reject <Kbd className="ml-1">R</Kbd>
          </Button>
        </div>
        <Button variant="ghost" onClick={onAddNote}>
          <PencilLine /> Add note
        </Button>
      </div>
    </div>
  )
}
