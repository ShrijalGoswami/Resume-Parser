'use client'

import * as React from 'react'
import { Plus, Check } from 'lucide-react'
import {
  useOrgContext,
  useWorkspaces,
  useCreateWorkspace,
  useSwitchWorkspace,
} from '../../lib/api/settings'
import { SettingsSection, Field, DeferredNote } from '../settings-ui'
import { PERMS, hasPerm } from '../permissions'
import { Card } from '../../ui/card'
import { Badge } from '../../ui/badge'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Textarea } from '../../ui/textarea'
import { Skeleton } from '../../ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../ui/dialog'
import { ErrorState } from '../../states/error-state'
import { toast } from '../../ui/use-toast'

export function WorkspacesSection() {
  const ctx = useOrgContext()
  const workspaces = useWorkspaces()
  const switchWorkspace = useSwitchWorkspace()
  const canManage = hasPerm(ctx.data?.permissions, PERMS.WORKSPACE_MANAGE)
  const activeId = ctx.data?.workspace_id ?? null

  const [createOpen, setCreateOpen] = React.useState(false)

  return (
    <SettingsSection
      title="Workspaces"
      description="Separate hiring spaces within your organization."
      action={
        canManage ? (
          <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
            <Plus /> New workspace
          </Button>
        ) : undefined
      }
    >
      {workspaces.isLoading ? (
        <div className="flex flex-col gap-2">
          {[0, 1].map((index) => (
            <Skeleton key={index} className="h-16" />
          ))}
        </div>
      ) : workspaces.isError ? (
        <ErrorState
          variant="inline"
          title="Couldn’t load workspaces"
          onRetry={() => workspaces.refetch()}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {(workspaces.data ?? []).map((workspace) => {
            const active = workspace.id === activeId
            return (
              <Card key={workspace.id} className="flex flex-wrap items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="hl-small font-medium text-hl-fg">{workspace.name}</p>
                  {workspace.description ? (
                    <p className="hl-caption text-hl-fg-secondary">{workspace.description}</p>
                  ) : null}
                </div>
                {active ? (
                  <Badge variant="success">
                    <Check /> Active
                  </Badge>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={switchWorkspace.isPending && switchWorkspace.variables === workspace.id}
                    onClick={() =>
                      switchWorkspace.mutate(workspace.id, {
                        onSuccess: () =>
                          toast({ variant: 'success', title: `Switched to ${workspace.name}` }),
                        onError: (error) =>
                          toast({
                            variant: 'danger',
                            title: error instanceof Error ? error.message : 'Switch failed',
                          }),
                      })
                    }
                  >
                    Switch
                  </Button>
                )}
              </Card>
            )
          })}
        </div>
      )}

      <DeferredNote title="Renaming and archiving are coming soon">
        Workspaces can be created and switched today; edit and delete arrive when the backend
        supports them.
      </DeferredNote>

      <CreateWorkspaceDialog open={createOpen} onOpenChange={setCreateOpen} />
    </SettingsSection>
  )
}

function CreateWorkspaceDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const create = useCreateWorkspace()
  const [name, setName] = React.useState('')
  const [description, setDescription] = React.useState('')

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setName('')
      setDescription('')
    }
    onOpenChange(next)
  }

  const submit = () => {
    create.mutate(
      { name: name.trim(), description: description.trim() },
      {
        onSuccess: () => {
          toast({ variant: 'success', title: `Created ${name.trim()}` })
          handleOpenChange(false)
        },
        onError: (error) =>
          toast({ variant: 'danger', title: error instanceof Error ? error.message : 'Create failed' }),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>New workspace</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <Field label="Name" htmlFor="workspace-name">
            <Input
              id="workspace-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Engineering"
            />
          </Field>
          <Field label="Description" htmlFor="workspace-description">
            <Textarea
              id="workspace-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
            />
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
            loading={create.isPending}
            disabled={!name.trim()}
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
