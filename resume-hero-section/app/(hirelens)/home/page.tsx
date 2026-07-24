import type { Metadata } from 'next'
import { InboxScreen } from '@/components/hirelens/inbox'

export const metadata: Metadata = { title: 'Inbox' }

export default function Page() {
  return <InboxScreen />
}
