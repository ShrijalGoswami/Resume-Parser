import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { SettingsScreen } from '@/components/hirelens/settings/settings-screen'
import { isSettingsSection } from '@/components/hirelens/settings/sections'

export const metadata: Metadata = { title: 'Settings' }

// The 404 status must reach the wire, not just the screen. This route decides
// between a real section and `notFound()` per request, so it must never be
// served from the prerender cache — a cached shell would answer 200 for every
// address and leave monitors, crawlers and log alerting seeing a healthy route
// where there isn't one. Verified against `next start`: unknown sections return
// HTTP 404, known ones 200. The screen is client-rendered and session-gated,
// so no meaningful prerender is being given up.
export const dynamic = 'force-dynamic'

/**
 * Settings is one optional catch-all route, so EVERY `/settings/<anything>` URL
 * resolves here. The section id therefore has to be checked against the real
 * registry before it is rendered — an unmatched id used to fall through to
 * `SECTIONS[0]`, so `/settings/organization` (a group heading in the rail, not a
 * section) silently served Profile under its own URL. A wrong address that
 * answers with a real page is worse than one that admits it is wrong: it makes a
 * typo, a stale bookmark and a renamed section all look like Profile.
 *
 * `/settings` itself is still legitimate and continues to open Profile.
 */
export default async function Page({
  params,
}: {
  params: Promise<{ slug?: string[] }>
}) {
  const { slug } = await params
  // Nested paths (`/settings/profile/extra`) are not routes either — Settings is
  // exactly one level deep.
  if (slug && slug.length > 1) notFound()
  const section = slug?.[0] ?? 'profile'
  if (!isSettingsSection(section)) notFound()
  return <SettingsScreen section={section} />
}
