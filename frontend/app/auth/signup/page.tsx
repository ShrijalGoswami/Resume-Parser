import type { Metadata } from 'next'
import { AuthSplit } from '@/components/hirelens/auth/auth-split'
import { SignupForm } from '@/components/hirelens/auth/signup-form'

export const metadata: Metadata = { title: 'Create your account' }

export default function SignupPage() {
  return (
    <AuthSplit>
      <SignupForm />
    </AuthSplit>
  )
}
