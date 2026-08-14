/**
 * Origin ("scheme://host:port") of a URL, or '' if it is absent/unparseable.
 * CSP source expressions are origins — a full URL with a path is silently
 * ignored by the browser, which is the worst way for this to be wrong.
 */
function originOf(url) {
  try {
    return url ? new URL(url).origin : ''
  } catch {
    return ''
  }
}

/**
 * The Content-Security-Policy header, or null when it cannot be built safely.
 *
 * Returns null — emitting nothing — when the Supabase or API origin is missing,
 * rather than emitting a policy that would block them. A missing header is the
 * status quo; a wrong one is an outage.
 */
function buildCsp() {
  const mode = (process.env.CSP_MODE || '').toLowerCase()
  // Off in development by default: Turbopack's HMR needs eval and websockets,
  // and a dev-only violation stream trains people to ignore the report.
  const defaultMode = process.env.NODE_ENV === 'production' ? 'report-only' : 'off'
  const resolved = ['off', 'report-only', 'enforce'].includes(mode) ? mode : defaultMode
  if (resolved === 'off') return null

  const supabase = originOf(process.env.NEXT_PUBLIC_SUPABASE_URL)
  const api = originOf(process.env.NEXT_PUBLIC_API_URL)
  if (!supabase || !api) return null

  // Supabase Auth refresh and Realtime use the same origin over websockets.
  const supabaseWs = supabase.replace(/^http/, 'ws')

  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    // No plugins, and nothing may frame this app — the authenticated surface
    // advances and rejects candidates.
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    // See the note above: inline is required by the App Router bootstrap.
    "script-src 'self' 'unsafe-inline'",
    // Tailwind and next/font emit inline style; there is no nonce path for it.
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    // Avatars and exported assets come from Supabase Storage; data:/blob: cover
    // generated previews. Deliberately not `https:` — an open image-src is a
    // usable exfiltration channel.
    `img-src 'self' data: blob: ${supabase}`,
    // THE DIRECTIVE THAT EARNS THIS HEADER: the only hosts the page may talk to.
    `connect-src 'self' ${api} ${supabase} ${supabaseWs}`,
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "frame-src 'none'",
    "media-src 'self'",
    'upgrade-insecure-requests',
  ]

  return {
    key: resolved === 'enforce'
      ? 'Content-Security-Policy'
      : 'Content-Security-Policy-Report-Only',
    value: directives.join('; '),
  }
}

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
  // CONTENT-SECURITY-POLICY (M-5)
  //
  // This used to be absent, with the reasoning that connect-src must name the
  // Supabase project and the API host and that neither is knowable from this
  // file. The first half was right; the second was not. Both origins are
  // already in the environment as NEXT_PUBLIC_SUPABASE_URL and
  // NEXT_PUBLIC_API_URL — the same values the browser is about to call — so the
  // policy is derived from them rather than hardcoded. If either is missing the
  // policy is not emitted at all, because a policy with the wrong origins breaks
  // login and every analysis call while pages still render, which looks like an
  // AI outage rather than a header bug.
  //
  // REPORT-ONLY BY DEFAULT, and this is the point rather than a hedge. A
  // blocking policy that is wrong takes the product down; a Report-Only one that
  // is wrong costs a console warning. Promote with CSP_MODE=enforce once the
  // report endpoint is quiet.
  //
  // WHAT THIS POLICY DOES AND DOES NOT BUY
  // `script-src` includes 'unsafe-inline' because the App Router bootstraps
  // itself from inline scripts; removing it needs per-request nonces, which
  // means generating them in the proxy and threading them through — a change
  // well beyond this fix. So this policy does NOT stop injected inline script.
  // Stated plainly so nobody reads the header and assumes XSS is solved: what it
  // does stop is loading script from an unlisted origin, framing, form
  // hijacking, plugin/object embedding, and — the one that matters most for a
  // product rendering model-generated prose — exfiltration to any host not named
  // in connect-src.
  //
  // Strict-Transport-Security — production-only and not settable safely from
  // here: emitting it in dev pins localhost to https in the developer's browser
  // for the max-age. It belongs at the edge (Vercel/proxy), which knows the
  // scheme. The backend already sets it, correctly gated on a TLS request.
  async headers() {
    const csp = buildCsp()
    return [
      {
        source: '/:path*',
        headers: [
          // Only present when the origins it needs are actually configured;
          // `buildCsp` returns null rather than emit a policy that would block
          // login and every API call.
          ...(csp ? [csp] : []),
          // Clickjacking. The authenticated surface advances and rejects
          // candidates; those actions must not be frameable. Kept alongside
          // frame-ancestors for browsers that predate CSP Level 2.
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
