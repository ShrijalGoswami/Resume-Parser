import type { Meta, StoryObj } from '@storybook/react-vite'
import { TopBar } from './top-bar'

const meta: Meta = { title: 'Shell/TopBar', parameters: { layout: 'fullscreen' } }
export default meta
type Story = StoryObj

export const WithTitle: Story = {
  render: () => (
    <div className="-m-6">
      <TopBar title="Home" />
    </div>
  ),
}

export const WithBreadcrumbs: Story = {
  render: () => (
    <div className="-m-6">
      <TopBar
        breadcrumbs={[
          { label: 'Roles', href: '/roles' },
          { label: 'Senior Backend Engineer' },
        ]}
        unreadCount={2}
      />
    </div>
  ),
}
