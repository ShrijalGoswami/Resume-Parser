import type { Meta, StoryObj } from '@storybook/react-vite'
import { Avatar } from './avatar'

const meta = {
  title: 'Primitives/Avatar',
  component: Avatar,
  tags: ['autodocs'],
  args: { name: 'Aarav Sharma' },
} satisfies Meta<typeof Avatar>

export default meta
type Story = StoryObj<typeof meta>

export const Initials: Story = {}
export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Avatar name="Aarav Sharma" size={20} />
      <Avatar name="Sneha Rao" size={24} />
      <Avatar name="Priya Menon" size={32} />
      <Avatar name="Kabir Khan" size={40} />
    </div>
  ),
}
export const DeterministicColors: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      {['Aarav Sharma', 'Sneha Rao', 'Priya Menon', 'Kabir Khan', 'Diya Patel'].map((name) => (
        <Avatar key={name} name={name} size={32} />
      ))}
    </div>
  ),
}
