'use client'

import * as React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog'
import { Button } from '../ui/button'
import { useCreateNote } from '../lib/api/candidate'
import { toast } from '../ui/use-toast'

/** Quick add-a-note dialog — shared by the decision bar at both densities. Uses
 * the same `useCreateNote` hook as the Notes section (one source of truth). */
export function NoteDialog({
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
  const create = useCreateNote(roleId, candidateId)
  const [text, setText] = React.useState('')

  const save = () => {
    const body = text.trim()
    if (!body) return
    create.mutate(body, {
      onSuccess: () => {
        toast({ title: 'Note saved to the record' })
        setText('')
        onOpenChange(false)
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a note for the record</DialogTitle>
        </DialogHeader>
        <textarea
          autoFocus
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="What should the record remember about this decision?"
          className="hl-body min-h-28 w-full resize-y rounded-hl-md border border-hl-border bg-hl-canvas p-3 text-hl-fg outline-none placeholder:text-hl-fg-tertiary focus-visible:border-hl-accent"
        />
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save} loading={create.isPending} disabled={!text.trim()}>
            Save note
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
