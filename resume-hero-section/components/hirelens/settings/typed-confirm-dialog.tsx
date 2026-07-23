'use client'

import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Field } from './settings-ui'

/**
 * Typed-confirmation for destructive actions (UX Spec §10 · Design Bible §6.8).
 * The user must type the exact confirm word; the Danger button stays disabled
 * until it matches. The action is applied by the parent.
 */
export function TypedConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmWord,
  confirmLabel = 'Delete',
  busy,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: React.ReactNode
  confirmWord: string
  confirmLabel?: string
  busy?: boolean
  onConfirm: () => void
}) {
  const [text, setText] = React.useState('')

  const handleOpenChange = (next: boolean) => {
    if (!next) setText('')
    onOpenChange(next)
  }

  const matches = text.trim() === confirmWord

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Field
          label={`Type “${confirmWord}” to confirm`}
          htmlFor="typed-confirm-input"
        >
          <Input
            id="typed-confirm-input"
            value={text}
            onChange={(event) => setText(event.target.value)}
            autoComplete="off"
            aria-label={`Type ${confirmWord} to confirm`}
          />
        </Field>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => handleOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={onConfirm}
            disabled={!matches || busy}
            loading={busy}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
