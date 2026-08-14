'use client'

import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Field } from '../settings/settings-ui'
import { toast } from '../ui/use-toast'
import { useCreateRole, useUpdateRole } from '../lib/api/workspace'
import type { Campaign, CampaignCreateInput } from '@/types/campaign'

interface FormState {
  title: string
  company: string
  role_title: string
  location: string
  employment_type: string
  job_description: string
}

function fromRole(role?: Campaign): FormState {
  return {
    title: role?.title ?? '',
    company: role?.company ?? '',
    role_title: role?.role_title ?? '',
    location: role?.location ?? '',
    employment_type: role?.employment_type ?? '',
    job_description: role?.job_description ?? '',
  }
}

function toInput(form: FormState): CampaignCreateInput {
  return {
    title: form.title.trim(),
    company: form.company.trim() || undefined,
    role_title: form.role_title.trim() || undefined,
    location: form.location.trim() || undefined,
    employment_type: form.employment_type.trim() || undefined,
    job_description: form.job_description.trim() || undefined,
  }
}

export interface RoleFormDialogProps {
  mode: 'create' | 'edit'
  /** Required in edit mode; ignored for create. */
  role?: Campaign
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Create only — the caller redirects into the new role's workspace. */
  onCreated?: (role: Campaign) => void
  /** Edit only. */
  onUpdated?: (role: Campaign) => void
}

/**
 * The single role form for both Create and Edit (mode prop). Kept in-shell so
 * role + JD authoring never leaves V4. The inner form mounts fresh whenever the
 * dialog opens (Radix unmounts closed content), so state seeds from `role`
 * without a sync effect.
 */
export function RoleFormDialog({
  mode,
  role,
  open,
  onOpenChange,
  onCreated,
  onUpdated,
}: RoleFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <RoleForm
          mode={mode}
          role={role}
          onOpenChange={onOpenChange}
          onCreated={onCreated}
          onUpdated={onUpdated}
        />
      </DialogContent>
    </Dialog>
  )
}

function RoleForm({
  mode,
  role,
  onOpenChange,
  onCreated,
  onUpdated,
}: Omit<RoleFormDialogProps, 'open'>) {
  const initial = React.useMemo(() => fromRole(role), [role])
  const [form, setForm] = React.useState<FormState>(initial)

  const create = useCreateRole()
  const update = useUpdateRole(role?.id ?? '')
  const pending = create.isPending || update.isPending

  const set = <K extends keyof FormState>(key: K, value: string) =>
    setForm((f) => ({ ...f, [key]: value }))

  const titleValid = form.title.trim().length > 0
  const dirty = mode === 'create' || JSON.stringify(form) !== JSON.stringify(initial)
  const canSubmit = titleValid && dirty && !pending

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!canSubmit) return
    const input = toInput(form)

    if (mode === 'create') {
      create.mutate(
        { ...input, status: 'active' },
        {
        onSuccess: (created) => {
          toast({ variant: 'success', title: 'Role created', description: created.title })
          onOpenChange(false)
          onCreated?.(created)
        },
        onError: (err) =>
          toast({
            variant: 'danger',
            title: 'Could not create the role',
            description: err instanceof Error ? err.message : undefined,
          }),
      })
    } else if (role) {
      update.mutate(input, {
        onSuccess: (updated) => {
          toast({ variant: 'success', title: 'Role updated' })
          onOpenChange(false)
          onUpdated?.(updated)
        },
        onError: (err) =>
          toast({
            variant: 'danger',
            title: 'Could not save changes',
            description: err instanceof Error ? err.message : undefined,
          }),
      })
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <DialogHeader>
        <DialogTitle>{mode === 'create' ? 'New role' : 'Edit role'}</DialogTitle>
        <DialogDescription>
          {mode === 'create'
            ? 'Name the role and paste its job description — candidates are ranked against it.'
            : 'Update the role details and job description.'}
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4 py-2">
        <Field label="Role title" htmlFor="role-title">
          <Input
            id="role-title"
            required
            autoFocus
            placeholder="Senior Backend Engineer — Q3"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company" htmlFor="role-company">
            <Input
              id="role-company"
              placeholder="Acme Corp"
              value={form.company}
              onChange={(e) => set('company', e.target.value)}
            />
          </Field>
          <Field label="Role level" htmlFor="role-level">
            <Input
              id="role-level"
              placeholder="Staff / Senior"
              value={form.role_title}
              onChange={(e) => set('role_title', e.target.value)}
            />
          </Field>
          <Field label="Location" htmlFor="role-location">
            <Input
              id="role-location"
              placeholder="Remote · US"
              value={form.location}
              onChange={(e) => set('location', e.target.value)}
            />
          </Field>
          <Field label="Employment type" htmlFor="role-employment">
            <Input
              id="role-employment"
              placeholder="Full-time"
              value={form.employment_type}
              onChange={(e) => set('employment_type', e.target.value)}
            />
          </Field>
        </div>

        <Field
          label="Job description"
          htmlFor="role-jd"
          hint="Candidates are ranked against this. Required before uploading résumés."
        >
          <Textarea
            id="role-jd"
            rows={8}
            placeholder="Paste the job description…"
            value={form.job_description}
            onChange={(e) => set('job_description', e.target.value)}
          />
        </Field>
      </div>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" loading={pending} disabled={!canSubmit}>
          {mode === 'create' ? 'Create role' : 'Save changes'}
        </Button>
      </DialogFooter>
    </form>
  )
}
