import type { Meta, StoryObj } from '@storybook/react-vite'
import { ActivityRow } from './activity-row'
import type { ActivityEvent } from '@/types/campaign'

const events: ActivityEvent[] = [
  {
    id: 'a1',
    recruiter_id: 'u1',
    type: 'agent',
    summary: 'Agent ranked the Senior Backend pipeline',
    payload: {},
    created_at: '2026-07-20T08:30:00Z',
  },
  {
    id: 'a2',
    recruiter_id: 'u1',
    type: 'report',
    summary: 'Executive report generated for Data Engineering',
    payload: {},
    created_at: '2026-07-20T07:15:00Z',
  },
  {
    id: 'a3',
    recruiter_id: 'u1',
    type: 'comparison',
    summary: 'Compared 3 candidates for Backend',
    payload: {},
    created_at: '2026-07-19T16:00:00Z',
  },
]

const meta: Meta = { title: 'Domain/ActivityRow' }
export default meta
type Story = StoryObj

export const Ledger: Story = {
  render: () => (
    <ul className="max-w-xl divide-y divide-hl-border-subtle rounded-hl-lg border border-hl-border bg-hl-canvas px-3">
      {events.map((event) => (
        <ActivityRow key={event.id} event={event} />
      ))}
    </ul>
  ),
}
