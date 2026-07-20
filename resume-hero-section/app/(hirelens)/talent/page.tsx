import type { Metadata } from 'next'
import { TalentScreen } from '@/components/hirelens/talent/talent-screen'

export const metadata: Metadata = { title: 'Talent' }

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; min_score?: string; min_exp?: string; location?: string }>
}) {
  const params = await searchParams
  return (
    <TalentScreen
      initial={{
        q: params.q ?? '',
        filters: {
          min_score: params.min_score ? Number(params.min_score) : null,
          min_experience: params.min_exp ? Number(params.min_exp) : null,
          location: params.location ?? null,
        },
      }}
    />
  )
}
