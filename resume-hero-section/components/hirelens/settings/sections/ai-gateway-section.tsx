'use client'

import * as React from 'react'
import { ShieldCheck } from 'lucide-react'
import { useAiConfig, useAiUsage, useAiHealth, useSwitchProvider } from '../../lib/api/ai-gateway'
import { useOrgContext } from '../../lib/api/settings'
import { SettingsSection, Field, NativeSelect, DeferredNote } from '../settings-ui'
import { PERMS, hasPerm } from '../permissions'
import { Card } from '../../ui/card'
import { Badge, type BadgeProps } from '../../ui/badge'
import { Button } from '../../ui/button'
import { Skeleton } from '../../ui/skeleton'
import { ErrorState } from '../../states/error-state'
import { toast } from '../../ui/use-toast'
import type { AiConfig } from '@/types/ai-gateway'

const HEALTH_TONE: Record<string, BadgeProps['variant']> = {
  healthy: 'success',
  rate_limited: 'warning',
  temporary_failure: 'warning',
  unavailable: 'danger',
  disabled: 'neutral',
}

function humanize(value: string) {
  return value.replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function AiGatewaySection() {
  const ctx = useOrgContext()
  const config = useAiConfig()
  const canSwitch = hasPerm(ctx.data?.permissions, PERMS.ORG_MANAGE)

  return (
    <SettingsSection
      title="AI Gateway"
      description="The active AI provider, per-role models, live health, and usage."
    >
      {config.isLoading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-24" />
          ))}
        </div>
      ) : config.isError || !config.data ? (
        <ErrorState
          variant="inline"
          title="Couldn’t load the gateway"
          onRetry={() => config.refetch()}
        />
      ) : (
        <div className="flex flex-col gap-6">
          <ActiveProvider config={config.data} canSwitch={canSwitch} />
          <Providers config={config.data} />
          <PerRoleModels config={config.data} />
          <UsagePanel />
          <HealthPanel />
          <DeferredNote title="Live gateway state is in-memory">
            The active-provider override, health, and usage counters are process-local and reset when
            the server restarts. Per-role models are resolved from provider defaults and aren’t
            editable here yet.
          </DeferredNote>
        </div>
      )}
    </SettingsSection>
  )
}

function UsagePanel() {
  const usage = useAiUsage()
  if (usage.isLoading) return <Skeleton className="h-24" />
  if (usage.isError || !usage.data) {
    return <ErrorState variant="inline" title="Couldn’t load usage" onRetry={() => usage.refetch()} />
  }
  const data = usage.data
  const tiles: Array<[string, string]> = [
    ['Requests', data.total_requests.toLocaleString()],
    ['Provider calls', data.total_provider_calls.toLocaleString()],
    ['Tokens', data.total_tokens.toLocaleString()],
    ['Est. cost', `$${data.total_estimated_cost_usd.toFixed(4)}`],
    ['Retries', data.total_retries.toLocaleString()],
    ['Fallbacks', data.total_fallbacks.toLocaleString()],
  ]
  const providers = Object.entries(data.by_provider)
  const maxRequests = Math.max(1, ...providers.map(([, counter]) => counter.requests ?? 0))
  return (
    <div className="flex flex-col gap-3">
      <h2 className="hl-h3">Usage</h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {tiles.map(([label, value]) => (
          <Card key={label} className="p-3">
            <p className="hl-caption text-hl-fg-tertiary">{label}</p>
            <p className="hl-h2">{value}</p>
          </Card>
        ))}
      </div>
      {providers.length > 0 ? (
        <Card className="flex flex-col gap-2 p-4">
          <p className="hl-small font-medium text-hl-fg">By provider</p>
          {providers.map(([name, counter]) => {
            const requests = counter.requests ?? 0
            return (
              <div key={name} className="flex items-center gap-3">
                <span className="hl-caption w-20 shrink-0 truncate capitalize text-hl-fg-secondary">
                  {name}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-hl-muted">
                  <div
                    className="h-full rounded-full bg-hl-accent"
                    style={{ width: `${(requests / maxRequests) * 100}%` }}
                  />
                </div>
                <span className="hl-caption w-24 shrink-0 text-right text-hl-fg-tertiary">
                  {requests.toLocaleString()} · {(counter.prompt_tokens ?? 0) + (counter.completion_tokens ?? 0)} tok
                </span>
              </div>
            )
          })}
        </Card>
      ) : null}
    </div>
  )
}

function HealthPanel() {
  const health = useAiHealth()
  if (health.isLoading) return <Skeleton className="h-20" />
  if (health.isError || !health.data) return null
  const providers = Object.entries(health.data.providers)
  return (
    <div className="flex flex-col gap-2">
      <h2 className="hl-h3">Health</h2>
      <Card className="flex flex-col gap-2 p-4">
        {providers.map(([name, entry]) => (
          <div key={name} className="flex items-center justify-between gap-2">
            <span className="hl-small capitalize text-hl-fg">{name}</span>
            <div className="flex items-center gap-2">
              {entry.cooldown_remaining_s > 0 ? (
                <span className="hl-caption text-hl-fg-tertiary">
                  {entry.cooldown_remaining_s}s cooldown
                </span>
              ) : null}
              <Badge variant={HEALTH_TONE[entry.state] ?? 'neutral'}>{humanize(entry.state)}</Badge>
            </div>
          </div>
        ))}
        <p className="hl-caption text-hl-fg-tertiary">
          {health.data.fallbacks.total} fallback{health.data.fallbacks.total === 1 ? '' : 's'} since
          start
        </p>
      </Card>
    </div>
  )
}

function ActiveProvider({ config, canSwitch }: { config: AiConfig; canSwitch: boolean }) {
  const switchProvider = useSwitchProvider()
  const [selected, setSelected] = React.useState<string | null>(null)
  const value = selected ?? config.active_provider
  const changed = value !== config.active_provider

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="hl-caption text-hl-fg-tertiary">Active provider</span>
        <span className="hl-h3 capitalize">{config.active_provider}</span>
        {config.override_active ? <Badge variant="info">Override</Badge> : null}
        {config.fallback_enabled ? (
          <Badge variant="neutral">Fallback: {config.fallback_chain.join(' → ') || 'none'}</Badge>
        ) : (
          <Badge variant="warning">Fallback off</Badge>
        )}
      </div>

      {canSwitch ? (
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Switch provider" htmlFor="ai-provider">
            <NativeSelect
              id="ai-provider"
              value={value}
              onChange={(event) => setSelected(event.target.value)}
            >
              {config.providers.map((provider) => (
                <option key={provider.name} value={provider.name} disabled={!provider.key_configured}>
                  {provider.display_name}
                  {provider.key_configured ? '' : ' (no key)'}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Button
            variant="primary"
            size="sm"
            disabled={!changed}
            loading={switchProvider.isPending}
            onClick={() =>
              switchProvider.mutate(value, {
                onSuccess: () => {
                  toast({ variant: 'success', title: `Switched to ${value}` })
                  setSelected(null)
                },
                onError: (error) =>
                  toast({
                    variant: 'danger',
                    title: error instanceof Error ? error.message : 'Switch failed',
                  }),
              })
            }
          >
            Apply
          </Button>
        </div>
      ) : (
        <p className="hl-caption flex items-center gap-1.5 text-hl-fg-tertiary">
          <ShieldCheck className="size-3.5" aria-hidden /> Only an org admin can change the provider.
          Every switch is audited.
        </p>
      )}
    </Card>
  )
}

function Providers({ config }: { config: AiConfig }) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="hl-h3">Providers</h2>
      <Card className="divide-y divide-hl-border-subtle">
        {config.providers.map((provider) => {
          const state = config.provider_health[provider.name]?.state ?? provider.health
          return (
            <div key={provider.name} className="flex flex-wrap items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="hl-small font-medium text-hl-fg">{provider.display_name}</p>
                <p className="hl-caption text-hl-fg-tertiary">
                  {provider.capabilities.length} capabilities · {provider.context_window.toLocaleString()} ctx
                </p>
              </div>
              <Badge variant={provider.key_configured ? 'success' : 'neutral'}>
                {provider.key_configured ? 'Key set' : 'No key'}
              </Badge>
              <Badge variant={HEALTH_TONE[state] ?? 'neutral'}>{humanize(state)}</Badge>
            </div>
          )
        })}
      </Card>
    </div>
  )
}

function PerRoleModels({ config }: { config: AiConfig }) {
  const roles = Object.entries(config.roles)
  if (roles.length === 0) return null
  return (
    <div className="flex flex-col gap-2">
      <h2 className="hl-h3">Models by role</h2>
      <Card className="divide-y divide-hl-border-subtle">
        {roles.map(([role, selection]) => (
          <div key={role} className="flex flex-wrap items-center justify-between gap-2 p-3">
            <span className="hl-small text-hl-fg">{humanize(role)}</span>
            <span className="hl-caption text-hl-fg-secondary">
              <span className="capitalize">{selection.provider}</span> · {selection.model}
            </span>
          </div>
        ))}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3">
          <span className="hl-small text-hl-fg">Embeddings</span>
          <span className="hl-caption text-hl-fg-secondary">
            <span className="capitalize">{config.embeddings.provider}</span> · {config.embeddings.model}
          </span>
        </div>
      </Card>
    </div>
  )
}
