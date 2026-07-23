'use client'

import * as React from 'react'
import { Plus, Trash2, Plug } from 'lucide-react'
import {
  useProviders,
  useConnections,
  useAutomationRules,
  useIntegrationEvents,
  useConnectProvider,
  useDisconnectProvider,
  useTestProvider,
  useCreateRule,
  useUpdateRule,
  useDeleteRule,
} from '../../lib/api/integrations'
import { useOrgContext } from '../../lib/api/settings'
import { SettingsSection, Field, NativeSelect } from '../settings-ui'
import { TypedConfirmDialog } from '../typed-confirm-dialog'
import { PERMS, hasPerm } from '../permissions'
import { Card } from '../../ui/card'
import { Badge, type BadgeProps } from '../../ui/badge'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Switch } from '../../ui/switch'
import { Skeleton } from '../../ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../ui/dialog'
import { EmptyState } from '../../states/empty-state'
import { ErrorState } from '../../states/error-state'
import { toast } from '../../ui/use-toast'
import type { AutomationRule, Connection, ProviderInfo } from '@/types/integration'

const HEALTH_TONE: Record<string, BadgeProps['variant']> = {
  connected: 'success',
  healthy: 'success',
  degraded: 'warning',
  error: 'danger',
  disconnected: 'neutral',
}

function humanize(value: string) {
  return value.replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function IntegrationsSection() {
  const ctx = useOrgContext()
  const canManage = hasPerm(ctx.data?.permissions, PERMS.INTEGRATION_MANAGE)
  const providers = useProviders()
  const connections = useConnections()

  const connectionByProvider = React.useMemo(() => {
    const map = new Map<string, Connection>()
    for (const connection of connections.data ?? []) map.set(connection.provider, connection)
    return map
  }, [connections.data])

  return (
    <SettingsSection
      title="Integrations"
      description="Connect email, calendar, messaging, ATS, and webhooks, then automate with rules."
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h2 className="hl-h3">Providers</h2>
          {providers.isLoading || connections.isLoading ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {[0, 1, 2, 3].map((index) => (
                <Skeleton key={index} className="h-20" />
              ))}
            </div>
          ) : providers.isError ? (
            <ErrorState
              variant="inline"
              title="Couldn’t load providers"
              onRetry={() => providers.refetch()}
            />
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {(providers.data ?? []).map((provider) => (
                <ProviderCard
                  key={provider.name}
                  provider={provider}
                  connection={connectionByProvider.get(provider.name)}
                  canManage={canManage}
                />
              ))}
            </div>
          )}
        </div>

        <AutomationRules canManage={canManage} />
      </div>
    </SettingsSection>
  )
}

function ProviderCard({
  provider,
  connection,
  canManage,
}: {
  provider: ProviderInfo
  connection?: Connection
  canManage: boolean
}) {
  const connect = useConnectProvider()
  const disconnect = useDisconnectProvider()
  const test = useTestProvider()
  const connected = connection?.status === 'connected' || Boolean(connection && connection.status !== 'disconnected')

  const onConnect = () => {
    connect.mutate(
      { provider: provider.name, redirectUri: `${window.location.origin}/settings/integrations` },
      {
        onSuccess: (result) => {
          if (result.authorize_url) {
            window.location.href = result.authorize_url
          } else {
            toast({ variant: 'success', title: `${provider.display_name} connected` })
          }
        },
        onError: (error) =>
          toast({ variant: 'danger', title: error instanceof Error ? error.message : 'Connect failed' }),
      },
    )
  }

  return (
    <Card className="flex flex-col gap-2 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="hl-small font-medium text-hl-fg">{provider.display_name}</p>
          <p className="hl-caption capitalize text-hl-fg-tertiary">{provider.category}</p>
        </div>
        {connection ? (
          <Badge variant={HEALTH_TONE[connection.health] ?? HEALTH_TONE[connection.status] ?? 'neutral'} className="capitalize">
            {connection.health || connection.status}
          </Badge>
        ) : (
          <Badge variant="neutral">Not connected</Badge>
        )}
      </div>
      {canManage ? (
        <div className="flex flex-wrap gap-1.5">
          {connected ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                loading={test.isPending}
                onClick={() =>
                  test.mutate(provider.name, {
                    onSuccess: (result) =>
                      toast({
                        variant: result.ok ? 'success' : 'warning',
                        title: result.detail || (result.ok ? 'Connection healthy' : 'Test failed'),
                      }),
                    onError: (error) =>
                      toast({
                        variant: 'danger',
                        title: error instanceof Error ? error.message : 'Test failed',
                      }),
                  })
                }
              >
                Test
              </Button>
              <Button
                variant="ghost"
                size="sm"
                loading={disconnect.isPending}
                onClick={() =>
                  disconnect.mutate(provider.name, {
                    onSuccess: () =>
                      toast({ variant: 'info', title: `${provider.display_name} disconnected` }),
                    onError: (error) =>
                      toast({
                        variant: 'danger',
                        title: error instanceof Error ? error.message : 'Disconnect failed',
                      }),
                  })
                }
              >
                Disconnect
              </Button>
            </>
          ) : (
            <Button variant="secondary" size="sm" loading={connect.isPending} onClick={onConnect}>
              <Plug /> Connect
            </Button>
          )}
        </div>
      ) : null}
    </Card>
  )
}

function AutomationRules({ canManage }: { canManage: boolean }) {
  const rules = useAutomationRules()
  const update = useUpdateRule()
  const [createOpen, setCreateOpen] = React.useState(false)
  const [deleteTarget, setDeleteTarget] = React.useState<AutomationRule | null>(null)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="hl-h3">Automation rules</h2>
        {canManage ? (
          <Button variant="secondary" size="sm" onClick={() => setCreateOpen(true)}>
            <Plus /> New rule
          </Button>
        ) : null}
      </div>

      {rules.isLoading ? (
        <div className="flex flex-col gap-2">
          {[0, 1].map((index) => (
            <Skeleton key={index} className="h-14" />
          ))}
        </div>
      ) : rules.isError ? (
        <ErrorState variant="inline" title="Couldn’t load rules" onRetry={() => rules.refetch()} />
      ) : (rules.data ?? []).length === 0 ? (
        <EmptyState
          icon={Plug}
          title="No automation rules yet"
          description="Trigger actions across your connected tools when hiring events happen."
        />
      ) : (
        <Card className="divide-y divide-hl-border-subtle">
          {(rules.data ?? []).map((rule) => (
            <div key={rule.id} className="flex flex-wrap items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="hl-small font-medium text-hl-fg">{rule.name}</p>
                <p className="hl-caption text-hl-fg-tertiary">
                  On {humanize(rule.trigger_event)} · {rule.steps.length}{' '}
                  {rule.steps.length === 1 ? 'step' : 'steps'}
                </p>
              </div>
              <Switch
                checked={rule.enabled}
                aria-label={`Enable ${rule.name}`}
                disabled={!canManage}
                onCheckedChange={(next) =>
                  update.mutate(
                    { id: rule.id, patch: { enabled: next } },
                    {
                      onError: (error) =>
                        toast({
                          variant: 'danger',
                          title: error instanceof Error ? error.message : 'Update failed',
                        }),
                    },
                  )
                }
              />
              {canManage ? (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete ${rule.name}`}
                  onClick={() => setDeleteTarget(rule)}
                >
                  <Trash2 />
                </Button>
              ) : null}
            </div>
          ))}
        </Card>
      )}

      <CreateRuleDialog open={createOpen} onOpenChange={setCreateOpen} />

      <DeleteRuleDialog target={deleteTarget} onDone={() => setDeleteTarget(null)} />
    </div>
  )
}

function CreateRuleDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const events = useIntegrationEvents()
  const providers = useProviders()
  const create = useCreateRule()

  const [name, setName] = React.useState('')
  const [triggerEvent, setTriggerEvent] = React.useState('')
  const [providerName, setProviderName] = React.useState('')
  const [action, setAction] = React.useState('')

  const eventList = events.data ?? []
  const providerList = providers.data ?? []
  const actionList = providerList.find((provider) => provider.name === providerName)?.actions ?? []

  const effectiveEvent = triggerEvent || eventList[0] || ''
  const effectiveProvider = providerName || providerList[0]?.name || ''
  const effectiveActionList =
    providerList.find((provider) => provider.name === effectiveProvider)?.actions ?? actionList
  const effectiveAction = action || effectiveActionList[0] || ''

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setName('')
      setTriggerEvent('')
      setProviderName('')
      setAction('')
    }
    onOpenChange(next)
  }

  const submit = () => {
    create.mutate(
      {
        name: name.trim(),
        triggerEvent: effectiveEvent,
        steps: [{ action: effectiveAction, provider: effectiveProvider, params: {} }],
      },
      {
        onSuccess: () => {
          toast({ variant: 'success', title: `Created ${name.trim()}` })
          handleOpenChange(false)
        },
        onError: (error) =>
          toast({ variant: 'danger', title: error instanceof Error ? error.message : 'Create failed' }),
      },
    )
  }

  const ready = Boolean(name.trim() && effectiveEvent && effectiveProvider && effectiveAction)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>New automation rule</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <Field label="Name" htmlFor="rule-name">
            <Input
              id="rule-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Notify Slack on offer"
            />
          </Field>
          <Field label="When this happens" htmlFor="rule-event">
            <NativeSelect
              id="rule-event"
              value={effectiveEvent}
              onChange={(event) => setTriggerEvent(event.target.value)}
            >
              {eventList.map((value) => (
                <option key={value} value={value}>
                  {humanize(value)}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Do this via" htmlFor="rule-provider">
              <NativeSelect
                id="rule-provider"
                value={effectiveProvider}
                onChange={(event) => {
                  setProviderName(event.target.value)
                  setAction('')
                }}
              >
                {providerList.map((provider) => (
                  <option key={provider.name} value={provider.name}>
                    {provider.display_name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Action" htmlFor="rule-action">
              <NativeSelect
                id="rule-action"
                value={effectiveAction}
                onChange={(event) => setAction(event.target.value)}
              >
                {effectiveActionList.map((value) => (
                  <option key={value} value={value}>
                    {humanize(value)}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={submit}
            loading={create.isPending}
            disabled={!ready}
          >
            Create rule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DeleteRuleDialog({
  target,
  onDone,
}: {
  target: AutomationRule | null
  onDone: () => void
}) {
  const remove = useDeleteRule()
  return (
    <TypedConfirmDialog
      open={target !== null}
      onOpenChange={(open) => {
        if (!open) onDone()
      }}
      title="Delete automation rule"
      description={
        <>
          This permanently deletes <span className="text-hl-fg">{target?.name}</span>. Any runs it
          would have triggered will stop.
        </>
      }
      confirmWord={target?.name ?? 'delete'}
      confirmLabel="Delete rule"
      busy={remove.isPending}
      onConfirm={() => {
        if (!target) return
        remove.mutate(target.id, {
          onSuccess: () => {
            toast({ variant: 'info', title: `Deleted ${target.name}` })
            onDone()
          },
          onError: (error) =>
            toast({ variant: 'danger', title: error instanceof Error ? error.message : 'Delete failed' }),
        })
      }}
    />
  )
}
