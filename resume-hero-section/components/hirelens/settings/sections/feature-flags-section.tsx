'use client'

import { useOrgContext, useFeatureFlags, useSetFeatureFlag } from '../../lib/api/settings'
import { SettingsSection } from '../settings-ui'
import { PERMS, hasPerm } from '../permissions'
import { Card } from '../../ui/card'
import { Switch } from '../../ui/switch'
import { Skeleton } from '../../ui/skeleton'
import { ErrorState } from '../../states/error-state'
import { toast } from '../../ui/use-toast'

function humanize(flag: string) {
  return flag.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function FeatureFlagsSection() {
  const ctx = useOrgContext()
  const flags = useFeatureFlags()
  const setFlag = useSetFeatureFlag()
  const canManage = hasPerm(ctx.data?.permissions, PERMS.FEATURE_FLAG_MANAGE)

  return (
    <SettingsSection
      title="Feature flags"
      description="Turn optional capabilities on or off for your organization."
    >
      {flags.isLoading ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-14" />
          ))}
        </div>
      ) : flags.isError || !flags.data ? (
        <ErrorState
          variant="inline"
          title="Couldn’t load feature flags"
          onRetry={() => flags.refetch()}
        />
      ) : (
        <Card className="divide-y divide-hl-border-subtle">
          {flags.data.features.map((flag) => {
            const enabled = Boolean(flags.data.resolved[flag])
            const overridden = flag in flags.data.overrides
            const labelId = `flag-${flag}`
            return (
              <div key={flag} className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p id={labelId} className="hl-small font-medium text-hl-fg">
                    {humanize(flag)}
                  </p>
                  <p className="hl-caption text-hl-fg-tertiary">
                    {overridden ? 'Org override' : 'Plan default'}
                  </p>
                </div>
                <Switch
                  checked={enabled}
                  aria-labelledby={labelId}
                  disabled={!canManage}
                  onCheckedChange={(next) =>
                    setFlag.mutate(
                      { flag, enabled: next },
                      {
                        onError: (error) =>
                          toast({
                            variant: 'danger',
                            title: error instanceof Error ? error.message : 'Update failed',
                          }),
                      },
                    )
                  }
                />
              </div>
            )
          })}
        </Card>
      )}
    </SettingsSection>
  )
}
