/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  // ── Controlled migration: legacy → V4 redirects (TEMPORARY / reversible) ────
  // Only routes whose V4 replacement is fully complete and production-ready are
  // redirected. `permanent: false` (307/308-temporary, not browser-cached) so a
  // redirect can be pulled instantly if a parity gap is found. Partial or planned
  // replacements are NOT redirected — those legacy routes stay reachable via the
  // "Classic" nav group until parity is verified and signed off. Nothing here
  // deletes a legacy page; the redirect only forwards the request.
  async redirects() {
    return [
      // Search → Talent (Talent is a superset: semantic search + similar +
      // collections + compare; it is the app's active discovery surface).
      { source: '/search', destination: '/talent', permanent: false },

      // Campaigns → Roles (same backend campaign IDs; Role Workspace is a superset
      // of the legacy campaign detail). Static/specific sources first.
      { source: '/campaigns/new', destination: '/roles?new=1', permanent: false },
      { source: '/campaigns/:id/compare', destination: '/roles/:id?compare=1', permanent: false },
      { source: '/campaigns/:id', destination: '/roles/:id', permanent: false },
      { source: '/campaigns', destination: '/roles', permanent: false },

      // Integrations → Settings ▸ Integrations. The V4 Settings surface already
      // ships the full Integration Hub section (providers, connections, health,
      // automation rules), so the legacy page has a complete replacement.
      { source: '/integrations', destination: '/settings/integrations', permanent: false },

      // Admin → Settings ▸ Members & roles. Everything the legacy Admin page
      // covered now lives in V4 Settings under the Organization group: members
      // & roles, workspaces, billing, API keys, feature flags, usage & audit.
      { source: '/admin', destination: '/settings/members', permanent: false },

      // Dashboard → Inbox. The legacy dashboard was a campaign list plus
      // navigation tiles; campaigns are Roles (already redirected above) and the
      // V4 landing surface is the Decision Inbox.
      { source: '/dashboard', destination: '/home', permanent: false },
    ]
  },
}

export default nextConfig
