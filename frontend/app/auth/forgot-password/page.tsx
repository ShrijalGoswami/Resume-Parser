import type { Metadata } from 'next'
import { AuthSplit } from '@/components/hirelens/auth/auth-split'
import { ForgotForm } from '@/components/hirelens/auth/forgot-form'

export const metadata: Metadata = { title: 'Reset your password' }

export default function ForgotPasswordPage() {
  return (
    <AuthSplit>
      <ForgotForm />
    </AuthSplit>
  )
}
