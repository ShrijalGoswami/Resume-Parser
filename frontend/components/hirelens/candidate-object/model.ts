import type { Candidate } from '@/types/campaign'
import type {
  CandidateResult,
  ResumeData,
  ScoreBreakdown,
  ScoreComponent,
} from '@/types/batch'
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
  /**
   * ATS score 0–100 (null until analyzed). Additive v1.x field: the audit
   * asked for Fit AND ATS visibility on the drawer, and ATS existed in the
   * analysis but not in the model. Optional-with-safe-default per the freeze
   * contract — no existing consumer changes behavior.
   */
  atsScore: number | null
  /**
   * THE DEFENSIBILITY FIELDS — all additive v1.x, all already present in the
   * stored analysis and previously dropped on the floor by this normalizer.
   *
   * The Candidate Detail audit asked for a decision someone could defend, and
   * the material for that was never missing from the backend: the ranking
   * position, the component-by-component arithmetic behind the score, and the
   * structured résumé the claims were drawn from. The page could not show any
   * of it because the model stopped at the prose fields.
   *
   * Nothing here is computed or reinterpreted — each field is the backend's
   * own value, rounded for display only where noted.
   */
  /** The analysis run's own ranking position (1 = best). Null when absent. */
  rank: number | null
  /** Years of experience the parser extracted. */
  yearsExperience: number | null
  /** Component arithmetic behind the overall score: earned out of max. */
  scoreComponents: ScoreComponent[]
  /** The ATS sub-scores, as the backend named them. */
  atsBreakdown: ScoreBreakdown | null
  /** The parsed résumé — the record every claim is checked against. */
  resumeData: ResumeData | null
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
    atsScore: result?.ats_score != null ? Math.round(result.ats_score) : null,
    // `rank` is 0 when the field is absent from an older analysis row; a rank
    // of zero is not a position, so it reads as "unknown" rather than "first".
    rank: result?.rank ? result.rank : null,
    yearsExperience: result?.years_experience ?? null,
    scoreComponents: result?.score?.components ?? [],
    atsBreakdown: result?.ats_breakdown ?? null,
    resumeData: result?.resume_data ?? null,
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
