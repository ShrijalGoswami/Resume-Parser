'use client'

import { useActiveRoles } from '../lib/api/hooks'
import { RoleCard } from '../domain'
import { Section } from './section'
import { Skeleton } from '../ui/skeleton'
import { ErrorState } from '../states/error-state'

/**
 * Active Roles (UX Spec §6). Collapses to nothing when there are no active
 * roles (the whole-Home first-run case is handled one level up).
 */
export function ActiveRolesSection() {
  const { data, isLoading, isError, refetch } = useActiveRoles()

  if (isLoading) {
    return (
      <Section title="Active roles">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-28" />
          ))}
        </div>
      </Section>
    )
  }

  if (isError) {
    return (
      <Section title="Active roles">
        <ErrorState
          variant="inline"
          title="Couldn't load your roles"
          onRetry={() => refetch()}
        />
      </Section>
    )
  }

  if (!data || data.length === 0) return null

  return (
    <Section title="Active roles" count={data.length}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {data.map((campaign) => (
          <RoleCard key={campaign.id} campaign={campaign} />
        ))}
      </div>
    </Section>
  )
}
