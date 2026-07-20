'use client'

import * as React from 'react'

/**
 * Copilot context (UX Spec §4.3). Surfaces set the rail's contextual object
 * (the header chip) and suggested prompts for the current surface/selection.
 * Infrastructure only — no AI/threading wiring lives here.
 */
interface CopilotContextValue {
  contextLabel: string | null
  setContextLabel: (label: string | null) => void
  suggestions: string[]
  setSuggestions: (suggestions: string[]) => void
}

const CopilotContext = React.createContext<CopilotContextValue | null>(null)

export function CopilotProvider({ children }: { children: React.ReactNode }) {
  const [contextLabel, setContextLabel] = React.useState<string | null>(null)
  const [suggestions, setSuggestions] = React.useState<string[]>([])

  const value = React.useMemo<CopilotContextValue>(
    () => ({ contextLabel, setContextLabel, suggestions, setSuggestions }),
    [contextLabel, suggestions],
  )

  return <CopilotContext.Provider value={value}>{children}</CopilotContext.Provider>
}

export function useCopilot(): CopilotContextValue {
  const context = React.useContext(CopilotContext)
  if (!context) {
    throw new Error('useCopilot must be used within a CopilotProvider')
  }
  return context
}
