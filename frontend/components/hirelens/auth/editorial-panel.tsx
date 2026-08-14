import * as React from 'react'

/**
 * The Ink editorial half of the auth split — always Deep Ink regardless of
 * theme, while the form half stays theme-aware.
 *
 * WHAT THIS USED TO BE, AND WHY IT ISN'T.
 * A "Living Product Window": a mock Decision Inbox behind a Prism Aurora, with
 * a sparkle-marked AI card. Three things were wrong with it under V2.
 *
 * The aurora, the prism hairline and the sparkle are the exact vocabulary V2
 * bans — a violet→cyan gradient, a decorative glow, and the sparkle icon that
 * every AI product in the category uses. On the one screen where someone
 * decides whether to trust us with an email and a password, that vocabulary
 * says "another AI wrapper" rather than "the tool that shows its evidence".
 *
 * And the window was populated with people who do not exist — "Sarah Jenkins",
 * "FIT 88", "Three decisions need you this morning". The standing rule for this
 * product is that it does not invent candidates or scores. A screenshot of
 * fabricated candidates is a strange promise to open with, and the reader has
 * no way to tell it from the real thing until they are inside.
 *
 * What replaces it is the claim itself, set plainly: what HireLens does, in the
 * product's own voice, with a copper rule as the only mark on the panel —
 * copper being the colour this product uses for evidence.
 */
export function EditorialPanel() {
  return (
    <div className="relative flex h-full flex-col justify-center overflow-hidden bg-hl-editorial px-16">
      <div className="relative z-10 flex w-full max-w-[460px] flex-col">
        <p className="hl-label text-hl-editorial-muted">
          Résumé intelligence
        </p>

        <p className="hl-display-md hl-serif mt-6 text-hl-editorial-fg">
          Every claim, traced back to the résumé it came from.
        </p>

        {/* The single mark on this panel. Copper is the product's evidence
            colour, so a copper rule beside a statement about evidence is the
            one place it belongs — not decoration, the same rule the candidate
            screens draw beside a quoted line. */}
        <div className="mt-8 flex flex-col gap-4 border-l-2 border-[var(--hl-accent-secondary)] pl-5">
          <p className="hl-body text-hl-editorial-muted">
            HireLens reads each résumé against the role you actually wrote, then shows the lines it
            scored — so a ranking is something you can check rather than something you accept.
          </p>
          <p className="hl-body text-hl-editorial-muted">
            Where it isn’t sure, it says so.
          </p>
        </div>
      </div>
    </div>
  )
}
