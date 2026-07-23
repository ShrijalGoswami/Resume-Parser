import { PageHeader } from '../shell/page-header'

function greetingWord(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

/**
 * Home greeting (UX Spec §6). A welcome moment — one of the reserved premium
 * places the editorial (Fraunces) voice appears — rendered through the shared
 * PageHeader. Renders only after the session resolves on the client, so the
 * time/date never causes an SSR hydration mismatch.
 */
export function Greeting({ name }: { name?: string | null }) {
  const firstName = name?.trim().split(/\s+/)[0]
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
  return (
    <PageHeader
      className="pt-6"
      eyebrow={today}
      title={`${greetingWord()}${firstName ? `, ${firstName}` : ''}.`}
    />
  )
}
