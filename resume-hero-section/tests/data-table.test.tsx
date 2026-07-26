// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'
import { DataTable, type DataTableColumn } from '../components/hirelens/ui/data-table'

afterEach(cleanup)

interface Row {
  id: string
  name: string
  score: number | null
}

const rows: Row[] = [
  { id: 'a', name: 'Ada', score: 90 },
  { id: 'b', name: 'Grace', score: 70 },
  { id: 'c', name: 'Linus', score: null },
  { id: 'd', name: 'Barbara', score: 80 },
]

const columns: DataTableColumn<Row>[] = [
  { key: 'name', header: 'Name', sortValue: (r) => r.name, render: (r) => r.name },
  {
    key: 'score',
    header: 'Score',
    sortValue: (r) => r.score,
    render: (r) => (r.score === null ? '—' : String(r.score)),
  },
]

function bodyNames(): string[] {
  const table = screen.getByRole('table')
  const body = table.querySelectorAll('tbody tr')
  return Array.from(body).map((tr) => tr.querySelector('td')?.textContent ?? '')
}

describe('DataTable', () => {
  it('renders every row when unpaginated', () => {
    render(<DataTable rows={rows} columns={columns} getRowId={(r) => r.id} />)
    expect(bodyNames()).toEqual(['Ada', 'Grace', 'Linus', 'Barbara'])
  })

  it('sorts by a column and toggles direction, sinking empty values in both', async () => {
    const user = userEvent.setup()
    render(<DataTable rows={rows} columns={columns} getRowId={(r) => r.id} />)

    await user.click(screen.getByRole('button', { name: /score/i }))
    // Ascending: 70, 80, 90 — null last, not treated as 0.
    expect(bodyNames()).toEqual(['Grace', 'Barbara', 'Ada', 'Linus'])

    await user.click(screen.getByRole('button', { name: /score/i }))
    // Descending: 90, 80, 70 — null still last.
    expect(bodyNames()).toEqual(['Ada', 'Barbara', 'Grace', 'Linus'])
  })

  it('exposes the active sort to assistive tech via aria-sort', async () => {
    const user = userEvent.setup()
    render(<DataTable rows={rows} columns={columns} getRowId={(r) => r.id} />)

    await user.click(screen.getByRole('button', { name: /name/i }))
    expect(screen.getByRole('columnheader', { name: /name/i })).toHaveAttribute(
      'aria-sort',
      'ascending',
    )
    expect(screen.getByRole('columnheader', { name: /score/i })).not.toHaveAttribute('aria-sort')
  })

  it('filters on the caller-supplied search text', async () => {
    const user = userEvent.setup()
    render(
      <DataTable
        rows={rows}
        columns={columns}
        getRowId={(r) => r.id}
        getSearchText={(r) => r.name}
        searchPlaceholder="Search people"
      />,
    )

    await user.type(screen.getByRole('searchbox', { name: 'Search people' }), 'ra')
    expect(bodyNames()).toEqual(['Grace', 'Barbara'])
  })

  it('shows a recoverable notice when a search matches nothing', async () => {
    const user = userEvent.setup()
    render(
      <DataTable
        rows={rows}
        columns={columns}
        getRowId={(r) => r.id}
        getSearchText={(r) => r.name}
      />,
    )

    await user.type(screen.getByRole('searchbox'), 'zzz')
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.getByText(/no results/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /clear search/i }))
    expect(bodyNames()).toHaveLength(4)
  })

  it('paginates and clamps the page when filtering shrinks the result set', async () => {
    const user = userEvent.setup()
    render(
      <DataTable
        rows={rows}
        columns={columns}
        getRowId={(r) => r.id}
        getSearchText={(r) => r.name}
        pageSize={2}
      />,
    )

    expect(bodyNames()).toEqual(['Ada', 'Grace'])
    await user.click(screen.getByRole('button', { name: /next page/i }))
    expect(bodyNames()).toEqual(['Linus', 'Barbara'])
    expect(screen.getByText(/page 2 of 2/i)).toBeInTheDocument()

    // Narrowing to a single result must not leave the view stranded on page 2.
    await user.type(screen.getByRole('searchbox'), 'Ada')
    expect(bodyNames()).toEqual(['Ada'])
  })

  it('selects rows and drives bulk actions', async () => {
    const user = userEvent.setup()
    render(
      <DataTable
        rows={rows}
        columns={columns}
        getRowId={(r) => r.id}
        selectable
        getRowLabel={(r) => r.name}
        bulkActions={(selected) => <span>{selected.length} selected</span>}
      />,
    )

    await user.click(screen.getByRole('checkbox', { name: 'Select Ada' }))
    expect(screen.getByText('1 selected')).toBeInTheDocument()

    await user.click(screen.getByRole('checkbox', { name: /select all rows/i }))
    expect(screen.getByText('4 selected')).toBeInTheDocument()
  })

  it('activates a row by keyboard, not just by pointer', async () => {
    const user = userEvent.setup()
    const onRowClick = vi.fn()
    render(
      <DataTable
        rows={rows}
        columns={columns}
        getRowId={(r) => r.id}
        onRowClick={onRowClick}
        getRowLabel={(r) => `Open ${r.name}`}
      />,
    )

    const row = screen.getByRole('button', { name: 'Open Ada' })
    row.focus()
    await user.keyboard('{Enter}')
    expect(onRowClick).toHaveBeenCalledWith(rows[0])
  })

  it('renders the caller empty state only when there are no rows at all', () => {
    render(
      <DataTable
        rows={[]}
        columns={columns}
        getRowId={(r) => r.id}
        empty={<p>Nothing here</p>}
      />,
    )
    expect(screen.getByText('Nothing here')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('does not render rows while loading', () => {
    render(<DataTable rows={rows} columns={columns} getRowId={(r) => r.id} loading />)
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('honours controlled selection', async () => {
    const user = userEvent.setup()
    const onSelectedChange = vi.fn()
    render(
      <DataTable
        rows={rows}
        columns={columns}
        getRowId={(r) => r.id}
        selectable
        selected={new Set(['a'])}
        onSelectedChange={onSelectedChange}
        getRowLabel={(r) => r.name}
      />,
    )

    expect(screen.getByRole('checkbox', { name: 'Select Ada' })).toBeChecked()
    await user.click(screen.getByRole('checkbox', { name: 'Select Grace' }))
    expect(onSelectedChange).toHaveBeenCalledWith(new Set(['a', 'b']))
  })

  it('keeps a column non-sortable when it has no sortValue', () => {
    const plain: DataTableColumn<Row>[] = [
      { key: 'name', header: 'Name', render: (r) => r.name },
    ]
    render(<DataTable rows={rows} columns={plain} getRowId={(r) => r.id} />)
    const header = screen.getByRole('columnheader', { name: 'Name' })
    expect(within(header).queryByRole('button')).not.toBeInTheDocument()
  })
})
