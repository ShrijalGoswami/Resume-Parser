import type { Meta, StoryObj } from '@storybook/react-vite'
import { LeftNav } from './left-nav'

/** Collapses automatically below 1280 — use the Desktop viewport to see it expanded. */
const meta: Meta = { title: 'Shell/LeftNav', parameters: { layout: 'fullscreen' } }
export default meta
type Story = StoryObj

export const Default: Story = {
  render: () => (
    <div className="h-[620px]">
      <LeftNav account={{ name: 'Alex Rivera', email: 'alex@acme.co' }} />
    </div>
  ),
}
