'use client'

import Link from 'next/link'
import { GraduationCap } from 'lucide-react'
import { AppShell } from '../shell'
import { PageHeader } from '../shell/page-header'
import { useSession } from '../lib/api/use-session'
import { useProfile } from '../lib/api/hooks'
import { LoadingScreen } from '../states/loading'
import { Button } from '../ui/button'

const LEARNING_CRUMBS = [{ label: 'Learning' }]

function Notice({ title, showSignIn }: { title: string; showSignIn?: boolean }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-5 px-6 py-24 text-center">
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
        <Notice title="Sign-in isn’t configured" />
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
      {/* Was a `min-h-full … justify-center` block with `py-24`: the copy sat
          vertically centred in the whole canvas with no page header at all, so
          Learning was the one route that looked unfinished rather than
          deliberately deferred. It now uses the same shell, the same header and
          the same panel as every other route — the content is unchanged, and
          nothing here is estimated or invented. */}
      <div className="mx-auto flex w-full max-w-[1440px] flex-col px-6 pb-12 pt-6">
        <PageHeader
          title="Learning"
          description="What HireLens calibrates from your team’s real hiring outcomes."
        />
        <div className="hl-surface flex flex-col items-center gap-5 rounded-hl-lg border border-hl-border px-6 py-12 text-center">
          <span
            className="flex size-12 items-center justify-center rounded-hl-lg border border-hl-border-subtle text-hl-fg-tertiary"
            aria-hidden
          >
            <GraduationCap className="size-6" strokeWidth={1.6} />
          </span>
          <p className="hl-label-sm font-hl-mono text-hl-fg-tertiary">A future release</p>
          {/* `hl-h2`, not `hl-display-md`: this sits under the page title now,
              and a sub-heading cannot be larger than the heading above it. */}
          <h2 className="hl-h2 max-w-xl text-hl-fg">
            Calibrated to your outcomes — once they exist.
          </h2>
          <p className="hl-body max-w-lg text-hl-fg-secondary">
            Learning will show what HireLens calibrates from your team’s real hiring outcomes —
            quality-of-hire, ranking accuracy, and where the model adapts to your decisions.
          </p>
          <p className="hl-body max-w-lg text-hl-fg-tertiary">
            It depends on organizational hiring outcomes and post-decision feedback, which
            aren’t captured yet. When that platform capability lands, this surface becomes
            available — and nothing here is estimated until it does.
          </p>
        </div>
      </div>
    </AppShell>
  )
}
