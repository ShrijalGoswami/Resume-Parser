function greetingWord(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

/**
 * Home greeting (UX Spec §6). Renders only after the session resolves on the
 * client, so the time-based word never causes an SSR hydration mismatch.
 */
export function Greeting({ name }: { name?: string | null }) {
  const firstName = name?.trim().split(/\s+/)[0]
  return (
    <header className="pt-8">
      <h1 className="hl-h1">
        {greetingWord()}
        {firstName ? `, ${firstName}` : ''}.
      </h1>
    </header>
  )
}
