'use client'

import * as React from 'react'
import { ArrowUp } from 'lucide-react'
import { Textarea } from '../ui/textarea'
import { Button } from '../ui/button'

/**
 * Ask composer (UX Spec §9). One input; Enter sends, Shift+Enter is a newline,
 * ⌘/Ctrl+Enter starts a new thread. Disabled while an answer is in flight.
 */
export function AskComposer({
  draft,
  onDraftChange,
  onSend,
  onNewThread,
  disabled,
  placeholder,
  inputRef,
}: {
  draft: string
  onDraftChange: (value: string) => void
  onSend: () => void
  onNewThread: () => void
  disabled?: boolean
  placeholder?: string
  inputRef?: React.RefObject<HTMLTextAreaElement | null>
}) {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      onNewThread()
      return
    }
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      if (!disabled && draft.trim()) onSend()
    }
  }

  return (
    <div className="flex items-end gap-2 rounded-hl-lg border border-hl-border bg-hl-canvas p-2 focus-within:border-hl-accent">
      <Textarea
        ref={inputRef}
        value={draft}
        onChange={(event) => onDraftChange(event.target.value)}
        onKeyDown={handleKeyDown}
        rows={1}
        placeholder={placeholder ?? 'Ask anything about your hiring…'}
        aria-label="Ask anything about your hiring"
        aria-keyshortcuts="/"
        className="min-h-0 resize-none border-0 bg-transparent px-1.5 py-1.5 focus-visible:border-0"
      />
      <Button
        variant="ai"
        size="icon"
        onClick={onSend}
        disabled={disabled || !draft.trim()}
        aria-label="Send"
      >
        <ArrowUp />
      </Button>
    </div>
  )
}
