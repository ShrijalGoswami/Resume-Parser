import Link from 'next/link'
import { FileQuestion } from 'lucide-react'
import { EmptyState } from '@/components/hirelens/states/empty-state'
import { Button } from '@/components/hirelens/ui/button'

/**
 * Route-level not-found boundary for the V4 product surface.
 *
 * The sibling `error.tsx` exists because an uncaught render error under
 * `(hirelens)` fell through to Next's default handler with no way back. A 404
 * had the same gap: `notFound()` had no boundary to land in, so the only reason
 * nothing looked broken was that nothing called it — Settings masked its
 * unmatched routes by rendering Profile instead.
 *
 * This is deliberately NOT an error state. A mistyped or stale URL is not a
 * fault to report, so it gets the neutral empty treatment and a way back rather
 * than a danger glyph and a "contact support" button.
 */
export default function HireLensNotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-hl-canvas px-6">
      <EmptyState
        icon={FileQuestion}
        title="This page doesn’t exist"
        description="The address may be mistyped, or the page may have been renamed or moved."
        action={
          <Button variant="primary" asChild>
            <Link href="/home">Back to Inbox</Link>
          </Button>
        }
      />
    </div>
  )
}
