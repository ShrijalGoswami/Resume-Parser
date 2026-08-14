import type { Meta, StoryObj } from '@storybook/react-vite'
import { DataTable, type DataTableColumn, type DataTableProps } from './data-table'
import { Badge } from './badge'
import { Button } from './button'
import { EmptyState } from '../states/empty-state'

interface Member {
  id: string
  name: string
  email: string
  role: string
  status: 'Active' | 'Invited' | 'Suspended'
  seats: number
}

const members: Member[] = [
  { id: 'u1', name: 'Sarah Kim', email: 'sarah@acme.co', role: 'Owner', status: 'Active', seats: 4 },
  { id: 'u2', name: 'Marcus Chen', email: 'marcus@acme.co', role: 'Recruiter', status: 'Active', seats: 2 },
  { id: 'u3', name: 'Priya Sharma', email: 'priya@acme.co', role: 'Hiring manager', status: 'Active', seats: 3 },
  { id: 'u4', name: 'Tom Alvarez', email: 'tom@acme.co', role: 'Interviewer', status: 'Invited', seats: 0 },
  { id: 'u5', name: 'Nina Kovac', email: 'nina@acme.co', role: 'Viewer', status: 'Suspended', seats: 1 },
  { id: 'u6', name: 'Yuki Tanaka', email: 'yuki@acme.co', role: 'Recruiter', status: 'Active', seats: 2 },
  { id: 'u7', name: 'Grace Liu', email: 'grace@acme.co', role: 'Interviewer', status: 'Active', seats: 1 },
]

const statusVariant = {
  Active: 'success',
  Invited: 'info',
  Suspended: 'danger',
} as const

const columns: DataTableColumn<Member>[] = [
  {
    key: 'name',
    header: 'Member',
    sortValue: (row) => row.name,
    render: (row) => (
      <div>
        <p className="hl-body-medium text-hl-fg">{row.name}</p>
        <p className="hl-caption text-hl-fg-tertiary">{row.email}</p>
      </div>
    ),
  },
  { key: 'role', header: 'Role', sortValue: (row) => row.role, render: (row) => row.role },
  {
    key: 'status',
    header: 'Status',
    sortValue: (row) => row.status,
    render: (row) => <Badge variant={statusVariant[row.status]}>{row.status}</Badge>,
  },
  {
    key: 'seats',
    header: 'Seats',
    align: 'right',
    sortValue: (row) => row.seats,
    render: (row) => <span className="hl-mono">{row.seats}</span>,
  },
]

const meta: Meta<DataTableProps<Member>> = {
  title: 'Primitives/DataTable',
  component: DataTable<Member>,
  parameters: { layout: 'padded' },
}

export default meta
type Story = StoryObj<DataTableProps<Member>>

export const Basic: Story = {
  args: { rows: members, columns, getRowId: (row: Member) => row.id },
}

export const Searchable: Story = {
  args: {
    rows: members,
    columns,
    getRowId: (row: Member) => row.id,
    getSearchText: (row: Member) => `${row.name} ${row.email} ${row.role}`,
    searchPlaceholder: 'Search members…',
    caption: 'Organization members',
  },
}

export const Paginated: Story = {
  args: {
    rows: members,
    columns,
    getRowId: (row: Member) => row.id,
    pageSize: 3,
    getSearchText: (row: Member) => row.name,
    initialSort: { key: 'name' },
  },
}

export const Selectable: Story = {
  args: {
    rows: members,
    columns,
    getRowId: (row: Member) => row.id,
    selectable: true,
    getRowLabel: (row: Member) => row.name,
    getSearchText: (row: Member) => row.name,
    bulkActions: (selected: string[], clear: () => void) => (
      <>
        <span className="hl-mono text-hl-fg-secondary">{selected.length} selected</span>
        <Button size="sm" variant="ghost" onClick={clear}>
          Clear
        </Button>
      </>
    ),
  },
}

export const Clickable: Story = {
  args: {
    rows: members,
    columns,
    getRowId: (row: Member) => row.id,
    onRowClick: () => {},
    getRowLabel: (row: Member) => `Open ${row.name}`,
  },
}

export const Loading: Story = {
  args: { rows: [], columns, getRowId: (row: Member) => row.id, loading: true },
}

export const Empty: Story = {
  args: {
    rows: [],
    columns,
    getRowId: (row: Member) => row.id,
    empty: (
      <EmptyState
        variant="first-run"
        title="No members yet"
        description="Invite your team to start reviewing candidates together."
      />
    ),
  },
}
