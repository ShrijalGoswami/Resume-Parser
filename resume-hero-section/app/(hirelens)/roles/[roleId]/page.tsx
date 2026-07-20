import type { Metadata } from 'next'
import { RoleWorkspace } from '@/components/hirelens/workspace/role-workspace'

export const metadata: Metadata = { title: 'Role' }

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ roleId: string }>
  searchParams: Promise<{ lens?: string }>
}) {
  const { roleId } = await params
  const { lens } = await searchParams
  return <RoleWorkspace roleId={roleId} lens={lens ?? 'pipeline'} />
}
