import type { Meta, StoryObj } from '@storybook/react-vite'
import { DensityToggle } from './density-toggle'

const meta: Meta = { title: 'Foundations/DensityToggle' }
export default meta
type Story = StoryObj

export const Default: Story = { render: () => <DensityToggle /> }
