'use client'

import * as React from 'react'
import { Plus, Copy, Check, KeyRound } from 'lucide-react'
import { useOrgContext, useApiKeys, useCreateApiKey, useRevokeApiKey } from '../../lib/api/settings'
import { SettingsSection, Field, NativeSelect } from '../settings-ui'
import { TypedConfirmDialog } from '../typed-confirm-dialog'
import { PERMS, hasPerm } from '../permissions'
import { Card } from '../../ui/card'
import { Badge } from '../../ui/badge'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Skeleton } from '../../ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../ui/dialog'
import { EmptyState } from '../../states/empty-state'
import { ErrorState } from '../../states/error-state'
import { GateState } from '../../states/gate-state'
import { relativeTime } from '../../lib/format'
import { toast } from '../../ui/use-toast'
import type { ApiKey } from '@/types/org'

const SCOPES = ['read_only', 'read_write', 'admin'] as const

function humanize(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function ApiKeysSection() {
  const ctx = useOrgContext()
  const canManage = hasPerm(ctx.data?.permissions, PERMS.API_KEY_MANAGE)

  if (ctx.isLoading) {
    return (
      <SettingsSection title="API keys" description="Programmatic access to your organization’s data.">
        <Skeleton className="h-14" />
      </SettingsSection>
    )
  }
  if (!canManage) {
    return (
      <SettingsSection title="API keys" description="Programmatic access to your organization’s data.">
        <GateState reason="permission" title="You need API key access to view and manage keys." />
      </SettingsSection>
    )
  }
  return <ApiKeysManager />
}

function ApiKeysManager() {
  const [createOpen, setCreateOpen] = React.useState(false)
  const [createdSecret, setCreatedSecret] = React.useState<string | null>(null)
  const [revokeTarget, setRevokeTarget] = React.useState<ApiKey | null>(null)

  const keys = useApiKeys()

  return (
    <SettingsSection
      title="API keys"
      description="Programmatic access to your organization’s data. A key’s secret is shown once."
      action={
        <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus /> New key
        </Button>
      }
    >
      {keys.isLoading ? (
        <div className="flex flex-col gap-2">
          {[0, 1].map((index) => (
            <Skeleton key={index} className="h-14" />
          ))}
        </div>
      ) : keys.isError ? (
        <ErrorState variant="inline" title="Couldn’t load API keys" onRetry={() => keys.refetch()} />
      ) : (keys.data ?? []).length === 0 ? (
        <EmptyState
          icon={KeyRound}
          title="No API keys yet"
          description="Create a key to access HireLens programmatically."
        />
      ) : (
        <Card className="divide-y divide-hl-border-subtle">
          {(keys.data ?? []).map((key) => (
            <div key={key.id} className="flex flex-wrap items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="hl-small font-medium text-hl-fg">{key.name}</p>
                <p className="hl-mono text-hl-fg-tertiary">{key.prefix}…</p>
              </div>
              <Badge variant="outline" className="capitalize">
                {humanize(key.scope)}
              </Badge>
              {key.revoked ? (
                <Badge variant="neutral">Revoked</Badge>
              ) : (
                <>
                  <span className="hl-caption text-hl-fg-tertiary">
                    {key.created_at ? relativeTime(key.created_at) : ''}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setRevokeTarget(key)}
                  >
                    Revoke
                  </Button>
                </>
              )}
            </div>
          ))}
        </Card>
      )}

      <CreateKeyDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(secret) => setCreatedSecret(secret)}
      />

      <SecretDialog secret={createdSecret} onClose={() => setCreatedSecret(null)} />

      <RevokeKeyDialog target={revokeTarget} onDone={() => setRevokeTarget(null)} />
    </SettingsSection>
  )
}

function CreateKeyDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (secret: string) => void
}) {
  const create = useCreateApiKey()
  const [name, setName] = React.useState('')
  const [scope, setScope] = React.useState<string>('read_only')

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setName('')
      setScope('read_only')
    }
    onOpenChange(next)
  }

  const submit = () => {
    create.mutate(
      { name: name.trim(), scope },
      {
        onSuccess: (result) => {
          handleOpenChange(false)
          onCreated(result.secret)
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
          <DialogTitle>New API key</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <Field label="Name" htmlFor="key-name">
            <Input
              id="key-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. CI pipeline"
            />
          </Field>
          <Field label="Scope" htmlFor="key-scope">
            <NativeSelect
              id="key-scope"
              value={scope}
              onChange={(event) => setScope(event.target.value)}
            >
              {SCOPES.map((value) => (
                <option key={value} value={value}>
                  {humanize(value)}
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
            loading={create.isPending}
            disabled={!name.trim()}
          >
            Create key
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SecretDialog({ secret, onClose }: { secret: string | null; onClose: () => void }) {
  const [copied, setCopied] = React.useState(false)

  const copy = () => {
    if (!secret || !navigator.clipboard) return
    void navigator.clipboard.writeText(secret)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <Dialog
      open={secret !== null}
      onOpenChange={(open) => {
        if (!open) {
          setCopied(false)
          onClose()
        }
      }}
    >
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Copy your API key</DialogTitle>
          <DialogDescription>
            This is the only time the full secret is shown. Store it somewhere safe.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 rounded-hl-md border border-hl-border bg-hl-subtle p-2">
          <code className="hl-mono min-w-0 flex-1 truncate text-hl-fg">{secret}</code>
          <Button variant="secondary" size="sm" onClick={copy}>
            {copied ? <Check /> : <Copy />} {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
        <DialogFooter>
          <Button variant="primary" size="sm" onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RevokeKeyDialog({ target, onDone }: { target: ApiKey | null; onDone: () => void }) {
  const revoke = useRevokeApiKey()
  return (
    <TypedConfirmDialog
      open={target !== null}
      onOpenChange={(open) => {
        if (!open) onDone()
      }}
      title="Revoke API key"
      description={
        <>
          Revoking <span className="text-hl-fg">{target?.name}</span> immediately breaks any
          integration using it. This can’t be undone.
        </>
      }
      confirmWord={target?.name ?? 'revoke'}
      confirmLabel="Revoke key"
      busy={revoke.isPending}
      onConfirm={() => {
        if (!target) return
        revoke.mutate(target.id, {
          onSuccess: () => {
            toast({ variant: 'info', title: `Revoked ${target.name}` })
            onDone()
          },
          onError: (error) =>
            toast({ variant: 'danger', title: error instanceof Error ? error.message : 'Revoke failed' }),
        })
      }}
    />
  )
}
