import type { StorybookConfig } from '@storybook/react-vite'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import tailwindcss from '@tailwindcss/vite'

const here = dirname(fileURLToPath(import.meta.url))

const config: StorybookConfig = {
  stories: ['../components/hirelens/**/*.stories.@(ts|tsx)'],
  addons: [],
  framework: { name: '@storybook/react-vite', options: {} },
  async viteFinal(viteConfig) {
    viteConfig.plugins = viteConfig.plugins ?? []
    viteConfig.plugins.push(tailwindcss())
    viteConfig.resolve = viteConfig.resolve ?? {}
    viteConfig.resolve.alias = {
      ...(viteConfig.resolve.alias ?? {}),
      '@': resolve(here, '..'),
      'next/link': resolve(here, 'mocks/next-link.tsx'),
      'next/navigation': resolve(here, 'mocks/next-navigation.tsx'),
    }
    return viteConfig
  },
}

export default config
