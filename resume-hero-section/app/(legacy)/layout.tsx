import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Toaster } from '@/components/ui/toaster'
import { AuthProvider } from '@/components/auth/auth-provider'
import { OrgProvider } from '@/components/org/org-provider'
import { CopilotProvider } from '@/components/copilot/copilot-provider'
import { RecruiterCopilot } from '@/components/copilot/recruiter-copilot'

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
      <AuthProvider>
        <OrgProvider>
          <CopilotProvider>
            {children}
            <RecruiterCopilot />
          </CopilotProvider>
        </OrgProvider>
        <Toaster />
      </AuthProvider>
    </div>
  )
}
