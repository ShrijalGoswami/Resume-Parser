import type { Metadata } from 'next'
import { DecisionMemo } from '@/components/hirelens/decision-intelligence/decision-memo'

export const metadata: Metadata = { title: 'Decision' }

export default async function Page({
  params,
}: {
  params: Promise<{ roleId: string; decisionId: string }>
}) {
  const { roleId, decisionId } = await params
  return <DecisionMemo roleId={roleId} decisionId={decisionId} />
}
