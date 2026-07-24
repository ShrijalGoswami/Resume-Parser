'use client'

import * as React from 'react'
import { FileText, Download, Trash2 } from 'lucide-react'
import { ActivityRow } from '../../domain'
import { Button } from '../../ui/button'
import { Skeleton } from '../../ui/skeleton'
import { relativeTime } from '../../lib/format'
import {
  useCandidateNotes,
  useCreateNote,
  useDeleteNote,
  useCandidateActivity,
} from '../../lib/api/candidate'
import { Section } from './primitives'
import type { CandidateModel } from '../model'

/**
 * CandidateResume — access to the stored résumé binary. Honest per A3/A5: the
 * download only appears when a binary is actually stored (`resumePath`), never a
 * guaranteed 404.
 */
export function CandidateResume({
  model,
  onOpenResume,
}: {
  model: CandidateModel
  onOpenResume?: () => void
}) {
  return (
    <Section title="Résumé">
      {model.resumeFilename ? (
        <div className="flex items-center gap-2 rounded-hl-md border border-hl-border-subtle bg-hl-subtle p-3">
          <FileText className="size-4 shrink-0 text-hl-fg-tertiary" aria-hidden />
          <span className="hl-small flex-1 truncate">{model.resumeFilename}</span>
          {model.resumePath ? (
            <Button size="sm" variant="secondary" onClick={onOpenResume}>
              <Download /> Open
            </Button>
          ) : (
            <span className="hl-caption text-hl-fg-tertiary">Stored résumé unavailable</span>
          )}
        </div>
      ) : (
        <p className="hl-small text-hl-fg-tertiary">No résumé on file for this candidate.</p>
      )}
    </Section>
  )
}

/** CandidateNotes — the record's notes (shared hooks; single renderer). */
export function CandidateNotes({ roleId, candidateId }: { roleId: string; candidateId: string }) {
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
    <Section title="Notes">
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
            <Button size="sm" variant="primary" onClick={submit} disabled={!draft.trim()} loading={create.isPending}>
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
          <p className="hl-small text-hl-fg-tertiary">No notes yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {notes.data.map((note) => (
              <li key={note.id} className="group rounded-hl-md border border-hl-border-subtle bg-hl-subtle p-3">
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
    </Section>
  )
}

/** CandidateActivity — the candidate's event timeline (reuses domain ActivityRow). */
export function CandidateActivity({ roleId, candidateId }: { roleId: string; candidateId: string }) {
  const { data, isLoading } = useCandidateActivity(roleId, candidateId)
  return (
    <Section title="Activity">
      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-6" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <p className="hl-small text-hl-fg-tertiary">No activity yet for this candidate.</p>
      ) : (
        <ul className="divide-y divide-hl-border-subtle">
          {data.map((event) => (
            <ActivityRow key={event.id} event={event} />
          ))}
        </ul>
      )}
    </Section>
  )
}
