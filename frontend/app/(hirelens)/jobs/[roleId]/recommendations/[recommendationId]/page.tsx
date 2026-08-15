import type { Metadata } from 'next'
import { DecisionMemo } from '@/components/hirelens/decision-intelligence/decision-memo'

/**
 * The memo behind a single AI recommendation.
 *
 * The segment was `decisions/[decisionId]` until Phase 9.1. It reads
 * `agent_recommendations` — the record of a recommendation the recruiter
 * approved or overrode — which is not the same thing as a hiring decision, and
 * "Decisions" is now the surface that means offers, hires and rejections. Two
 * records, two names. `next.config.mjs` redirects the old path.
 */
export const metadata: Metadata = { title: 'Recommendation' }

export default async function Page({
  params,
}: {
  params: Promise<{ roleId: string; recommendationId: string }>
}) {
  const { roleId, recommendationId } = await params
  return <DecisionMemo roleId={roleId} decisionId={recommendationId} />
}
