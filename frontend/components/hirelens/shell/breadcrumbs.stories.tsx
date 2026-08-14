import type { Meta, StoryObj } from '@storybook/react-vite'
import { Breadcrumbs } from './breadcrumbs'

const meta: Meta = { title: 'Shell/Breadcrumbs' }
export default meta
type Story = StoryObj

export const Default: Story = {
  render: () => (
    <Breadcrumbs
      items={[
        { label: 'Roles', href: '/roles' },
        { label: 'Senior Backend Engineer' },
      ]}
    />
  ),
}
