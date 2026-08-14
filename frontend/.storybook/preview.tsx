import * as React from 'react'
import type { Preview, Decorator } from '@storybook/react-vite'
import '../app/globals.css'
import { TooltipProvider } from '../components/hirelens/ui/tooltip'
import { CommandRegistryProvider } from '../components/hirelens/command-palette/command-registry'
import { ShellProvider } from '../components/hirelens/shell/shell-context'
import { ApiProvider } from '../components/hirelens/lib/api/query-client'

/**
 * Every story renders inside the `.hl` scope with the full V3 provider stack.
 * The Theme toolbar global drives `data-hl-theme` on <html> — the same
 * mechanism the real app uses.
 *
 * The Density provider and the `data-hl-density` attribute used to be wired in
 * here too. The user-facing density toggle was removed on 28 Jul 2026 and
 * `components/hirelens/lib/density` deleted with it, but this file kept
 * importing it — so Storybook failed to boot with an unresolved-import overlay
 * from that day until 3 Aug 2026. Nothing reads `data-hl-density` any more;
 * the product has one deliberate density, set by the spacing scale.
 */
const withHireLens: Decorator = (Story, context) => {
  const theme = String(context.globals.theme ?? 'light')

  React.useEffect(() => {
    document.documentElement.setAttribute('data-hl-theme', theme)
  }, [theme])

  return (
    <div className="hl" style={{ minHeight: '100vh', padding: '24px' }}>
      {/* `ApiProvider` (React Query) is part of the real provider stack and was
          missing here, so every shell component that reads `useOrgContext` —
          LeftNav, TopBar — rendered Storybook's "No QueryClient set" error
          panel instead of the component. The rail and the top bar were
          therefore the two surfaces NOBODY could review in Storybook, which is
          the opposite of what you want from a component workshop. Queries fail
          fast and fall back to their undefined state, which is exactly the
          shape the components already handle (see the nav's note on why a
          failed `/org/context` must not paint locks). */}
      <ApiProvider>
        <CommandRegistryProvider>
          <ShellProvider>
            <TooltipProvider>
              <Story />
            </TooltipProvider>
          </ShellProvider>
        </CommandRegistryProvider>
      </ApiProvider>
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
  },
  initialGlobals: { theme: 'light' },
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
