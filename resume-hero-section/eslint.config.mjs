import coreWebVitals from 'eslint-config-next/core-web-vitals'
import typescript from 'eslint-config-next/typescript'

/**
 * Lint scope is the HireLens V3 surface (app/(hirelens), components/hirelens).
 * The frozen v1.0 app was never linted and is intentionally left untouched, so
 * it is ignored here rather than retrofitted.
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
      // Frozen v1.0 — left untouched.
      'app/(legacy)/**',
      'components/ui/**',
      'components/app/**',
      'components/auth/**',
      'components/org/**',
      'components/hero/**',
      'components/copilot/**',
      'components/recruiter/**',
      'components/interview/**',
      'components/workspace/**',
      'services/**',
      'hooks/**',
      'lib/**',
      'types/**',
      'proxy.ts',
    ],
  },
  ...coreWebVitals,
  ...typescript,
]

export default eslintConfig
