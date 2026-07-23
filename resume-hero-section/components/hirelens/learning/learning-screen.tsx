'use client'

import Link from 'next/link'
import { GraduationCap } from 'lucide-react'
import { AppShell } from '../shell'
import { useSession } from '../lib/api/use-session'
import { useProfile } from '../lib/api/hooks'
import { LoadingScreen } from '../states/loading'
import { Button } from '../ui/button'

const LEARNING_CRUMBS = [{ label: 'Learning' }]

function Notice({ title, showSignIn }: { title: string; showSignIn?: boolean }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-24 text-center">
      <h1 className="hl-display-md">{title}</h1>
      {showSignIn ? (
        <Button variant="primary" asChild>
          <Link href="/auth/login">Sign in</Link>
        </Button>
      ) : null}
    </div>
  )
}

/**
 * Learning — intentionally deferred. The Stitch "Calibration Loop" depends on
 * organizational hiring outcomes and post-decision feedback (quality-of-hire,
 * ranking accuracy, model adaptation) — a platform capability that does not yet
 * exist. Rather than imply HireLens is learning when it is not, this is a calm,
 * honest "not yet" state. The original Stitch design will be implemented
 * faithfully once a real calibration/outcome backend lands.
 */
export function LearningScreen() {
  const { session, loading, configured } = useSession()

  if (!configured) {
    return (
      <AppShell breadcrumbs={LEARNING_CRUMBS}>
        <Notice title="Sign-in isn't configured" />
      </AppShell>
    )
  }
  if (loading) {
    return (
      <AppShell breadcrumbs={LEARNING_CRUMBS}>
        <LoadingScreen />
      </AppShell>
    )
  }
  if (!session) {
    return (
      <AppShell breadcrumbs={LEARNING_CRUMBS}>
        <Notice title="Sign in to continue" showSignIn />
      </AppShell>
    )
  }
  return <DeferredLearning />
}

function DeferredLearning() {
  const profile = useProfile()
  const account = profile.data
    ? { name: profile.data.full_name ?? profile.data.email, email: profile.data.email }
    : undefined

  return (
    <AppShell breadcrumbs={LEARNING_CRUMBS} account={account}>
      <div className="mx-auto flex min-h-full w-full max-w-xl flex-col items-center justify-center gap-5 px-6 py-24 text-center">
        <span
          className="flex size-12 items-center justify-center rounded-hl-lg border border-hl-border-subtle text-hl-fg-tertiary"
          aria-hidden
        >
          <GraduationCap className="size-6" strokeWidth={1.6} />
        </span>
        <p className="font-hl-mono text-[11px] uppercase tracking-widest text-hl-fg-tertiary">
          Learning · A future release
        </p>
        <h1 className="hl-display-md text-hl-fg">Calibrated to your outcomes — once they exist.</h1>
        <p className="hl-body max-w-lg text-hl-fg-secondary">
          Learning will show what HireLens calibrates from your team&rsquo;s real hiring outcomes —
          quality-of-hire, ranking accuracy, and where the model adapts to your decisions.
        </p>
        <p className="hl-small max-w-lg text-hl-fg-tertiary">
          It depends on organizational hiring outcomes and post-decision feedback, which
          aren&rsquo;t captured yet. When that platform capability lands, this surface becomes
          available — and nothing here is estimated until it does.
        </p>
      </div>
    </AppShell>
  )
}
