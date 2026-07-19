import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/toaster'
import { AuthProvider } from '@/components/auth/auth-provider'
import { OrgProvider } from '@/components/org/org-provider'
import { CopilotProvider } from '@/components/copilot/copilot-provider'
import { RecruiterCopilot } from '@/components/copilot/recruiter-copilot'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Resume Intelligence Platform | AI-Powered Career Insights',
  description: 'Transform your resume with AI-powered analysis. Get ATS compatibility scores, skill gap detection, and actionable career recommendations.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-[#FAFAFA]">
      <body className="font-sans antialiased bg-[#FAFAFA]">
        <AuthProvider>
          <OrgProvider>
            <CopilotProvider>
              {children}
              <RecruiterCopilot />
            </CopilotProvider>
          </OrgProvider>
          <Toaster />
        </AuthProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
