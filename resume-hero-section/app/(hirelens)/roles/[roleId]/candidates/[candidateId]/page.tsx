import type { Metadata } from 'next'
import { DeepReview } from '@/components/hirelens/deep-review/deep-review'

export const metadata: Metadata = { title: 'Candidate review' }

export default async function Page({
  params,
}: {
  params: Promise<{ roleId: string; candidateId: string }>
}) {
  const { roleId, candidateId } = await params
  return <DeepReview roleId={roleId} candidateId={candidateId} />
}
