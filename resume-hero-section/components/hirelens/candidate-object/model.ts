import type { Candidate } from '@/types/campaign'
import type { CandidateResult } from '@/types/batch'
import { getCandidateResult } from '../lib/api/candidate'

/**
 * CandidateModel — the SINGLE normalized shape the Candidate Object renders.
 * Every V5 surface (Inbox, Roles, Talent, Ledger) reads this exact model, and the
 * Peek and Full dossier render it at different densities. Built once from the
 * backend `Candidate` (+ its embedded analysis `CandidateResult`); nothing is
 * invented — fields are empty when the analysis hasn't produced them.
 */
export interface CandidateModel {
  id: string
  roleId: string
  name: string
  stage: string
  email: string | null
  phone: string | null
  resumePath: string | null
  resumeFilename: string | null
  /** True once the AI analysis exists; false → verdict/evidence are pending. */
  hasAnalysis: boolean
  matchCategory: string
  /** Fit confidence 0–100 (null until analyzed). */
  confidence: number | null
  /** The AI's headline call — the Answer of the verdict. */
  verdict: string
  /** The verdict's collapsed reasoning. */
  verdictReasoning: string
  summary: string
  strengths: string[]
  risks: string[]
  experienceRelevance: string
  relevantProjects: string[]
  matchedSkills: string[]
  missingSkills: string[]
  interviewQuestions: string[]
}

export function buildCandidateModel(
  roleId: string,
  candidate: Candidate | null | undefined,
): CandidateModel | null {
  if (!candidate) return null
  const result: CandidateResult | null = getCandidateResult(candidate)
  const name = candidate.full_name || result?.name || candidate.resume_filename || 'Candidate'
  return {
    id: candidate.id,
    roleId,
    name,
    stage: candidate.stage,
    email: candidate.email ?? result?.email ?? null,
    phone: candidate.phone ?? result?.phone ?? null,
    resumePath: candidate.resume_path ?? null,
    resumeFilename: candidate.resume_filename ?? null,
    hasAnalysis: Boolean(result),
    matchCategory: result?.match_category ?? '',
    confidence: result ? Math.round(result.overall_score ?? 0) : null,
    verdict: result?.recommendation ?? '',
    verdictReasoning: result?.recommendation_explanation ?? '',
    summary: result?.summary ?? '',
    strengths: result?.strengths ?? [],
    risks: result?.weaknesses ?? [],
    experienceRelevance: result?.experience_relevance ?? '',
    relevantProjects: result?.relevant_projects ?? [],
    matchedSkills: result?.matching_skills ?? [],
    missingSkills: result?.missing_skills ?? [],
    interviewQuestions: result?.interview_questions ?? [],
  }
}
