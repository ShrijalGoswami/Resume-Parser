import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.{ts,tsx}'],
    // The proxy is a no-op without Supabase env; set test values so the auth
    // logic is exercised.
    env: {
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
    },
  },
  resolve: {
    alias: {
      '@': root,
      // `next/font/google` is a build-time construct with no runtime module —
      // see tests/stubs/next-font-google.ts. Test environment only; the real
      // loader is untouched in every build.
      'next/font/google': fileURLToPath(
        new URL('./tests/stubs/next-font-google.ts', import.meta.url),
      ),
    },
  },
})
