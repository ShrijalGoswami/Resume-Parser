import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerTitle,
} from './drawer'
import { Button } from './button'

/** Rack Focus (Design Bible §1.7): the surface behind dims, desaturates, and blurs while the panel resolves sharp. */
const meta: Meta = { title: 'Primitives/Drawer (Rack Focus)' }
export default meta
type Story = StoryObj

function Example({ size }: { size?: 'candidate' | 'wide' }) {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="secondary">Open {size ?? 'candidate'} drawer</Button>
      </DrawerTrigger>
      <DrawerContent size={size}>
        <DrawerHeader>
          <div>
            <DrawerTitle>Aarav Sharma</DrawerTitle>
            <p className="hl-small text-hl-fg-secondary">Senior Backend Engineer</p>
          </div>
        </DrawerHeader>
        <DrawerBody>
          <p className="hl-body text-hl-fg-secondary">
            The surface behind dims, desaturates, and blurs while this panel
            resolves sharp — the signature Rack Focus interaction.
          </p>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  )
}

export const Candidate: Story = { render: () => <Example size="candidate" /> }
export const Wide: Story = { render: () => <Example size="wide" /> }
