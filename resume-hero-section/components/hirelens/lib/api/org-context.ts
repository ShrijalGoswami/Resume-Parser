'use client'

import { useQuery } from '@tanstack/react-query'
import { getOrgContext } from '@/services/org-api'
import type { OrgContext } from '@/types/org'

/**
 * `GET /org/context` — the caller's org, role, and resolved permission list.
 *
 * This lives in its own module rather than in `api/settings.ts` because product
 * surfaces gate on it: the Candidate Object's decision bar, the pipeline's stage
 * menu, the nav rail. Importing it from `settings.ts` pulled that file's whole
 * graph — org-api, campaigns-api, the Home hooks — behind every one of those
 * leaves, which measurably slowed importing the Candidate Object barrel.
 *
 * `settings.ts` re-exports both symbols, so the six Settings sections that
 * already import from there are unaffected and there is still exactly one query
 * key and one fetch. Everything else should import from here or from `useCan`.
 */
export const orgContextKey = ['hl', 'settings', 'org-context'] as const

export function useOrgContext() {
  return useQuery<OrgContext>({ queryKey: orgContextKey, queryFn: getOrgContext })
}
