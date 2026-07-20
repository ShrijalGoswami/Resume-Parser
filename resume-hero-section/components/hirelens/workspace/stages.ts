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
