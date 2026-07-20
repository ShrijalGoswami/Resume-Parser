import * as React from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { OfflineBanner } from './offline-banner'

const meta: Meta = { title: 'States/OfflineBanner' }
export default meta
type Story = StoryObj

/** Forces the offline state so the real component renders (it hides when online). */
function ForceOffline({ children }: { children: React.ReactNode }) {
  React.useLayoutEffect(() => {
    const original = Object.getOwnPropertyDescriptor(window.navigator, 'onLine')
    Object.defineProperty(window.navigator, 'onLine', { configurable: true, get: () => false })
    window.dispatchEvent(new Event('offline'))
    return () => {
      if (original) Object.defineProperty(window.navigator, 'onLine', original)
      window.dispatchEvent(new Event('online'))
    }
  }, [])
  return <>{children}</>
}

export const Offline: Story = {
  render: () => (
    <ForceOffline>
      <div className="-m-6">
        <OfflineBanner />
      </div>
    </ForceOffline>
  ),
}
