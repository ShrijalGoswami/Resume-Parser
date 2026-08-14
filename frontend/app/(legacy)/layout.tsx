import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Toaster } from '@/components/ui/toaster'
import { AuthProvider } from '@/components/auth/auth-provider'
import { OrgProvider } from '@/components/org/org-provider'

// Loaded for their side effect (font preload), matching the original root layout.
const _geist = Geist({ subsets: ['latin'] })
const _geistMono = Geist_Mono({ subsets: ['latin'] })
void _geist
void _geistMono

export const metadata: Metadata = {
  title: 'Resume Intelligence Platform | AI-Powered Career Insights',
  description:
    'Transform your resume with AI-powered analysis. Get ATS compatibility scores, skill gap detection, and actionable career recommendations.',
  generator: 'v0.app',
}

export default function LegacyLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="font-sans antialiased bg-[#FAFAFA] min-h-screen">
      {/* The floating RecruiterCopilot and its provider were mounted here. They
          were only ever available on /insights, /reports and /agent, so removing
          those pages left the panel permanently hidden — `isRecruiterRoute` could
          no longer return true for any route. This group now serves only /login.
          The V4 Ask surface is the AI entry point. */}
      <AuthProvider>
        <OrgProvider>{children}</OrgProvider>
        <Toaster />
      </AuthProvider>
    </div>
  )
}
