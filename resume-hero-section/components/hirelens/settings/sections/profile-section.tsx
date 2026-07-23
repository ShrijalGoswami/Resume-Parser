'use client'

import { useProfile } from '../../lib/api/hooks'
import { useUpdateProfile } from '../../lib/api/settings'
import { SettingsSection, Field, SaveBar } from '../settings-ui'
import { useDirtyForm } from '../use-dirty-form'
import { Input } from '../../ui/input'
import { Skeleton } from '../../ui/skeleton'
import { ErrorState } from '../../states/error-state'
import { toast } from '../../ui/use-toast'
import type { RecruiterProfile } from '@/types/campaign'

export function ProfileSection() {
  const profile = useProfile()

  return (
    <SettingsSection title="Profile" description="How you appear across HireLens.">
      {profile.isLoading ? (
        <div className="flex flex-col gap-4">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-16" />
          ))}
        </div>
      ) : profile.isError || !profile.data ? (
        <ErrorState
          variant="inline"
          title="Couldn’t load your profile"
          onRetry={() => profile.refetch()}
        />
      ) : (
        <ProfileForm key={profile.data.id} initial={profile.data} />
      )}
    </SettingsSection>
  )
}

function ProfileForm({ initial }: { initial: RecruiterProfile }) {
  const update = useUpdateProfile()
  const { values, set, reset, dirty } = useDirtyForm({
    full_name: initial.full_name ?? '',
    company: initial.company ?? '',
    job_title: initial.job_title ?? '',
  })

  const save = () => {
    update.mutate(
      { full_name: values.full_name, company: values.company, job_title: values.job_title },
      {
        onSuccess: () => toast({ variant: 'success', title: 'Profile saved' }),
        onError: (error) =>
          toast({ variant: 'danger', title: error instanceof Error ? error.message : 'Save failed' }),
      },
    )
  }

  return (
    <div className="flex max-w-lg flex-col gap-4">
      <Field label="Email" htmlFor="profile-email" hint="Your sign-in email can’t be changed here.">
        <Input id="profile-email" value={initial.email} disabled />
      </Field>
      <Field label="Full name" htmlFor="profile-name">
        <Input
          id="profile-name"
          value={values.full_name}
          onChange={(event) => set('full_name', event.target.value)}
        />
      </Field>
      <Field label="Company" htmlFor="profile-company">
        <Input
          id="profile-company"
          value={values.company}
          onChange={(event) => set('company', event.target.value)}
        />
      </Field>
      <Field label="Job title" htmlFor="profile-title">
        <Input
          id="profile-title"
          value={values.job_title}
          onChange={(event) => set('job_title', event.target.value)}
        />
      </Field>
      <SaveBar dirty={dirty} saving={update.isPending} onSave={save} onDiscard={reset} />
    </div>
  )
}
