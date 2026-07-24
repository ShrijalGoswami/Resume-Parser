import type { Metadata } from 'next'
import { CandidateFullDossier } from '@/components/hirelens/candidate-object'

export const metadata: Metadata = { title: 'Candidate review' }

export default async function Page({
  params,
}: {
  params: Promise<{ roleId: string; candidateId: string }>
}) {
  const { roleId, candidateId } = await params
  return <CandidateFullDossier roleId={roleId} candidateId={candidateId} />
}
