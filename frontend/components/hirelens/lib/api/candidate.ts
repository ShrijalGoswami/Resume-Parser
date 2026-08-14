'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getCandidate,
  listNotes,
  createNote,
  deleteNote,
  candidateActivity,
  getResumeUrl,
} from '@/services/campaigns-api'
import { roleKeys } from './workspace'
import type { CandidateRow } from '@/lib/candidate'
import type { Candidate } from '@/types/campaign'
import type { CandidateResult } from '@/types/batch'

/** The typed full analysis (latest_analysis.result) for a candidate, if any. */
export function getCandidateResult(candidate: Candidate | undefined | null): CandidateResult | null {
  if (!candidate) return null
  const analysis = candidate.latest_analysis as Record<string, unknown> | null
  return (analysis?.result as CandidateResult | undefined) ?? null
}

const detailKey = (roleId: string, id: string) => ['hl', 'role', roleId, 'candidate', id] as const
const notesKey = (roleId: string, id: string) =>
  ['hl', 'role', roleId, 'candidate', id, 'notes'] as const
const activityKey = (roleId: string, id: string) =>
  ['hl', 'role', roleId, 'candidate', id, 'activity'] as const
const resumeKey = (roleId: string, id: string) =>
  ['hl', 'role', roleId, 'candidate', id, 'resume'] as const

/**
 * Candidate detail — seeded from the pipeline's cached list so the drawer opens
 * instantly, then refetched fresh in the background. Falls back to a direct
 * fetch on deep-link (no cached list).
 */
export function useCandidateDetail(roleId: string, candidateId: string) {
  const queryClient = useQueryClient()
  const cached = queryClient
    .getQueryData<CandidateRow[]>(roleKeys.candidates(roleId))
    ?.find((row) => row.id === candidateId)?.raw

  return useQuery({
    queryKey: detailKey(roleId, candidateId),
    queryFn: () => getCandidate(roleId, candidateId),
    initialData: cached,
  })
}

export function useCandidateNotes(roleId: string, candidateId: string) {
  return useQuery({
    queryKey: notesKey(roleId, candidateId),
    queryFn: () => listNotes(roleId, candidateId),
  })
}

export function useCreateNote(roleId: string, candidateId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: string) => createNote(roleId, candidateId, body),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: notesKey(roleId, candidateId) }),
  })
}

export function useDeleteNote(roleId: string, candidateId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (noteId: string) => deleteNote(roleId, candidateId, noteId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: notesKey(roleId, candidateId) }),
  })
}

export function useCandidateActivity(roleId: string, candidateId: string) {
  return useQuery({
    queryKey: activityKey(roleId, candidateId),
    queryFn: () => candidateActivity(roleId, candidateId),
  })
}

/** Signed résumé URL — fetched only when requested (Documents). */
export function useResumeUrl(roleId: string, candidateId: string, enabled: boolean) {
  return useQuery({
    queryKey: resumeKey(roleId, candidateId),
    queryFn: () => getResumeUrl(roleId, candidateId),
    enabled,
    staleTime: 4 * 60_000,
  })
}
