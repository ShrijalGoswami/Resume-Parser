/**
 * Candidate view-model helpers — derive a normalized row from a persisted
 * Candidate + its latest analysis (the verbatim CandidateResult JSON).
 * Everything here is derived from REAL stored data; nothing is fabricated.
 */
import type { Candidate } from '@/types/campaign';

export type HireLabel = 'Strong Hire' | 'Hire' | 'Maybe' | 'Reject' | 'Unrated';
export type AnalysisStatus = 'analyzed' | 'awaiting' | 'analyzing' | 'failed';

/** Map the pipeline's recommendation text to a compact hiring verdict. */
export function hireLabel(recommendation?: string | null): HireLabel {
  const r = (recommendation ?? '').toLowerCase();
  if (!r) return 'Unrated';
  if (r.includes('strongly')) return 'Strong Hire';
  if (r.includes('not recommended') || r.includes('reject')) return 'Reject';
  if (r.includes('recommend')) return 'Hire';
  if (r.includes('consider') || r.includes('further') || r.includes('maybe')) return 'Maybe';
  return 'Maybe';
}

export const HIRE_ORDER: Record<HireLabel, number> = {
  'Strong Hire': 4,
  Hire: 3,
  Maybe: 2,
  Reject: 1,
  Unrated: 0,
};

export const HIRE_STYLES: Record<HireLabel, string> = {
  'Strong Hire': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Hire: 'bg-blue-50 text-blue-700 border-blue-200',
  Maybe: 'bg-amber-50 text-amber-700 border-amber-200',
  Reject: 'bg-rose-50 text-rose-700 border-rose-200',
  Unrated: 'bg-slate-100 text-slate-500 border-slate-200',
};

/** Resume completeness (0–100), mirroring the backend confidence rubric. */
export function resumeHealth(resumeData: Record<string, unknown> | undefined | null): number | null {
  if (!resumeData) return null;
  let score = 100;
  const name = String((resumeData.name as string) ?? '').trim();
  if (!name || name.split(/\s+/).length < 2) score -= 30;
  if (!String((resumeData.email as string) ?? '').trim()) score -= 20;
  if (!String((resumeData.phone as string) ?? '').trim()) score -= 15;
  if (!Array.isArray(resumeData.skills) || (resumeData.skills as unknown[]).length === 0) score -= 15;
  if (!Array.isArray(resumeData.education) || (resumeData.education as unknown[]).length === 0) score -= 10;
  if (!Array.isArray(resumeData.experience) || (resumeData.experience as unknown[]).length === 0) score -= 10;
  return Math.max(0, score);
}

export interface CandidateRow {
  id: string;
  name: string;
  email: string;
  resumeFilename: string | null;
  resumePath: string | null;
  status: AnalysisStatus;
  overallScore: number | null;
  atsScore: number | null;
  experience: number | null;
  matchCategory: string | null;
  hire: HireLabel;
  recommendationText: string | null;
  confidence: number | null; // present only if the pipeline emits it
  missingSkills: string[];
  topSkills: string[];
  matchingSkills: string[];
  strengths: string[];
  weaknesses: string[];
  summary: string | null;
  resumeHealth: number | null;
  analysisAt: string | null;
  uploadedAt: string | null;
  raw: Candidate;
}

export function toRow(c: Candidate): CandidateRow {
  const a = (c.latest_analysis ?? null) as Record<string, unknown> | null;
  const result = (a?.result ?? {}) as Record<string, unknown>;
  const resumeData = (result.resume_data ?? null) as Record<string, unknown> | null;
  const status: AnalysisStatus =
    (c.metadata?.analysis_status as AnalysisStatus) || (a ? 'analyzed' : 'awaiting');
  const num = (v: unknown): number | null =>
    typeof v === 'number' ? v : v == null ? null : Number(v) || null;

  return {
    id: c.id,
    name: c.full_name || (result.name as string) || c.resume_filename || 'Unnamed candidate',
    email: c.email || (result.email as string) || '',
    resumeFilename: c.resume_filename ?? null,
    resumePath: c.resume_path ?? null,
    status,
    overallScore: num(result.overall_score ?? a?.overall_score),
    atsScore: num(result.ats_score ?? a?.ats_score),
    experience: num(result.years_experience ?? a?.years_experience),
    matchCategory: (result.match_category as string) ?? (a?.match_category as string) ?? null,
    hire: hireLabel((result.recommendation as string) ?? (a?.recommendation as string)),
    recommendationText: (result.recommendation_explanation as string) ?? null,
    confidence: num(result.confidence), // batch pipeline does not emit this yet
    missingSkills: (result.missing_skills as string[]) ?? [],
    topSkills: (result.top_skills as string[]) ?? [],
    matchingSkills: (result.matching_skills as string[]) ?? [],
    strengths: (result.strengths as string[]) ?? [],
    weaknesses: (result.weaknesses as string[]) ?? [],
    summary: (result.summary as string) ?? null,
    resumeHealth: resumeHealth(resumeData),
    analysisAt: (a?.created_at as string) ?? null,
    uploadedAt: c.created_at ?? null,
    raw: c,
  };
}
