import type { Meta, StoryObj } from '@storybook/react-vite'
import { WorkspaceSwitcher } from './workspace-switcher'

const meta: Meta = { title: 'Shell/WorkspaceSwitcher' }
export default meta
type Story = StoryObj

export const Expanded: Story = { render: () => <WorkspaceSwitcher /> }
export const Collapsed: Story = { render: () => <WorkspaceSwitcher collapsed /> }
