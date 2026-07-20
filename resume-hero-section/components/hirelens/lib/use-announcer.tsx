'use client'

import * as React from 'react'

/**
 * Screen-reader announcer (Design Bible §IX). Provides a single pair of
 * live regions so any component can announce async results, AI stream
 * completion, or toast content without rendering its own region.
 */
type Politeness = 'polite' | 'assertive'
type Announce = (message: string, politeness?: Politeness) => void

const AnnouncerContext = React.createContext<Announce | null>(null)

export function AnnouncerProvider({ children }: { children: React.ReactNode }) {
  const [polite, setPolite] = React.useState('')
  const [assertive, setAssertive] = React.useState('')

  const announce = React.useCallback<Announce>((message, politeness = 'polite') => {
    // Clear then set on the next frame so repeated identical messages re-announce.
    if (politeness === 'assertive') {
      setAssertive('')
      requestAnimationFrame(() => setAssertive(message))
    } else {
      setPolite('')
      requestAnimationFrame(() => setPolite(message))
    }
  }, [])

  return (
    <AnnouncerContext.Provider value={announce}>
      {children}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {polite}
      </div>
      <div className="sr-only" role="alert" aria-live="assertive" aria-atomic="true">
        {assertive}
      </div>
    </AnnouncerContext.Provider>
  )
}

export function useAnnouncer(): Announce {
  const context = React.useContext(AnnouncerContext)
  if (!context) {
    throw new Error('useAnnouncer must be used within an AnnouncerProvider')
  }
  return context
}
