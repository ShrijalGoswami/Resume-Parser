import type { Metadata } from 'next'
import { AuthSplit } from '@/components/hirelens/auth/auth-split'
import { ResetForm } from '@/components/hirelens/auth/reset-form'

export const metadata: Metadata = { title: 'Choose a new password' }

export default function ResetPasswordPage() {
  return (
    <AuthSplit>
      <ResetForm />
    </AuthSplit>
  )
}
