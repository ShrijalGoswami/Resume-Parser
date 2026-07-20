'use client'

import * as React from 'react'
import { Plus } from 'lucide-react'
import { useCollections, type CollectionItem } from '../lib/talent-store'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { toast } from '../ui/use-toast'

/** Add selected candidates to a collection (localStorage). */
export function AddToCollectionDialog({
  items,
  open,
  onOpenChange,
}: {
  items: CollectionItem[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { collections, create, addItem } = useCollections()
  const [name, setName] = React.useState('')

  const addToExisting = (collectionId: string, collectionName: string) => {
    items.forEach((item) => addItem(collectionId, item))
    toast({
      variant: 'success',
      title: `Added ${items.length} to ${collectionName}`,
    })
    onOpenChange(false)
  }

  const createAndAdd = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    const id = create(trimmed)
    items.forEach((item) => addItem(id, item))
    toast({ variant: 'success', title: `Created “${trimmed}”` })
    setName('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>
            Add {items.length} candidate{items.length === 1 ? '' : 's'} to a collection
          </DialogTitle>
        </DialogHeader>

        {collections.length > 0 ? (
          <div className="flex max-h-52 flex-col gap-0.5 overflow-y-auto">
            {collections.map((collection) => (
              <button
                key={collection.id}
                type="button"
                onClick={() => addToExisting(collection.id, collection.name)}
                className="hl-small flex items-center justify-between rounded-hl-md px-2 py-1.5 text-left outline-none hover:bg-hl-subtle"
              >
                <span className="truncate">{collection.name}</span>
                <span className="hl-caption text-hl-fg-tertiary">{collection.items.length}</span>
              </button>
            ))}
          </div>
        ) : null}

        <div className="flex items-center gap-2">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="New collection…"
            aria-label="New collection name"
            onKeyDown={(event) => {
              if (event.key === 'Enter') createAndAdd()
            }}
          />
          <Button variant="primary" onClick={createAndAdd} disabled={!name.trim()}>
            <Plus /> Create
          </Button>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
