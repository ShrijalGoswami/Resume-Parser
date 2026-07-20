'use client'

import * as React from 'react'
import { GitCompare, Trash2, ChevronDown, X } from 'lucide-react'
import { Button } from '../ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '../ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '../ui/dialog'
import { ALL_STAGES, STAGE_LABELS } from './stages'
import type { PipelineStage } from '@/types/campaign'

/**
 * Multiselect toolbar (UX Spec §7.2). Appears on selection. Compare requires
 * 2–5. Reject is a soft move to the rejected stage; Remove is destructive and
 * confirmed.
 */
export interface MultiselectToolbarProps {
  count: number
  canCompare: boolean
  onCompare: () => void
  onMove: (stage: PipelineStage) => void
  onReject: () => void
  onRemove: () => void
  onClear: () => void
}

export function MultiselectToolbar({
  count,
  canCompare,
  onCompare,
  onMove,
  onReject,
  onRemove,
  onClear,
}: MultiselectToolbarProps) {
  const [confirmOpen, setConfirmOpen] = React.useState(false)

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-hl-md border border-hl-border bg-hl-subtle px-3 py-2 shadow-[var(--hl-shadow-xs)]">
      <span className="hl-body-medium">{count} selected</span>
      <span className="mx-1 h-4 w-px bg-hl-border" aria-hidden />

      <Button size="sm" variant="secondary" onClick={onCompare} disabled={!canCompare}>
        <GitCompare /> Compare
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="secondary">
            Move to <ChevronDown className="size-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {ALL_STAGES.map((stage) => (
            <DropdownMenuItem key={stage} onSelect={() => onMove(stage)}>
              {STAGE_LABELS[stage]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button size="sm" variant="ghost" onClick={onReject}>
        Reject
      </Button>

      <Button size="sm" variant="ghost" onClick={() => setConfirmOpen(true)}>
        <Trash2 /> Remove
      </Button>

      <span className="mx-1 h-4 w-px bg-hl-border" aria-hidden />
      <Button size="sm" variant="ghost" onClick={onClear} aria-label="Clear selection">
        <X /> Clear
      </Button>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Remove {count} candidates?</DialogTitle>
            <DialogDescription>
              This permanently deletes them from this role. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DialogClose>
            <Button
              variant="danger"
              onClick={() => {
                setConfirmOpen(false)
                onRemove()
              }}
            >
              Remove candidates
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
