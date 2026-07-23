'use client'

import { useOrgContext, useOrgUsage, useAuditLogs } from '../../lib/api/settings'
import { SettingsSection } from '../settings-ui'
import { PERMS, hasPerm } from '../permissions'
import { Card } from '../../ui/card'
import { Skeleton } from '../../ui/skeleton'
import { GateState } from '../../states/gate-state'
import { EmptyState } from '../../states/empty-state'
import { ErrorState } from '../../states/error-state'
import { relativeTime } from '../../lib/format'

function humanize(value: string) {
  return value.replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function UsageAuditSection() {
  const ctx = useOrgContext()
  const canUsage = hasPerm(ctx.data?.permissions, PERMS.USAGE_VIEW)
  const canAudit = hasPerm(ctx.data?.permissions, PERMS.AUDIT_VIEW)

  return (
    <SettingsSection
      title="Usage & audit"
      description="Organization usage counters and a log of every administrative change."
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h2 className="hl-h3">Usage</h2>
          {canUsage ? (
            <UsagePanel />
          ) : (
            <GateState reason="permission" title="You need usage access to view organization usage." />
          )}
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="hl-h3">Audit log</h2>
          {canAudit ? (
            <AuditPanel />
          ) : (
            <GateState reason="permission" title="You need audit access to view the audit log." />
          )}
        </div>
      </div>
    </SettingsSection>
  )
}

function UsagePanel() {
  const usage = useOrgUsage()
  if (usage.isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-20" />
        ))}
      </div>
    )
  }
  if (usage.isError) {
    return <ErrorState variant="inline" title="Couldn’t load usage" onRetry={() => usage.refetch()} />
  }
  const metrics = usage.data?.metrics ?? []
  if (metrics.length === 0) {
    return (
      <EmptyState
        variant="zero-results"
        title="No usage recorded yet"
        description="Counters appear as your team uses HireLens."
      />
    )
  }
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {metrics.map((metric) => (
        <Card key={`${metric.metric}-${metric.period}`} className="p-3">
          <p className="hl-caption text-hl-fg-tertiary">{humanize(metric.metric)}</p>
          <p className="hl-display-xl">{metric.value.toLocaleString()}</p>
          <p className="hl-caption text-hl-fg-tertiary">{metric.period}</p>
        </Card>
      ))}
    </div>
  )
}

function AuditPanel() {
  const logs = useAuditLogs()
  if (logs.isLoading) {
    return (
      <div className="flex flex-col gap-1.5">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-10" />
        ))}
      </div>
    )
  }
  if (logs.isError) {
    return <ErrorState variant="inline" title="Couldn’t load the audit log" onRetry={() => logs.refetch()} />
  }
  const rows = logs.data ?? []
  if (rows.length === 0) {
    return (
      <EmptyState
        variant="zero-results"
        title="No audited changes yet"
        description="Administrative changes are recorded here as they happen."
      />
    )
  }
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-hl-border-subtle">
              <th scope="col" className="hl-caption px-3 py-2 font-medium text-hl-fg-tertiary">
                Action
              </th>
              <th scope="col" className="hl-caption px-3 py-2 font-medium text-hl-fg-tertiary">
                Resource
              </th>
              <th scope="col" className="hl-caption px-3 py-2 font-medium text-hl-fg-tertiary">
                By
              </th>
              <th scope="col" className="hl-caption px-3 py-2 font-medium text-hl-fg-tertiary">
                When
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-hl-border-subtle last:border-0">
                <td className="hl-small px-3 py-2 text-hl-fg">{humanize(row.action)}</td>
                <td className="hl-small px-3 py-2 text-hl-fg-secondary">{row.resource_type}</td>
                <td className="hl-small px-3 py-2 text-hl-fg-secondary">{row.user_email ?? '—'}</td>
                <td className="hl-caption whitespace-nowrap px-3 py-2 text-hl-fg-tertiary">
                  {relativeTime(row.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
