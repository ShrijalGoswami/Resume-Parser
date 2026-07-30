'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Search, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AppShell } from '../shell'
import { PageHeader } from '../shell/page-header'
import { useSession } from '../lib/api/use-session'
import { useProfile } from '../lib/api/hooks'
import { useRoles } from '../lib/api/workspace'
import { LoadingScreen } from '../states/loading'
import { EmptyState } from '../states/empty-state'
import { ErrorState } from '../states/error-state'
import { PERMS, hasPerm } from '../settings/permissions'
import { useOrgContext } from '../lib/api/settings'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { RoleFormDialog } from './role-form-dialog'
import type { Campaign, CampaignStatus } from '@/types/campaign'

const ROLES_CRUMBS = [{ label: 'Roles' }]
const FILTERS: Array<{ value: 'all' | CampaignStatus; label: string }> = [
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'draft', label: 'Draft' },
  { value: 'archived', label: 'Archived' },
  { value: 'all', label: 'All' },
]

const STATUS_TONE: Record<CampaignStatus, string> = {
  active: 'text-hl-success',
  paused: 'text-hl-score-soft',
  draft: 'text-hl-fg-tertiary',
  archived: 'text-hl-fg-tertiary',
}

function Notice({ title, showSignIn }: { title: string; showSignIn?: boolean }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-5 px-6 py-24 text-center">
      <h1 className="hl-display-md">{title}</h1>
      {showSignIn ? (
        <Button variant="primary" asChild>
          <Link href="/auth/login">Sign in</Link>
        </Button>
      ) : null}
    </div>
  )
}

function RoleCard({ role }: { role: Campaign }) {
  const count = role.total_candidates ?? role.candidate_count ?? 0
  const subtitle = [role.company, role.role_title].filter(Boolean).join(' · ')
  return (
    <Link
      href={`/roles/${role.id}`}
      className="flex flex-col gap-3 rounded-hl-xl border border-hl-border-subtle bg-hl-canvas p-5 outline-none transition-colors hover:border-hl-border hover:bg-hl-subtle"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="hl-body-medium min-w-0 truncate text-hl-fg">{role.title}</span>
        <span
          className={cn('shrink-0 hl-label-sm font-hl-mono', STATUS_TONE[role.status])}
        >
          {role.status}
        </span>
      </div>
      {subtitle ? <span className="hl-small truncate text-hl-fg-secondary">{subtitle}</span> : null}
      <span className="mt-1 flex items-center gap-1.5 hl-caption font-hl-mono tabular-nums text-hl-fg-tertiary">
        <Users className="size-3.5" aria-hidden />
        {count} candidate{count === 1 ? '' : 's'}
      </span>
    </Link>
  )
}

export function RolesScreen({ initialNew = false }: { initialNew?: boolean }) {
  const { session, loading, configured } = useSession()

  if (!configured) {
    return (
      <AppShell breadcrumbs={ROLES_CRUMBS}>
        <Notice title="Sign-in isn't configured" />
      </AppShell>
    )
  }
  if (loading) {
    return (
      <AppShell breadcrumbs={ROLES_CRUMBS}>
        <LoadingScreen />
      </AppShell>
    )
  }
  if (!session) {
    return (
      <AppShell breadcrumbs={ROLES_CRUMBS}>
        <Notice title="Sign in to continue" showSignIn />
      </AppShell>
    )
  }
  return <AuthedRoles initialNew={initialNew} />
}

function AuthedRoles({ initialNew }: { initialNew: boolean }) {
  const router = useRouter()
  const profile = useProfile()
  const roles = useRoles()

  const ctx = useOrgContext()
  const canManage = hasPerm(ctx.data?.permissions, PERMS.CAMPAIGN_MANAGE)
  const [createOpen, setCreateOpen] = React.useState(initialNew)
  const [status, setStatus] = React.useState<'all' | CampaignStatus>('active')
  const [search, setSearch] = React.useState('')

  const account = profile.data
    ? { name: profile.data.full_name ?? profile.data.email, email: profile.data.email }
    : undefined

  const filtered = React.useMemo(() => {
    const query = search.trim().toLowerCase()
    return (roles.data ?? [])
      .filter((r) => status === 'all' || r.status === status)
      .filter((r) => !query || `${r.title} ${r.company ?? ''} ${r.role_title ?? ''}`.toLowerCase().includes(query))
  }, [roles.data, status, search])

  const total = roles.data?.length ?? 0

  let body: React.ReactNode
  if (roles.isLoading) {
    body = <LoadingScreen label="Loading roles" />
  } else if (roles.isError) {
    body = <ErrorState variant="route" title="Couldn't load roles" onRetry={() => roles.refetch()} />
  } else if (total === 0) {
    body = (
      <EmptyState
        surface
        variant="first-run"
        icon={Plus}
        title={canManage ? 'Create your first role' : 'No roles yet'}
        description={
          canManage
            ? 'A role holds one job description and the candidates ranked against it.'
            : 'Roles will appear here once someone on your team creates one. Your role does not include creating roles.'
        }
        action={
          canManage ? (
            <Button variant="primary" onClick={() => setCreateOpen(true)}>
              <Plus /> New role
            </Button>
          ) : null
        }
      />
    )
  } else if (filtered.length === 0) {
    body = (
      <EmptyState
        surface
        variant="zero-results"
        title="No matching roles"
        description="Try a different status or search."
      />
    )
  } else {
    body = (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((role) => (
          <RoleCard key={role.id} role={role} />
        ))}
      </div>
    )
  }

  return (
    <AppShell breadcrumbs={ROLES_CRUMBS} account={account}>
      <div className="mx-auto w-full max-w-[1440px] px-6 pb-12 pt-6">
        <PageHeader
          title="Roles"
          description="Every open role and its candidate pipeline."
          actions={
            canManage ? (
              <Button variant="primary" onClick={() => setCreateOpen(true)}>
                <Plus /> New role
              </Button>
            ) : null
          }
        >
          {total > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex items-center gap-1 rounded-hl-md bg-hl-muted p-1">
                {FILTERS.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setStatus(f.value)}
                    className={cn(
                      'hl-small rounded-hl-sm px-2.5 py-1 outline-none transition-colors',
                      status === f.value
                        ? 'bg-hl-canvas text-hl-accent-fg shadow-[var(--hl-shadow-xs)]'
                        : 'text-hl-fg-secondary hover:text-hl-fg',
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-hl-fg-tertiary" aria-hidden />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search roles…"
                  aria-label="Search roles"
                  className="pl-8"
                />
              </div>
            </div>
          ) : null}
        </PageHeader>

        {body}
      </div>

      <RoleFormDialog
        mode="create"
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(role) => router.push(`/roles/${role.id}`)}
      />
    </AppShell>
  )
}
