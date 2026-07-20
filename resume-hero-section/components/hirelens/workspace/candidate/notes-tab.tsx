'use client'

import * as React from 'react'
import { Trash2 } from 'lucide-react'
import { useCandidateNotes, useCreateNote, useDeleteNote } from '../../lib/api/candidate'
import { Button } from '../../ui/button'
import { Skeleton } from '../../ui/skeleton'
import { EmptyHint } from './parts'
import { relativeTime } from '../../lib/format'

/** Notes tab (UX Spec §7.4) — threaded notes, optimistic-free but instant on refetch. */
export function NotesTab({ roleId, candidateId }: { roleId: string; candidateId: string }) {
  const notes = useCandidateNotes(roleId, candidateId)
  const create = useCreateNote(roleId, candidateId)
  const remove = useDeleteNote(roleId, candidateId)
  const [draft, setDraft] = React.useState('')

  const submit = () => {
    const body = draft.trim()
    if (!body) return
    create.mutate(body, { onSuccess: () => setDraft('') })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-hl-lg border border-hl-border bg-hl-canvas p-2 transition-colors focus-within:border-hl-accent">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={2}
          placeholder="Add a note…"
          aria-label="Add a note"
          className="hl-body block w-full resize-none bg-transparent px-1 text-hl-fg outline-none placeholder:text-hl-fg-tertiary"
        />
        <div className="mt-1 flex justify-end">
          <Button
            size="sm"
            variant="primary"
            onClick={submit}
            disabled={!draft.trim()}
            loading={create.isPending}
          >
            Add note
          </Button>
        </div>
      </div>

      {notes.isLoading ? (
        <div className="flex flex-col gap-2">
          {[0, 1].map((index) => (
            <Skeleton key={index} className="h-12" />
          ))}
        </div>
      ) : !notes.data || notes.data.length === 0 ? (
        <EmptyHint text="No notes yet." />
      ) : (
        <ul className="flex flex-col gap-2">
          {notes.data.map((note) => (
            <li
              key={note.id}
              className="group rounded-hl-md border border-hl-border-subtle bg-hl-subtle p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="hl-small whitespace-pre-wrap text-hl-fg">{note.body}</p>
                <button
                  type="button"
                  onClick={() => remove.mutate(note.id)}
                  aria-label="Delete note"
                  className="shrink-0 text-hl-fg-tertiary opacity-0 outline-none transition-opacity hover:text-hl-danger focus-visible:opacity-100 group-hover:opacity-100"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
              {note.created_at ? (
                <p className="hl-caption mt-1 text-hl-fg-tertiary">{relativeTime(note.created_at)}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
