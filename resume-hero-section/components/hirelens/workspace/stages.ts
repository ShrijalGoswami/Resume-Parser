import type { PipelineStage } from '@/types/campaign'

/** Pipeline stages (UX Spec §7.2). */
export const STAGE_LABELS: Record<PipelineStage, string> = {
  sourced: 'Sourced',
  screening: 'Screening',
  shortlisted: 'Shortlisted',
  interview: 'Interview',
  offer: 'Offer',
  hired: 'Hired',
  rejected: 'Rejected',
}

/**
 * Label for a stage that arrives as a plain `string` (API payloads, candidate
 * models). Falls back to the raw value rather than rendering blank, so an
 * unknown stage from a newer backend degrades to something readable instead of
 * disappearing. Prefer this over `capitalize` on the raw enum — CSS casing only
 * works while every stage happens to be a single word.
 */
export function stageLabel(stage: string): string {
  return STAGE_LABELS[stage as PipelineStage] ?? stage
}

/** Board columns, in flow order (rejected is filtered out of the board). */
export const BOARD_STAGES: PipelineStage[] = [
  'sourced',
  'screening',
  'shortlisted',
  'interview',
  'offer',
  'hired',
]

export const ALL_STAGES: PipelineStage[] = [...BOARD_STAGES, 'rejected']
