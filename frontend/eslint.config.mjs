import coreWebVitals from 'eslint-config-next/core-web-vitals'
import typescript from 'eslint-config-next/typescript'

/**
 * Lint scope.
 *
 * Originally this ignored everything outside `components/hirelens` on the grounds
 * that the frozen v1.0 app "was never linted". That reasoning went stale during
 * the V4 migration: `services/`, `lib/`, `types/`, `proxy.ts`,
 * `components/workspace/charts` and `components/interview` are all consumed by
 * the V4 product now, so ignoring them left shipped code — including the auth
 * middleware and every API client — unlinted.
 *
 * What stays ignored is only what is genuinely legacy-only UI, still reachable
 * through the "Classic" nav group but frozen: it is not being changed, and
 * retrofitting it is a separate exercise from keeping the live surface clean.
 */
const eslintConfig = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'next-env.d.ts',
      // Storybook config + stories (dev tooling, not shipped product code).
      '.storybook/**',
      '**/*.stories.tsx',
      'storybook-static/**',
      // Frozen v1.0 UI — reachable but not under active change.
      'app/(legacy)/**',
      'components/ui/**',
      'components/app/**',
      'components/auth/**',
      'components/org/**',
      'components/copilot/**',
      'components/recruiter/**',
    ],
  },
  ...coreWebVitals,
  ...typescript,
]

export default eslintConfig
