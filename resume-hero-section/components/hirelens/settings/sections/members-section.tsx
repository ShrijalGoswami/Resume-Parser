'use client'

import * as React from 'react'
import { ChevronDown, Trash2, UserPlus } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  useOrgContext,
  useMembers,
  useRoles,
  useInviteMember,
  useSetMemberRole,
  useRemoveMember,
} from '../../lib/api/settings'
import { SettingsSection, Field, NativeSelect } from '../settings-ui'
import { TypedConfirmDialog } from '../typed-confirm-dialog'
import { PERMS, hasPerm } from '../permissions'
import { Card } from '../../ui/card'
import { Badge, type BadgeProps } from '../../ui/badge'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
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
import type { OrgMember } from '@/types/org'

const ROLES = ['owner', 'admin', 'hiring_manager', 'recruiter', 'interviewer', 'viewer'] as const

const STATUS_TONE: Record<string, BadgeProps['variant']> = {
  active: 'success',
  invited: 'info',
  pending: 'warning',
  suspended: 'neutral',
}

function humanRole(role: string) {
  return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function MembersSection() {
  const ctx = useOrgContext()
  const members = useMembers()
  const canManage = hasPerm(ctx.data?.permissions, PERMS.MEMBER_MANAGE)

  const [inviteOpen, setInviteOpen] = React.useState(false)
  const [removeTarget, setRemoveTarget] = React.useState<OrgMember | null>(null)

  return (
    <SettingsSection
      title="Members & roles"
      description="Who’s in your organization and what they can do."
      action={
        canManage ? (
          <Button variant="primary" size="sm" onClick={() => setInviteOpen(true)}>
            <UserPlus /> Invite
          </Button>
        ) : undefined
      }
    >
      {members.isLoading ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-14" />
          ))}
        </div>
      ) : members.isError ? (
        <ErrorState
          variant="inline"
          title="Couldn’t load members"
          onRetry={() => members.refetch()}
        />
      ) : (members.data ?? []).length === 0 ? (
        <EmptyState
          surface
          icon={UserPlus}
          title="No members yet"
          description="Invite teammates to collaborate on hiring."
        />
      ) : (
        <Card className="divide-y divide-hl-border-subtle">
          {(members.data ?? []).map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              canManage={canManage}
              onRemove={() => setRemoveTarget(member)}
            />
          ))}
        </Card>
      )}

      <RolesReference />

      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} />

      <RemoveMemberDialog target={removeTarget} onDone={() => setRemoveTarget(null)} />
    </SettingsSection>
  )
}

function MemberRow({
  member,
  canManage,
  onRemove,
}: {
  member: OrgMember
  canManage: boolean
  onRemove: () => void
}) {
  const setRole = useSetMemberRole()
  /*
   * `invited_email ?? user_id` put a raw UUID in the identity slot for anyone
   * who joined directly rather than by invitation — the owner of this org
   * renders as `f4ae92cd-1a70-4e0e-…`, which is the first thing you see on the
   * page. There is no name on this record to fall back to, so rather than
   * invent one the row says "Member" and carries a short id underneath as a
   * disambiguator. Honest, and it stops a database key from being someone's
   * name in an admin console.
   */
  const email = member.invited_email
  const shortId = member.user_id ? member.user_id.slice(0, 8) : ''
  const identity = email ?? 'Member'
  const label = email ?? (shortId ? `member ${shortId}` : 'member')

  return (
    <div className="flex flex-wrap items-center gap-3 p-3">
      <div className="min-w-0 flex-1">
        <p className="hl-small truncate text-hl-fg">{identity}</p>
        <div className="mt-0.5 flex items-center gap-2">
          <Badge variant={STATUS_TONE[member.status] ?? 'neutral'} className="capitalize">
            {member.status}
          </Badge>
          {!email && shortId ? (
            <span className="hl-caption font-hl-mono text-hl-fg-tertiary">{shortId}</span>
          ) : null}
        </div>
      </div>
      {canManage ? (
        <NativeSelect
          value={member.role}
          aria-label={`Role for ${label}`}
          disabled={setRole.isPending}
          onChange={(event) =>
            setRole.mutate(
              { id: member.id, role: event.target.value },
              {
                onSuccess: () => toast({ variant: 'success', title: 'Role updated' }),
                onError: (error) =>
                  toast({
                    variant: 'danger',
                    title: error instanceof Error ? error.message : 'Update failed',
                  }),
              },
            )
          }
        >
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {humanRole(role)}
            </option>
          ))}
        </NativeSelect>
      ) : (
        <Badge variant="neutral" className="capitalize">
          {humanRole(member.role)}
        </Badge>
      )}
      {canManage ? (
        <Button variant="ghost" size="icon" onClick={onRemove} aria-label={`Remove ${label}`}>
          <Trash2 />
        </Button>
      ) : null}
    </div>
  )
}

function RolesReference() {
  const roles = useRoles()
  const [open, setOpen] = React.useState(false)
  if (!roles.data) return null
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        /* Was tertiary text with no affordance, sitting alone under the member
           card — it read as an orphaned caption rather than a control. The
           chevron and the secondary colour make it legible as a disclosure. */
        className="hl-small inline-flex items-center gap-1.5 self-start rounded-hl-sm text-hl-fg-secondary outline-none transition-colors hover:text-hl-fg"
      >
        {open ? 'Hide role permissions' : 'What can each role do?'}
        <ChevronDown
          className={cn('size-4 transition-transform duration-150', open && 'rotate-180')}
          aria-hidden
        />
      </button>
      {open ? (
        <Card className="flex flex-col gap-3 p-4">
          {Object.entries(roles.data).map(([role, permissions]) => (
            <div key={role}>
              <p className="hl-small font-medium text-hl-fg">{humanRole(role)}</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {permissions.length === 0 ? (
                  <span className="hl-caption text-hl-fg-tertiary">No admin permissions</span>
                ) : (
                  permissions.map((permission) => (
                    <span
                      key={permission}
                      className="hl-caption rounded-full bg-hl-muted px-2 py-0.5 text-hl-fg-secondary"
                    >
                      {permission}
                    </span>
                  ))
                )}
              </div>
            </div>
          ))}
        </Card>
      ) : null}
    </div>
  )
}

function InviteDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const invite = useInviteMember()
  const [email, setEmail] = React.useState('')
  const [role, setRole] = React.useState<string>('recruiter')

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setEmail('')
      setRole('recruiter')
    }
    onOpenChange(next)
  }

  const submit = () => {
    invite.mutate(
      { email: email.trim(), role },
      {
        onSuccess: () => {
          toast({ variant: 'success', title: `Invited ${email.trim()}` })
          handleOpenChange(false)
        },
        onError: (error) =>
          toast({ variant: 'danger', title: error instanceof Error ? error.message : 'Invite failed' }),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Invite a member</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <Field label="Email" htmlFor="invite-email">
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="teammate@company.com"
            />
          </Field>
          <Field label="Role" htmlFor="invite-role">
            <NativeSelect
              id="invite-role"
              value={role}
              onChange={(event) => setRole(event.target.value)}
            >
              {ROLES.map((value) => (
                <option key={value} value={value}>
                  {humanRole(value)}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={submit}
            loading={invite.isPending}
            disabled={!email.trim()}
          >
            Send invite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RemoveMemberDialog({
  target,
  onDone,
}: {
  target: OrgMember | null
  onDone: () => void
}) {
  const remove = useRemoveMember()
  const identity = target?.invited_email ?? target?.user_id ?? ''
  const confirmWord = target?.invited_email ?? 'remove'

  return (
    <TypedConfirmDialog
      open={target !== null}
      onOpenChange={(open) => {
        if (!open) onDone()
      }}
      title="Remove member"
      description={
        <>
          This removes <span className="text-hl-fg">{identity}</span> from the organization. Their
          access is revoked immediately.
        </>
      }
      confirmWord={confirmWord}
      confirmLabel="Remove member"
      busy={remove.isPending}
      onConfirm={() => {
        if (!target) return
        remove.mutate(target.id, {
          onSuccess: () => {
            toast({ variant: 'info', title: `Removed ${identity}` })
            onDone()
          },
          onError: (error) =>
            toast({ variant: 'danger', title: error instanceof Error ? error.message : 'Remove failed' }),
        })
      }}
    />
  )
}
