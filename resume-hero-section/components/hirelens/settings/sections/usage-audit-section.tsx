'use client'

import { useOrgContext, useOrgUsage, useAuditLogs } from '../../lib/api/settings'
import { SettingsSection } from '../settings-ui'
import { PERMS, hasPerm } from '../permissions'
import { Card } from '../../ui/card'
import { DataTable, type DataTableColumn } from '../../ui/data-table'
import { Skeleton } from '../../ui/skeleton'
import { GateState } from '../../states/gate-state'
import { EmptyState } from '../../states/empty-state'
import { ErrorState } from '../../states/error-state'
import { relativeTime } from '../../lib/format'
import type { AuditLog } from '@/types/org'

/* Acronyms stay upper-case: the Resource column was rendering `ai` as "Ai". */
const CASING: Record<string, string> = { ai: 'AI', api: 'API', ats: 'ATS', sso: 'SSO', id: 'ID' }

function humanize(value: string) {
  return value
    .replace(/[._]/g, ' ')
    .replace(/\b\w+/g, (w) => CASING[w.toLowerCase()] ?? w.charAt(0).toUpperCase() + w.slice(1))
}

const auditColumns: DataTableColumn<AuditLog>[] = [
  {
    key: 'action',
    header: 'Action',
    sortValue: (row) => humanize(row.action),
    render: (row) => <span className="text-hl-fg">{humanize(row.action)}</span>,
  },
  {
    key: 'resource',
    header: 'Resource',
    sortValue: (row) => row.resource_type,
    render: (row) => <span className="text-hl-fg-secondary">{humanize(row.resource_type)}</span>,
  },
  {
    key: 'by',
    header: 'By',
    sortValue: (row) => row.user_email ?? null,
    render: (row) => <span className="text-hl-fg-secondary">{row.user_email ?? '—'}</span>,
  },
  {
    key: 'when',
    header: 'When',
    // Sort on the raw timestamp — the rendered value is a relative phrase.
    sortValue: (row) => (row.created_at ? Date.parse(row.created_at) : null),
    className: 'hl-caption whitespace-nowrap text-hl-fg-tertiary',
    render: (row) => relativeTime(row.created_at),
  },
]

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
        surface
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
          <p className="hl-metric-sm">{metric.value.toLocaleString()}</p>
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
        surface
        variant="zero-results"
        title="No audited changes yet"
        description="Administrative changes are recorded here as they happen."
      />
    )
  }
  return (
    <DataTable
      rows={rows}
      columns={auditColumns}
      getRowId={(row) => row.id}
      getSearchText={(row) => `${humanize(row.action)} ${row.resource_type} ${row.user_email ?? ''}`}
      searchPlaceholder="Search the audit log…"
      pageSize={10}
      initialSort={{ key: 'when', direction: 'desc' }}
      caption="Administrative changes"
    />
  )
}
