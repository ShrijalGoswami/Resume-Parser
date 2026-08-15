import type { Metadata } from 'next'
import { DecisionsScreen } from '@/components/hirelens/decisions/decisions-screen'

export const metadata: Metadata = { title: 'Decisions' }

export default function Page() {
  return <DecisionsScreen />
}
