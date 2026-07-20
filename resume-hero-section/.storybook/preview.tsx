import * as React from 'react'
import type { Preview, Decorator } from '@storybook/react-vite'
import '../app/globals.css'
import { TooltipProvider } from '../components/hirelens/ui/tooltip'
import { DensityProvider } from '../components/hirelens/lib/density'
import { CommandRegistryProvider } from '../components/hirelens/command-palette/command-registry'
import { CopilotProvider } from '../components/hirelens/copilot/copilot-context'
import { ShellProvider } from '../components/hirelens/shell/shell-context'

/**
 * Every story renders inside the `.hl` scope with the full V3 provider stack.
 * The Theme and Density toolbar globals drive `data-hl-theme` (on <html>) and
 * `data-hl-density` (on the `.hl` root) — the same mechanism the real app uses.
 */
const withHireLens: Decorator = (Story, context) => {
  const theme = String(context.globals.theme ?? 'light')
  const density = String(context.globals.density ?? 'comfortable')

  React.useEffect(() => {
    document.documentElement.setAttribute('data-hl-theme', theme)
  }, [theme])

  return (
    <div className="hl" data-hl-density={density} style={{ minHeight: '100vh', padding: '24px' }}>
      <DensityProvider>
        <CommandRegistryProvider>
          <ShellProvider>
            <CopilotProvider>
              <TooltipProvider>
                <Story />
              </TooltipProvider>
            </CopilotProvider>
          </ShellProvider>
        </CommandRegistryProvider>
      </DensityProvider>
    </div>
  )
}

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Color theme',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
    density: {
      description: 'Density',
      toolbar: {
        title: 'Density',
        icon: 'component',
        items: [
          { value: 'comfortable', title: 'Comfortable' },
          { value: 'compact', title: 'Compact' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'light', density: 'comfortable' },
  parameters: {
    layout: 'fullscreen',
    controls: { expanded: true },
    viewport: {
      viewports: {
        mobile: { name: 'Mobile · 375', styles: { width: '375px', height: '760px' } },
        tablet: { name: 'Tablet · 768', styles: { width: '768px', height: '900px' } },
        desktop: { name: 'Desktop · 1440', styles: { width: '1440px', height: '920px' } },
      },
    },
  },
  decorators: [withHireLens],
}

export default preview
