import * as React from 'react'
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
        <div className="hl-body-medium text-hl-fg">HireLens</div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-[380px] py-10">{children}</div>
        </div>
        <p className="font-hl-mono text-[11px] tracking-wide text-hl-fg-tertiary">
          SOC 2 Type II · SSO · your data stays yours
        </p>
      </div>

      {/* Editorial world — Ink, fixed regardless of theme; hidden on small screens */}
      <div className="hidden lg:block lg:w-[55%]">
        <EditorialPanel />
      </div>
    </div>
  )
}
