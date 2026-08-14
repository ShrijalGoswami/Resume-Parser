import type { Meta, StoryObj } from '@storybook/react-vite'
import { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs'

const meta: Meta = { title: 'Primitives/Tabs' }
export default meta
type Story = StoryObj

export const Segmented: Story = {
  render: () => (
    <Tabs defaultValue="pipeline" className="w-96">
      <TabsList variant="segmented">
        <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
        <TabsTrigger value="forecast">Forecast</TabsTrigger>
      </TabsList>
      <TabsContent value="pipeline" className="hl-small pt-3 text-hl-fg-secondary">
        The LensSwitcher style.
      </TabsContent>
      <TabsContent value="analytics" className="hl-small pt-3 text-hl-fg-secondary">
        Analytics content.
      </TabsContent>
      <TabsContent value="forecast" className="hl-small pt-3 text-hl-fg-secondary">
        Forecast content.
      </TabsContent>
    </Tabs>
  ),
}

export const Underline: Story = {
  render: () => (
    <Tabs defaultValue="overview" className="w-96">
      <TabsList variant="underline">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="analysis">Analysis</TabsTrigger>
        <TabsTrigger value="notes">Notes</TabsTrigger>
      </TabsList>
      <TabsContent value="overview" className="hl-small pt-3 text-hl-fg-secondary">
        Content tab style.
      </TabsContent>
      <TabsContent value="analysis" className="hl-small pt-3 text-hl-fg-secondary">
        Analysis content.
      </TabsContent>
      <TabsContent value="notes" className="hl-small pt-3 text-hl-fg-secondary">
        Notes content.
      </TabsContent>
    </Tabs>
  ),
}
