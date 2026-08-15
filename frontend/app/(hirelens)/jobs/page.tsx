import type { Metadata } from 'next'
import { RolesScreen } from '@/components/hirelens/roles/roles-screen'

export const metadata: Metadata = { title: 'Jobs' }

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>
}) {
  const { new: isNew } = await searchParams
  return <RolesScreen initialNew={isNew === '1'} />
}
