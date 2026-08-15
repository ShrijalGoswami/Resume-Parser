import type { Metadata } from 'next'
import { LedgerScreen } from '@/components/hirelens/ledger/ledger-screen'

export const metadata: Metadata = { title: 'AI Audit' }

export default function Page() {
  return <LedgerScreen />
}
