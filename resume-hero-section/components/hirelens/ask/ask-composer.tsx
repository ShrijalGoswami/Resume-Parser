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
    // The composer is the product's AI surface. It sits on a raised plane and
    // resolves a prism edge on focus — the gradient appears in response to
    // intent rather than sitting there as permanent decoration.
    <div className="hl-prism-focus hl-surface flex items-end gap-2 rounded-hl-lg border border-hl-border p-2 shadow-[var(--hl-shadow-sm)] transition-shadow duration-[var(--hl-dur-base)] ease-[var(--hl-ease-out)] focus-within:shadow-[var(--hl-shadow-md)]">
      <Textarea
        ref={inputRef}
        value={draft}
        onChange={(event) => onDraftChange(event.target.value)}
        onKeyDown={handleKeyDown}
        rows={1}
        placeholder={placeholder ?? 'Ask anything about your hiring…'}
        aria-label="Ask anything about your hiring"
        aria-keyshortcuts="/"
        className="min-h-0 resize-none border-0 bg-transparent px-2 py-2.5 focus-visible:border-0"
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
