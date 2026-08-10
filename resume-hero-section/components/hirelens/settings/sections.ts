/**
 * The Settings section registry — ids only, in one server-safe module.
 *
 * This is deliberately NOT inside `settings-screen.tsx`. That file is
 * `'use client'`, and a server component importing a value from a client module
 * receives a client-reference proxy rather than the value, so the route's
 * `SETTINGS_SECTION_IDS.includes(...)` check threw `includes is not a function`
 * instead of validating anything. The ids have to live somewhere both sides can
 * read for real.
 *
 * `SectionDef.id` in `settings-screen.tsx` is typed as `SettingsSectionId`, so a
 * section added to the screen without an id here is a compile error — the route
 * and the rail cannot drift apart.
 */
export const SETTINGS_SECTION_IDS = [
  'profile',
  'preferences',
  'members',
  'workspaces',
  'billing',
  'api-keys',
  'feature-flags',
  'integrations',
  'ai-gateway',
  'usage',
] as const

export type SettingsSectionId = (typeof SETTINGS_SECTION_IDS)[number]

/** True when `value` names a real Settings section. */
export function isSettingsSection(value: string): value is SettingsSectionId {
  return (SETTINGS_SECTION_IDS as readonly string[]).includes(value)
}
