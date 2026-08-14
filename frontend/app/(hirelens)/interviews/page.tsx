import type { Metadata } from 'next'
import { InterviewsScreen } from '@/components/hirelens/interviews/interviews-screen'

export const metadata: Metadata = { title: 'Interviews' }

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; candidate?: string }>
}) {
  const params = await searchParams
  return <InterviewsScreen initial={{ role: params.role, candidate: params.candidate }} />
}
