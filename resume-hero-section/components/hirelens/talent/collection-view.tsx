'use client'

import { ArrowLeft, X, FolderOpen } from 'lucide-react'
import { useCollections, type CollectionItem } from '../lib/talent-store'
import { Card } from '../ui/card'
import { Avatar } from '../ui/avatar'
import { Button } from '../ui/button'
import { EmptyState } from '../states/empty-state'

/** A saved collection's members (localStorage). Snapshots open in the drawer. */
export function CollectionView({
  collectionId,
  onBack,
  onOpen,
}: {
  collectionId: string
  onBack: () => void
  onOpen: (item: CollectionItem) => void
}) {
  const { collections, removeItem } = useCollections()
  const collection = collections.find((entry) => entry.id === collectionId)

  if (!collection) {
    return (
      <EmptyState
        icon={FolderOpen}
        title="Collection not found"
        action={<Button variant="secondary" onClick={onBack}>Back to search</Button>}
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft /> Search
        </Button>
        <h2 className="hl-h2">{collection.name}</h2>
        <span className="hl-caption text-hl-fg-tertiary">
          {collection.items.length} candidate{collection.items.length === 1 ? '' : 's'}
        </span>
      </div>

      {collection.items.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="This collection is empty"
          description="Save candidates from search results into it."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {collection.items.map((item) => (
            <li key={item.candidateId}>
              <Card className="flex items-center gap-3 p-3">
                <Avatar name={item.name} size={28} />
                <button
                  type="button"
                  onClick={() => onOpen(item)}
                  className="hl-body-medium min-w-0 flex-1 truncate text-left outline-none hover:underline"
                  disabled={!item.campaignId}
                >
                  {item.name}
                </button>
                <button
                  type="button"
                  onClick={() => removeItem(collection.id, item.candidateId)}
                  aria-label={`Remove ${item.name}`}
                  className="shrink-0 text-hl-fg-tertiary outline-none hover:text-hl-danger"
                >
                  <X className="size-4" />
                </button>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
