import type { Meta, StoryObj } from '@storybook/react-vite'
import { Sparkles } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './card'
import { Button } from './button'

const meta: Meta = { title: 'Primitives/Card' }
export default meta
type Story = StoryObj

export const Default: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>Default card</CardTitle>
        <CardDescription>Resting surface with a hairline border.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="hl-small text-hl-fg-secondary">Content region.</p>
      </CardContent>
    </Card>
  ),
}

export const Variants: Story = {
  render: () => (
    <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Default</CardTitle>
          <CardDescription>Resting surface.</CardDescription>
        </CardHeader>
      </Card>
      <Card variant="interactive">
        <CardHeader>
          <CardTitle>Interactive</CardTitle>
          <CardDescription>Lifts on hover.</CardDescription>
        </CardHeader>
      </Card>
      <Card variant="ai">
        <CardHeader>
          <CardTitle>
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="size-4 text-hl-prism-mid" /> AI surface
            </span>
          </CardTitle>
          <CardDescription>Prism gradient border.</CardDescription>
        </CardHeader>
      </Card>
      <Card variant="approval">
        <CardHeader>
          <CardTitle>Approval</CardTitle>
          <CardDescription>Decision object.</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button variant="primary" size="sm">
            Approve
          </Button>
          <Button variant="ghost" size="sm">
            Dismiss
          </Button>
        </CardContent>
      </Card>
    </div>
  ),
}
