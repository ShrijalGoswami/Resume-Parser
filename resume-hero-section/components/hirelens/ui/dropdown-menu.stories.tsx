import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from './dropdown-menu'
import { Button } from './button'

const meta: Meta = { title: 'Primitives/DropdownMenu' }
export default meta
type Story = StoryObj

export const Default: Story = {
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary">Open menu</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Candidate</DropdownMenuLabel>
        <DropdownMenuItem>Compare</DropdownMenuItem>
        <DropdownMenuItem>Add to role</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>Reject</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
}
