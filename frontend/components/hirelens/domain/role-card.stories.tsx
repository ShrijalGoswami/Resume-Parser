import type { Meta, StoryObj } from '@storybook/react-vite'
import { RoleCard } from './role-card'
import type { Campaign } from '@/types/campaign'

function make(overrides: Partial<Campaign>): Campaign {
  return {
    id: 'c1',
    recruiter_id: 'u1',
    title: 'Senior Backend Engineer',
    role_title: 'Backend',
    department: 'Engineering',
    job_description: '',
    ranking_weights: {},
    status: 'active',
    metadata: {},
    total_candidates: 42,
    awaiting_analysis: 3,
    average_match_score: 78,
    last_activity_at: '2026-07-20T06:00:00Z',
    ...overrides,
  }
}

const meta: Meta = { title: 'Domain/RoleCard' }
export default meta
type Story = StoryObj

export const Default: Story = {
  render: () => (
    <div className="max-w-sm">
      <RoleCard campaign={make({})} />
    </div>
  ),
}

export const Grid: Story = {
  render: () => (
    <div className="grid max-w-3xl gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <RoleCard campaign={make({ title: 'Senior Backend Engineer', average_match_score: 88 })} />
      <RoleCard
        campaign={make({
          title: 'Data Engineer',
          role_title: 'Data',
          status: 'paused',
          average_match_score: 61,
        })}
      />
      <RoleCard
        campaign={make({
          title: 'Product Designer',
          role_title: 'Design',
          department: 'Product',
          average_match_score: 42,
          total_candidates: 12,
          awaiting_analysis: 0,
        })}
      />
    </div>
  ),
}
