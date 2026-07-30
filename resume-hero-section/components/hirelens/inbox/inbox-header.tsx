'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Upload, Search } from 'lucide-react'
import { PERMS, hasPerm } from '../settings/permissions'
import { useOrgContext } from '../lib/api/settings'
import { Button } from '../ui/button'

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function todayLabel(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Inbox header — greeting, organization, date, global search, and the two quick
 * actions (New role / Upload candidates). No other buttons (spec). Search routes
 * to the existing Talent discovery surface; it does not build its own index.
 */
export function InboxHeader({ name, org }: { name?: string; org?: string }) {
  const ctx = useOrgContext()
  const canManage = hasPerm(ctx.data?.permissions, PERMS.CAMPAIGN_MANAGE)
  const canUpload = hasPerm(ctx.data?.permissions, PERMS.CANDIDATE_MANAGE)
  const router = useRouter()
  const [query, setQuery] = React.useState('')

  const onSearch = React.useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      const q = query.trim()
      if (q) router.push(`/talent?q=${encodeURIComponent(q)}`)
    },
    [query, router],
  )

  const first = name?.trim().split(/\s+/)[0]

  return (
    <header className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {/* `hl-display`, the shell page-title step — not the focal step.
              Home is a route like Roles or Talent; titling it two steps larger
              made the greeting shout across the whole product. */}
          <h1 className="hl-display">
            {greeting()}
            {first ? `, ${first}` : ''}
          </h1>
          <p className="hl-body text-hl-fg-tertiary">
            {org ? `${org} · ` : ''}
            {todayLabel()}
          </p>
        </div>
        {/* Both actions are permission-gated. The server enforces the same
            two permissions independently — hiding them here only spares the
            user a button that would answer 403. */}
        <div className="flex items-center gap-2">
          {canManage ? (
            <Button variant="primary" asChild>
              <Link href="/roles?new=1">
                <Plus aria-hidden /> New role
              </Link>
            </Button>
          ) : null}
          {canUpload ? (
            <Button variant="secondary" asChild>
              <Link href="/roles">
                <Upload aria-hidden /> Upload candidates
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      <form
        role="search"
        onSubmit={onSearch}
        className="flex items-center gap-2 rounded-hl-md border border-hl-border bg-hl-canvas px-3 py-2 focus-within:border-hl-accent"
      >
        <Search className="size-4 shrink-0 text-hl-fg-tertiary" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search candidates and roles…"
          aria-label="Search candidates and roles"
          className="hl-body min-w-0 flex-1 bg-transparent text-hl-fg outline-none placeholder:text-hl-fg-tertiary"
        />
      </form>
    </header>
  )
}
