import * as React from 'react'
import { Inbox, Sparkles, User } from 'lucide-react'

/**
 * The Ink editorial half of the auth split — the product world previewed at
 * sign-in, always Deep Ink regardless of theme (the form half stays Glass). A
 * faint Prism Aurora (sanctioned sign-in moment, Design Bible §4.4) sits behind
 * a representative "Decision Inbox" window; the AI card is marked by the Prism
 * left hairline + sparkle. Colors come from the theme-invariant `--hl-editorial-*`
 * tokens. Mirrors the RC-1 Definitive Login right panel.
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

      <div className="relative z-10 flex w-full max-w-[440px] flex-col items-center">
        {/* The panel's single serif moment */}
        <p className="hl-body italic text-hl-editorial-muted">This is what&rsquo;s waiting inside.</p>

        {/* Living Product Window — a representative Decision Inbox frame */}
        <div className="mt-8 w-full overflow-hidden rounded-hl-xl border border-hl-editorial-border bg-hl-editorial-surface p-5 text-left">
          {/* Window header */}
          <div className="flex items-center justify-between border-b border-hl-editorial-border pb-4">
            <div className="flex items-center gap-2 text-hl-editorial-fg">
              <Inbox className="size-[18px]" strokeWidth={1.8} aria-hidden />
              <span className="hl-body-medium">Decision Inbox</span>
            </div>
            <span className="font-hl-mono text-[11px] text-hl-editorial-muted">8:30 AM EST</span>
          </div>

          <p className="hl-body mt-5 text-hl-editorial-fg">Three decisions need you this morning.</p>

          <div className="mt-5 flex flex-col gap-3">
            {/* AI focus card — Prism left hairline marks AI presence */}
            <div className="relative overflow-hidden rounded-hl-lg border border-hl-editorial-border pl-4 pr-4 py-3.5">
              <span
                aria-hidden
                className="absolute inset-y-0 left-0 w-px"
                style={{
                  background:
                    'linear-gradient(180deg, var(--hl-prism-from), var(--hl-prism-mid), var(--hl-prism-to))',
                }}
              />
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 size-[18px] shrink-0 text-hl-prism-mid" aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="hl-body-medium text-hl-editorial-fg">Start focus run</span>
                    <span className="font-hl-mono text-[11px] text-hl-score-sharp">FIT 88</span>
                  </div>
                  <p className="hl-small mt-1 line-clamp-2 text-hl-editorial-muted">
                    Review top 3 engineering candidates for the Principal role. AI has summarized
                    technical assessments.
                  </p>
                </div>
              </div>
            </div>

            {/* Second decision — receded */}
            <div className="rounded-hl-lg border border-hl-editorial-border px-4 py-3.5 opacity-70">
              <div className="flex items-start gap-3">
                <User className="mt-0.5 size-[18px] shrink-0 text-hl-editorial-muted" aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="hl-body-medium text-hl-editorial-fg">Sarah Jenkins</span>
                    <span className="font-hl-mono text-[11px] text-hl-score-legible">FIT 65</span>
                  </div>
                  <p className="hl-small mt-1 text-hl-editorial-muted">
                    Pending your approval for final round interview scheduling.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Rotation indicator */}
        <div className="mt-6 flex items-center gap-1.5" aria-hidden>
          <span className="size-1.5 rounded-full bg-hl-editorial-fg" />
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="size-1.5 rounded-full bg-hl-editorial-border" />
          ))}
        </div>
      </div>
    </div>
  )
}
