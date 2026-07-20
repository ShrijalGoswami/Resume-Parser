'use client'

import * as React from 'react'
import { Clock, Bookmark, FolderOpen, X, type LucideIcon } from 'lucide-react'
import {
  useSearchHistory,
  useSavedSearches,
  useCollections,
  type SavedTalentSearch,
} from '../lib/talent-store'

function Panel({
  title,
  icon: Icon,
  action,
  children,
}: {
  title: string
  icon: LucideIcon
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section>
      <div className="mb-1.5 flex items-center gap-1.5">
        <Icon className="size-3.5 text-hl-fg-tertiary" aria-hidden />
        <h3 className="hl-caption flex-1 text-hl-fg-tertiary">{title}</h3>
        {action}
      </div>
      <div className="flex flex-col gap-0.5">{children}</div>
    </section>
  )
}

function Row({
  label,
  meta,
  onClick,
  onRemove,
}: {
  label: string
  meta?: string
  onClick: () => void
  onRemove?: () => void
}) {
  return (
    <div className="group flex items-center gap-1 rounded-hl-md hover:bg-hl-subtle">
      <button
        type="button"
        onClick={onClick}
        className="hl-small flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left text-hl-fg-secondary outline-none hover:text-hl-fg"
      >
        <span className="truncate">{label}</span>
        {meta ? <span className="hl-caption ml-auto shrink-0 text-hl-fg-tertiary">{meta}</span> : null}
      </button>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${label}`}
          className="mr-1 shrink-0 text-hl-fg-tertiary opacity-0 outline-none hover:text-hl-danger focus-visible:opacity-100 group-hover:opacity-100"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  )
}

function Hint({ text }: { text: string }) {
  return <p className="hl-caption px-2 py-1 text-hl-fg-tertiary">{text}</p>
}

export interface TalentSidebarProps {
  onRunQuery: (query: string) => void
  onRunSaved: (saved: SavedTalentSearch) => void
  onOpenCollection: (collectionId: string) => void
}

export function TalentSidebar({ onRunQuery, onRunSaved, onOpenCollection }: TalentSidebarProps) {
  const { history, clear } = useSearchHistory()
  const { saved, remove: removeSaved } = useSavedSearches()
  const { collections, remove: removeCollection } = useCollections()

  return (
    <div className="flex flex-col gap-5">
      {history.length > 0 ? (
        <Panel
          title="Recent"
          icon={Clock}
          action={
            <button
              type="button"
              onClick={clear}
              className="hl-caption text-hl-fg-tertiary outline-none hover:text-hl-fg"
            >
              Clear
            </button>
          }
        >
          {history.map((query) => (
            <Row key={query} label={query} onClick={() => onRunQuery(query)} />
          ))}
        </Panel>
      ) : null}

      <Panel title="Saved searches" icon={Bookmark}>
        {saved.length === 0 ? (
          <Hint text="Save a search to reuse it." />
        ) : (
          saved.map((entry) => (
            <Row
              key={entry.id}
              label={entry.name}
              onClick={() => onRunSaved(entry)}
              onRemove={() => removeSaved(entry.id)}
            />
          ))
        )}
      </Panel>

      <Panel title="Collections" icon={FolderOpen}>
        {collections.length === 0 ? (
          <Hint text="Save candidates into collections." />
        ) : (
          collections.map((collection) => (
            <Row
              key={collection.id}
              label={collection.name}
              meta={String(collection.items.length)}
              onClick={() => onOpenCollection(collection.id)}
              onRemove={() => removeCollection(collection.id)}
            />
          ))
        )}
      </Panel>
    </div>
  )
}
