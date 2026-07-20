'use client'

import * as React from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { TalentResultRow } from './talent-result-row'
import type { SearchResultItem } from '@/types/search'

/** Virtualized talent results (UX Spec §8 / large-dataset requirement). */
export interface ResultsListProps {
  results: SearchResultItem[]
  selected: Set<string>
  activeIndex: number
  scrollRef: React.RefObject<HTMLDivElement | null>
  onToggle: (id: string) => void
  onOpen: (result: SearchResultItem) => void
  onFindSimilar: (result: SearchResultItem) => void
  onAddToCollection: (result: SearchResultItem) => void
}

export function ResultsList({
  results,
  selected,
  activeIndex,
  scrollRef,
  onToggle,
  onOpen,
  onFindSimilar,
  onAddToCollection,
}: ResultsListProps) {
  // react-virtual returns fresh functions each render; the React Compiler skips it.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: results.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 150,
    overscan: 8,
    getItemKey: (index) => results[index]?.candidate_id ?? index,
  })

  return (
    <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
      {virtualizer.getVirtualItems().map((item) => {
        const result = results[item.index]
        return (
          <div
            key={result.candidate_id}
            data-index={item.index}
            ref={virtualizer.measureElement}
            className="pb-2"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${item.start}px)`,
            }}
          >
            <TalentResultRow
              result={result}
              selected={selected.has(result.candidate_id)}
              active={item.index === activeIndex}
              onToggleSelect={() => onToggle(result.candidate_id)}
              onOpen={() => onOpen(result)}
              onFindSimilar={() => onFindSimilar(result)}
              onAddToCollection={() => onAddToCollection(result)}
            />
          </div>
        )
      })}
    </div>
  )
}
