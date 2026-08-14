'use client'

import * as React from 'react'
import { useLocalStore } from './local-store'
import type { SearchFilters } from '@/types/search'

/**
 * Talent persistence — search history, saved searches, and collections, stored
 * client-side (localStorage) per the coexistence decision. Real per-device
 * persistence; the search results they reference are always live from the API.
 */

// --- Search history ---------------------------------------------------------
const EMPTY_HISTORY: string[] = []

export function useSearchHistory() {
  const [history, setHistory] = useLocalStore<string[]>('hl-talent-history', EMPTY_HISTORY)
  const add = React.useCallback(
    (query: string) => {
      const trimmed = query.trim()
      if (!trimmed) return
      setHistory((prev) => [trimmed, ...prev.filter((item) => item !== trimmed)].slice(0, 8))
    },
    [setHistory],
  )
  const clear = React.useCallback(() => setHistory(EMPTY_HISTORY), [setHistory])
  return { history, add, clear }
}

// --- Saved searches ---------------------------------------------------------
export interface SavedTalentSearch {
  id: string
  name: string
  query: string
  filters: SearchFilters
}
const EMPTY_SAVED: SavedTalentSearch[] = []

export function useSavedSearches() {
  const [saved, setSaved] = useLocalStore<SavedTalentSearch[]>('hl-talent-saved', EMPTY_SAVED)
  const save = React.useCallback(
    (entry: Omit<SavedTalentSearch, 'id'>) => {
      setSaved((prev) => [{ id: `s-${prev.length}-${entry.query}`, ...entry }, ...prev])
    },
    [setSaved],
  )
  const remove = React.useCallback(
    (id: string) => setSaved((prev) => prev.filter((item) => item.id !== id)),
    [setSaved],
  )
  return { saved, save, remove }
}

// --- Collections ------------------------------------------------------------
export interface CollectionItem {
  candidateId: string
  campaignId: string | null
  name: string
}
export interface TalentCollection {
  id: string
  name: string
  items: CollectionItem[]
}
const EMPTY_COLLECTIONS: TalentCollection[] = []

export function useCollections() {
  const [collections, setCollections] = useLocalStore<TalentCollection[]>(
    'hl-talent-collections',
    EMPTY_COLLECTIONS,
  )

  const create = React.useCallback(
    (name: string): string => {
      const id = `col-${name}-${collections.length}`
      setCollections((prev) => [{ id, name, items: [] }, ...prev])
      return id
    },
    [collections.length, setCollections],
  )

  const addItem = React.useCallback(
    (collectionId: string, item: CollectionItem) => {
      setCollections((prev) =>
        prev.map((collection) =>
          collection.id === collectionId
            ? collection.items.some((existing) => existing.candidateId === item.candidateId)
              ? collection
              : { ...collection, items: [...collection.items, item] }
            : collection,
        ),
      )
    },
    [setCollections],
  )

  const removeItem = React.useCallback(
    (collectionId: string, candidateId: string) => {
      setCollections((prev) =>
        prev.map((collection) =>
          collection.id === collectionId
            ? { ...collection, items: collection.items.filter((i) => i.candidateId !== candidateId) }
            : collection,
        ),
      )
    },
    [setCollections],
  )

  const remove = React.useCallback(
    (collectionId: string) =>
      setCollections((prev) => prev.filter((collection) => collection.id !== collectionId)),
    [setCollections],
  )

  return { collections, create, addItem, removeItem, remove }
}
