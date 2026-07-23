import { Suspense } from 'react'
import type { Metadata } from 'next'
import { AuthSplit } from '@/components/hirelens/auth/auth-split'
import { LoginForm } from '@/components/hirelens/auth/login-form'

export const metadata: Metadata = { title: 'Sign in' }

export default function LoginPage() {
  return (
    <AuthSplit>
      {/* Suspense boundary required for useSearchParams (Next App Router). */}
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </AuthSplit>
  )
}
