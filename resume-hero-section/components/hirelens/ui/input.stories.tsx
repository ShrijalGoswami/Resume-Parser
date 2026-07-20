import type { Meta, StoryObj } from '@storybook/react-vite'
import { Input } from './input'

const meta = {
  title: 'Primitives/Input',
  component: Input,
  tags: ['autodocs'],
  args: { placeholder: 'Search or ask…' },
} satisfies Meta<typeof Input>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Error: Story = { args: { variant: 'error', defaultValue: 'Invalid value' } }
export const Disabled: Story = { args: { disabled: true, defaultValue: 'Disabled' } }
export const States: Story = {
  render: () => (
    <div className="flex max-w-sm flex-col gap-3">
      <Input placeholder="Default" />
      <Input variant="error" defaultValue="Invalid value" />
      <Input disabled defaultValue="Disabled" />
    </div>
  ),
}
