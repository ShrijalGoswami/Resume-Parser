'use client'

import { useCandidateDetail, getCandidateResult } from '../../lib/api/candidate'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '../../ui/drawer'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../ui/tabs'
import { Avatar } from '../../ui/avatar'
import { LoadingLines } from '../../states/loading'
import { ErrorState } from '../../states/error-state'
import { OverviewTab } from './overview-tab'
import { AnalysisTab } from './analysis-tab'
import { InterviewTab } from './interview-tab'
import { NotesTab } from './notes-tab'
import { CandidateActivityTab } from './activity-tab'

/**
 * Candidate Drawer (UX Spec §7.4). A 480px peek with Overview / Analysis /
 * Interview / Notes / Activity. Opens instantly (seeded from the pipeline
 * cache) and is deep-linkable via `?candidate=`. Real data only.
 */
export interface CandidateDrawerProps {
  roleId: string
  candidateId: string | null
  onClose: () => void
}

export function CandidateDrawer({ roleId, candidateId, onClose }: CandidateDrawerProps) {
  return (
    <Drawer
      open={Boolean(candidateId)}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <DrawerContent size="candidate">
        {candidateId ? <DrawerInner roleId={roleId} candidateId={candidateId} /> : null}
      </DrawerContent>
    </Drawer>
  )
}

function DrawerInner({ roleId, candidateId }: { roleId: string; candidateId: string }) {
  const { data: candidate, isLoading, isError, refetch } = useCandidateDetail(roleId, candidateId)

  if (isLoading && !candidate) {
    return (
      <div className="p-4">
        <LoadingLines lines={6} />
      </div>
    )
  }
  if (isError || !candidate) {
    return (
      <div className="p-4">
        <ErrorState
          variant="inline"
          title="Couldn't load candidate"
          onRetry={() => refetch()}
        />
      </div>
    )
  }

  const result = getCandidateResult(candidate)

  return (
    <>
      <DrawerHeader>
        <Avatar name={candidate.full_name} size={40} />
        <div className="min-w-0 flex-1">
          <DrawerTitle>{candidate.full_name}</DrawerTitle>
          {result?.match_category ? (
            <p className="hl-small truncate text-hl-fg-secondary">{result.match_category}</p>
          ) : null}
        </div>
      </DrawerHeader>

      <Tabs defaultValue="overview" className="flex min-h-0 flex-1 flex-col">
        <div className="border-b border-hl-border-subtle px-4">
          <TabsList variant="underline">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
            <TabsTrigger value="interview">Interview</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <TabsContent value="overview" className="p-4">
            <OverviewTab roleId={roleId} candidate={candidate} result={result} />
          </TabsContent>
          <TabsContent value="analysis" className="p-4">
            <AnalysisTab result={result} />
          </TabsContent>
          <TabsContent value="interview" className="p-4">
            <InterviewTab result={result} />
          </TabsContent>
          <TabsContent value="notes" className="p-4">
            <NotesTab roleId={roleId} candidateId={candidateId} />
          </TabsContent>
          <TabsContent value="activity" className="p-4">
            <CandidateActivityTab roleId={roleId} candidateId={candidateId} />
          </TabsContent>
        </div>
      </Tabs>
    </>
  )
}
