'use client'

import { PencilLine } from 'lucide-react'
import { Button } from '../ui/button'
import { Kbd } from '../ui/kbd'

/**
 * Decision bar — the conclusion of the review, at the foot of the document like
 * signing a brief. Advance / Hold / Reject map to real stage moves; "Add note"
 * records to the candidate's notes. Keyboard: A / S / R.
 */
export function DecisionBar({
  onAdvance,
  onHold,
  onReject,
  onToggleNote,
  noteOpen,
  pending,
}: {
  onAdvance: () => void
  onHold: () => void
  onReject: () => void
  onToggleNote: () => void
  noteOpen: boolean
  pending: boolean
}) {
  return (
    <div className="sticky bottom-0 z-10 border-t border-hl-border-subtle bg-hl-canvas/95 px-6 py-3 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[760px] flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary" onClick={onAdvance} disabled={pending}>
            Advance to onsite <Kbd className="ml-1">A</Kbd>
          </Button>
          <Button variant="secondary" onClick={onHold} disabled={pending}>
            Hold — need more <Kbd className="ml-1">S</Kbd>
          </Button>
          <Button variant="ghost" onClick={onReject} disabled={pending}>
            Reject <Kbd className="ml-1">R</Kbd>
          </Button>
        </div>
        <Button variant="ghost" onClick={onToggleNote} aria-pressed={noteOpen}>
          <PencilLine /> Add note
        </Button>
      </div>
    </div>
  )
}
