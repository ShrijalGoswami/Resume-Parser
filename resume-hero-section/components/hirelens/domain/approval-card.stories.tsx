import type { Meta, StoryObj } from '@storybook/react-vite'
import { ApprovalCard } from './approval-card'
import type { Recommendation } from '@/types/agent'

const recommendation: Recommendation = {
  id: 'r1',
  workflow: 'pipeline_rank',
  dedupe_key: 'k1',
  category: 'action',
  severity: 'high',
  confidence: 0.82,
  title: 'Shortlist the top 5 candidates',
  why: "Five candidates score above your bar and haven't been actioned.",
  evidence: ['5 candidates ≥ 85 fit', '2 with matching domain experience'],
  data_sources: ['pipeline'],
  tools_used: ['ranker'],
  recommended_action: 'Shortlist Aarav, Sneha, Priya, Kabir, and Diya.',
  suggested_tool: 'shortlist',
  tool_params: {},
  campaign_id: 'c1',
  campaign_title: 'Senior Backend Engineer',
  candidate_id: null,
  candidate_name: null,
  status: 'pending',
  created_at: '2026-07-20T07:00:00Z',
  updated_at: null,
}

const meta: Meta = { title: 'Domain/ApprovalCard' }
export default meta
type Story = StoryObj

export const Default: Story = {
  render: () => (
    <div className="max-w-md">
      <ApprovalCard
        recommendation={recommendation}
        onApprove={() => {}}
        onDismiss={() => {}}
      />
    </div>
  ),
}

export const Busy: Story = {
  render: () => (
    <div className="max-w-md">
      <ApprovalCard
        recommendation={recommendation}
        busy
        onApprove={() => {}}
        onDismiss={() => {}}
      />
    </div>
  ),
}
