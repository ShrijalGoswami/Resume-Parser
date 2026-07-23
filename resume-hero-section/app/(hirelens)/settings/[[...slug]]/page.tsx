import type { Metadata } from 'next'
import { SettingsScreen } from '@/components/hirelens/settings/settings-screen'

export const metadata: Metadata = { title: 'Settings' }

export default async function Page({
  params,
}: {
  params: Promise<{ slug?: string[] }>
}) {
  const { slug } = await params
  const section = slug?.[0] ?? 'profile'
  return <SettingsScreen section={section} />
}
