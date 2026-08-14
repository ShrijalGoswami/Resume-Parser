/** Skip-to-content link (Design Bible §IX) — first focusable element. */
export function SkipLink({ targetId = 'hl-main' }: { targetId?: string }) {
  return (
    <a
      href={`#${targetId}`}
      className="hl-body-medium sr-only left-4 top-4 z-[var(--hl-z-tooltip)] rounded-hl-md bg-hl-accent px-3 py-2 text-white focus:not-sr-only focus:absolute focus:outline-none"
    >
      Skip to content
    </a>
  )
}
