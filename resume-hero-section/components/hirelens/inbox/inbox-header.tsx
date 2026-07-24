'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Upload, Search } from 'lucide-react'
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
          <h1 className="hl-display-md">
            {greeting()}
            {first ? `, ${first}` : ''}
          </h1>
          <p className="hl-small text-hl-fg-tertiary">
            {org ? `${org} · ` : ''}
            {todayLabel()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" asChild>
            <Link href="/roles?new=1">
              <Plus aria-hidden /> New role
            </Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/roles">
              <Upload aria-hidden /> Upload candidates
            </Link>
          </Button>
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
