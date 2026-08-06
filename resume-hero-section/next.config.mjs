/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  // The framework and its version, announced on every response. Free
  // reconnaissance, no benefit to us.
  poweredByHeader: false,
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
  // ── Security headers ────────────────────────────────────────────────────────
  // The app previously emitted NONE of these — the only header it set was
  // X-Powered-By, which is the one worth removing. The backend has had a strict
  // set since it was written; the frontend, which is what a browser actually
  // loads, had nothing.
  //
  // Every header here is behaviour-neutral: none of them restricts what the page
  // may load, so none can break Supabase Auth, API calls, PDF export or file
  // downloads. That is the entire selection criterion for this change.
  //
  // WHAT IS DELIBERATELY ABSENT
  //
  // Content-Security-Policy — not here, not even Report-Only. CSP is the header
  // that matters most for this product (it renders model-generated prose) and
  // it is the only one that can break the app, in two specific ways:
  //   * connect-src must name the Supabase project URL, or login and session
  //     refresh fail;
  //   * connect-src must name the API host, or every analysis, Ask AI,
  //     comparison and export call fails while pages still render — which looks
  //     like an AI outage, not a header bug.
  // Both values are environment-specific and neither is knowable from this file.
  // A Report-Only policy with the wrong origins reports noise that gets ignored,
  // which is worse than no policy at all. It ships when the production origins
  // are supplied, as Report-Only first.
  //
  // Strict-Transport-Security — production-only and not settable safely from
  // here: emitting it in dev pins localhost to https in the developer's browser
  // for the max-age. It belongs at the edge (Vercel/proxy), which knows the
  // scheme. The backend already sets it, correctly gated on a TLS request.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Clickjacking. The authenticated surface advances and rejects
          // candidates; those actions must not be frameable.
          { key: 'X-Frame-Options', value: 'DENY' },
          // Stops a browser second-guessing Content-Type on an uploaded or
          // exported file and executing it as something else.
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // URLs carry roleId and candidateId. Without this, the full path —
          // i.e. who is being evaluated — leaks in the Referer of any outbound
          // link. strict-origin-when-cross-origin keeps same-origin navigation
          // and analytics intact, which is why it is preferred here over the
          // backend's blanket no-referrer.
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Denies capabilities the app never uses, so a future injected script
          // cannot ask for them either.
          {
            key: 'Permissions-Policy',
            value: 'geolocation=(), microphone=(), camera=(), payment=(), usb=()',
          },
        ],
      },
    ]
  },

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
