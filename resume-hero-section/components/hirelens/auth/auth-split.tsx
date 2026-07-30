import * as React from 'react'
import Link from 'next/link'
import { EditorialPanel } from './editorial-panel'

/**
 * Split Editorial auth scaffold (frozen P2 design). Left: the calm Glass form
 * (theme-aware) with the wordmark and the restrained trust whisper. Right: the
 * Ink editorial world (§ EditorialPanel). Below `lg` the panel drops and the
 * form takes the full screen (Playbook §10).
 */
export function AuthSplit({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh w-full">
      {/* Form — Glass, theme-aware */}
      <div className="flex w-full flex-col bg-hl-canvas px-6 py-8 sm:px-10 lg:w-[45%] lg:px-16">
        {/* Wordmark — the auth surface's editorial brand mark (serif italic, per
            the RC-1 Definitive Login). */}
        {/* Inter, upright. This was the product's last serif — a Fraunces
            italic wordmark, which made the sign-in page introduce the product
            in a voice the product itself never uses again: the shell renders
            the same wordmark in Inter (`workspace-switcher`). One brand, one
            typeface. `hl-body-lg` rather than `text-lg` because the scale
            forbids arbitrary sizes in `.hl` surfaces. */}
        {/* The wordmark is the way back out of the funnel — it returns to the
            public landing page. `w-fit` matters: the parent is a flex column, so
            a bare anchor would stretch to the full 45% column and leave an
            invisible click target across the whole top of the form. The focus
            ring is inherited from the global `.hl :focus-visible` rule, and
            `prefetch` is left at the Next default so `/` is warmed on hover. */}
        <Link
          href="/"
          aria-label="Go to HireLens home"
          className="hl-body-lg w-fit cursor-pointer font-semibold tracking-tight text-hl-fg no-underline"
        >
          HireLens
        </Link>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-[380px] py-10">{children}</div>
        </div>
        <p className="hl-caption font-hl-mono tracking-wide text-hl-fg-tertiary">
          SOC 2 Type II · SSO · your data stays yours.
        </p>
      </div>

      {/* Editorial world — Ink, fixed regardless of theme; hidden on small screens */}
      <div className="hidden lg:block lg:w-[55%]">
        <EditorialPanel />
      </div>
    </div>
  )
}
