'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AppShell } from '../shell'
import { useSession } from '../lib/api/use-session'
import { useProfile } from '../lib/api/hooks'
import { Button } from '../ui/button'
import { LoadingScreen } from '../states/loading'
import { cn } from '@/lib/utils'
import { ProfileSection } from './sections/profile-section'
import { PreferencesSection } from './sections/preferences-section'
import { MembersSection } from './sections/members-section'
import { WorkspacesSection } from './sections/workspaces-section'
import { BillingSection } from './sections/billing-section'
import { ApiKeysSection } from './sections/api-keys-section'
import { FeatureFlagsSection } from './sections/feature-flags-section'
import { IntegrationsSection } from './sections/integrations-section'
import { AiGatewaySection } from './sections/ai-gateway-section'
import { UsageAuditSection } from './sections/usage-audit-section'

interface SectionDef {
  id: string
  label: string
  group: 'Account' | 'Organization' | 'Platform'
  render: () => React.ReactNode
}

const SECTIONS: SectionDef[] = [
  { id: 'profile', label: 'Profile', group: 'Account', render: () => <ProfileSection /> },
  { id: 'preferences', label: 'Preferences', group: 'Account', render: () => <PreferencesSection /> },
  { id: 'members', label: 'Members & roles', group: 'Organization', render: () => <MembersSection /> },
  { id: 'workspaces', label: 'Workspaces', group: 'Organization', render: () => <WorkspacesSection /> },
  { id: 'billing', label: 'Billing & plan', group: 'Organization', render: () => <BillingSection /> },
  { id: 'api-keys', label: 'API keys', group: 'Organization', render: () => <ApiKeysSection /> },
  { id: 'feature-flags', label: 'Feature flags', group: 'Organization', render: () => <FeatureFlagsSection /> },
  { id: 'integrations', label: 'Integrations', group: 'Platform', render: () => <IntegrationsSection /> },
  { id: 'ai-gateway', label: 'AI Gateway', group: 'Platform', render: () => <AiGatewaySection /> },
  { id: 'usage', label: 'Usage & audit', group: 'Platform', render: () => <UsageAuditSection /> },
]

const GROUPS: Array<SectionDef['group']> = ['Account', 'Organization', 'Platform']

export const SETTINGS_SECTION_IDS = SECTIONS.map((section) => section.id)

export function SettingsScreen({ section }: { section: string }) {
  const { session, loading, configured } = useSession()

  if (!configured) {
    return (
      <AppShell title="Settings">
        <div className="hl-display p-12 text-center">Sign-in isn&rsquo;t configured</div>
      </AppShell>
    )
  }
  if (loading) {
    return (
      <AppShell title="Settings">
        <LoadingScreen />
      </AppShell>
    )
  }
  if (!session) {
    return (
      <AppShell title="Settings">
        <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-24 text-center">
          <h1 className="hl-display">Sign in to continue</h1>
          <Button variant="primary" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </AppShell>
    )
  }
  return <AuthedSettings section={section} />
}

function AuthedSettings({ section }: { section: string }) {
  const router = useRouter()
  const profile = useProfile()
  const account = profile.data
    ? { name: profile.data.full_name ?? profile.data.email, email: profile.data.email }
    : undefined

  const active = SECTIONS.find((item) => item.id === section) ?? SECTIONS[0]

  return (
    <AppShell title="Settings" account={account}>
      <div className="flex h-full">
        <aside className="hidden w-64 shrink-0 overflow-y-auto border-r border-hl-border-subtle p-3 lg:block">
          <nav aria-label="Settings sections" className="flex flex-col gap-4">
            {GROUPS.map((group) => (
              <div key={group} className="flex flex-col gap-0.5">
                <p className="hl-caption px-2 pb-1 text-hl-fg-tertiary">{group}</p>
                {SECTIONS.filter((item) => item.group === group).map((item) => (
                  <Link
                    key={item.id}
                    href={`/settings/${item.id}`}
                    aria-current={item.id === active.id ? 'page' : undefined}
                    className={cn(
                      'hl-small rounded-hl-md px-2 py-1.5 outline-none transition-colors',
                      item.id === active.id
                        ? 'bg-hl-accent-subtle text-hl-accent-fg'
                        : 'text-hl-fg-secondary hover:bg-hl-subtle hover:text-hl-fg',
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            ))}
          </nav>
        </aside>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="border-b border-hl-border-subtle p-3 lg:hidden">
            <label htmlFor="settings-section-select" className="sr-only">
              Settings section
            </label>
            <select
              id="settings-section-select"
              value={active.id}
              onChange={(event) => router.push(`/settings/${event.target.value}`)}
              className="hl-body h-[var(--hl-control-h-md)] w-full rounded-hl-md border border-hl-border bg-hl-canvas px-2 text-hl-fg outline-none focus-visible:border-hl-accent"
            >
              {GROUPS.map((group) => (
                <optgroup key={group} label={group}>
                  {SECTIONS.filter((item) => item.group === group).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="mx-auto max-w-[800px] px-4 py-6 lg:px-8">{active.render()}</div>
        </div>
      </div>
    </AppShell>
  )
}
