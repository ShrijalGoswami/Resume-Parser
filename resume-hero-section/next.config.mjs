/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  // Container builds only. `standalone` emits a self-contained server bundle so
  // the runtime image needs no node_modules, which is the difference between a
  // ~200MB image and a ~1GB one. It is opt-in via the env var rather than always
  // on so the Vercel production build — the deployed path — is byte-for-byte the
  // build that was verified for the release. Set NEXT_OUTPUT_STANDALONE=1 in the
  // Dockerfile; leave it unset everywhere else.
  output: process.env.NEXT_OUTPUT_STANDALONE === '1' ? 'standalone' : undefined,
  // ── Legacy → V4 redirects ───────────────────────────────────────────────────
  // These paths' legacy pages have been removed now that their V4 replacements
  // are production-ready, so the redirect is what keeps old URLs and bookmarks
  // working rather than 404ing. Restoring a legacy page means reverting the
  // commit that deleted it, not just pulling the redirect — `permanent: false`
  // is kept so nothing is cached in browsers meanwhile.
  //
  // Legacy routes with no complete V4 replacement (/insights, /reports, /agent,
  // /knowledge, /predictions) are NOT redirected and stay reachable through the
  // "Classic" nav group.
  async redirects() {
    return [
      // Search → Talent (Talent is a superset: semantic search + similar +
      // collections + compare; it is the app's active discovery surface).
      { source: '/search', destination: '/talent', permanent: false },

      // Campaigns → Roles (same backend campaign IDs; Role Workspace is a superset
      // of the legacy campaign detail). Static/specific sources first.
      { source: '/campaigns/new', destination: '/roles?new=1', permanent: false },
      {
        source: '/campaigns/:id/candidates/:candidateId',
        destination: '/roles/:id/candidates/:candidateId',
        permanent: false,
      },
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
