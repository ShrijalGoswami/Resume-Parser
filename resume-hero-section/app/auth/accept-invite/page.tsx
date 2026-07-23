import type { Metadata } from 'next'
import { AuthSplit } from '@/components/hirelens/auth/auth-split'
import { AcceptInviteForm } from '@/components/hirelens/auth/accept-form'

export const metadata: Metadata = { title: 'Accept your invite' }

export default function AcceptInvitePage() {
  return (
    <AuthSplit>
      <AcceptInviteForm />
    </AuthSplit>
  )
}
