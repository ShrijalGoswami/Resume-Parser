import type { Metadata } from 'next'
import { RoleWorkspace } from '@/components/hirelens/workspace/role-workspace'

export const metadata: Metadata = { title: 'Role' }

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ roleId: string }>
  searchParams: Promise<{ lens?: string; candidate?: string }>
}) {
  const { roleId } = await params
  const { lens, candidate } = await searchParams
  return (
    <RoleWorkspace
      roleId={roleId}
      lens={lens ?? 'pipeline'}
      initialCandidateId={candidate ?? null}
    />
  )
}
