'use client'

import { SettingsSection, DeferredNote } from '../settings-ui'
import { Card } from '../../ui/card'
import { Badge } from '../../ui/badge'
import { ThemeToggle } from '../../theme/theme-toggle'
import { DensityToggle } from '../../theme/density-toggle'

/**
 * Preferences (UX Spec §10 · Design Bible §6.8) — hosts the theme + Density
 * controls (client-persisted, working today) and a read-only view of the
 * pipeline stages. Notifications and stage customization are honest deferred
 * states: no backend persistence exists yet, so no fake controls are shown.
 */
const PIPELINE_STAGES = [
  'Sourced',
  'Screening',
  'Shortlisted',
  'Interview',
  'Offer',
  'Hired',
  'Rejected',
] as const

export function PreferencesSection() {
  return (
    <SettingsSection title="Preferences" description="Personal display and workflow settings.">
      <div className="flex flex-col gap-6">
        <Card className="flex flex-col gap-4 p-4">
          <PrefRow label="Appearance" hint="Light, dark, or match your system.">
            <ThemeToggle />
          </PrefRow>
          <div className="border-t border-hl-border-subtle" />
          <PrefRow label="Density" hint="Comfortable spacing, or compact for large pipelines.">
            <DensityToggle />
          </PrefRow>
        </Card>

        <div className="flex flex-col gap-2">
          <h2 className="hl-h3">Notifications</h2>
          <DeferredNote title="Notification preferences are coming soon">
            Delivery channels and per-event controls arrive once the backend persists them — you
            won’t find placeholder switches here in the meantime.
          </DeferredNote>
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="hl-h3">Pipeline stages</h2>
          <p className="hl-small text-hl-fg-secondary">
            The stages used by every Role Workspace board.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {PIPELINE_STAGES.map((stage) => (
              <Badge key={stage} variant="outline">
                {stage}
              </Badge>
            ))}
          </div>
          <DeferredNote title="Custom stages are coming soon">
            Reordering and renaming stages needs backend support; today these are fixed for every
            workspace.
          </DeferredNote>
        </div>
      </div>
    </SettingsSection>
  )
}

function PrefRow({
  label,
  hint,
  children,
}: {
  label: string
  hint: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="hl-small font-medium text-hl-fg">{label}</p>
        <p className="hl-caption text-hl-fg-tertiary">{hint}</p>
      </div>
      {children}
    </div>
  )
}
