import type { Meta, StoryObj } from '@storybook/react-vite'
import { ThemeToggle } from './theme-toggle'
import { ThemeProvider } from './theme-provider'

const meta: Meta = { title: 'Foundations/ThemeToggle' }
export default meta
type Story = StoryObj

export const Default: Story = {
  render: () => (
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>
  ),
}
