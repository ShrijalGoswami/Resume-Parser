import type { Metadata } from 'next'
import { AnalyticsScreen } from '@/components/hirelens/analytics/analytics-screen'

export const metadata: Metadata = { title: 'Reports' }

export default function Page() {
  return <AnalyticsScreen />
}
