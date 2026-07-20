import type { Meta, StoryObj } from '@storybook/react-vite'
import { Toaster } from './toast'
import { toast } from './use-toast'
import { Button } from './button'

const meta: Meta = { title: 'Primitives/Toast' }
export default meta
type Story = StoryObj

export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Button
        variant="secondary"
        onClick={() => toast({ variant: 'success', title: 'Shortlisted 5 candidates' })}
      >
        Success
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          toast({
            variant: 'info',
            title: 'Moved to Interview',
            action: { label: 'Undo', onClick: () => toast({ title: 'Reverted' }) },
          })
        }
      >
        With undo
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          toast({
            variant: 'warning',
            title: 'Approaching your token limit',
          })
        }
      >
        Warning
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          toast({
            variant: 'danger',
            title: "Couldn't reach the server",
            description: 'Try again in a moment.',
          })
        }
      >
        Danger
      </Button>
      <Toaster />
    </div>
  ),
}
