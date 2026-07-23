/**
 * The Ink editorial half of the auth split — the marketing world continued,
 * always Deep Ink regardless of theme (the form half stays Glass). A faint
 * Prism Aurora (sanctioned sign-in moment, Design Bible §4.4) sits behind a
 * representative Living Product Window frame, marked as AI by the Prism top
 * hairline. Colors come from the theme-invariant `--hl-editorial-*` tokens.
 */
export function EditorialPanel() {
  return (
    <div className="relative flex h-full flex-col items-center justify-center overflow-hidden bg-hl-editorial px-12">
      {/* Aurora — sanctioned sign-in bloom, ~7% */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(55% 45% at 62% 38%, var(--hl-prism-from), transparent 70%)',
          opacity: 0.07,
        }}
      />

      <div className="relative z-10 flex w-full max-w-[440px] flex-col items-center text-center">
        {/* The panel's single serif moment */}
        <p className="hl-display-lg text-hl-editorial-fg">Bring every hire into focus.</p>

        {/* Living Product Window (representative frame) */}
        <div className="mt-10 w-full overflow-hidden rounded-hl-lg border border-hl-editorial-border bg-hl-editorial-surface text-left">
          {/* Prism hairline = AI is present */}
          <div
            className="h-px w-full"
            style={{
              background:
                'linear-gradient(90deg, var(--hl-prism-from), var(--hl-prism-mid), var(--hl-prism-to))',
            }}
          />
          <div className="p-4">
            <p className="font-hl-mono text-[11px] uppercase tracking-wide text-hl-editorial-muted">
              Decision Inbox
            </p>
            <p className="hl-body mt-2 text-hl-editorial-fg">
              Three decisions need you this morning.
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <div className="h-8 rounded-hl-md border border-hl-editorial-border bg-hl-editorial-surface" />
              <div className="h-8 rounded-hl-md border border-hl-editorial-border bg-hl-editorial-surface" />
            </div>
          </div>
        </div>

        {/* Rotation indicator */}
        <div className="mt-5 flex items-center gap-1.5" aria-hidden>
          <span className="size-1.5 rounded-full bg-hl-editorial-fg" />
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="size-1.5 rounded-full bg-hl-editorial-border" />
          ))}
        </div>

        <p className="hl-small mt-6 text-hl-editorial-muted">This is what&rsquo;s waiting inside.</p>
      </div>
    </div>
  )
}
