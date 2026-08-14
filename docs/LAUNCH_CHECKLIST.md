# HireLens V4 — Public Launch Checklist

Everything required before the V4 experience is served publicly. Grouped by
blocking severity (see `PRODUCTION_GAPS.md`).

**Revised 12 Aug 2026, after a launch-readiness audit that verified each item
against the code rather than against this file.** Most of what follows was
already done and still listed as outstanding — the routing cutover, robots and
sitemap, the OG images, all four policy pages. A checklist that reports false
gaps is one nobody reads at launch, so the boxes below reflect the repository as
it actually stands, and the items that remain are the ones that genuinely do.

Items marked **[human]** cannot be closed from inside the repository — they need
a credential, a domain or a legal fact that only the owner has.

## 1. Routing & navigation (P0)
- [x] **Dead nav links resolved.** `/roles` and `/analytics` both exist as real
      routes (`app/(hirelens)/roles/page.tsx`, `.../analytics/page.tsx`).
- [x] **Inbox route decided** — Inbox stays at `/home`; nav and `inbox-meta`
      agree.
- [x] **`/foundations` gated.** It is in `V4_PROTECTED` (proxy-guarded) and in
      `DISALLOWED_PATHS`. It still ships to any signed-in user; deleting it is a
      product decision, not a security one.

## 2. `/welcome → /` cutover (P0)
- [x] Marketing owns `/` (`app/(marketing)/page.tsx`). No `/welcome` remains.
- [x] Legacy `/login` and V4 `/auth/*` precedence resolved in
      `lib/auth-routing.ts`, unit-tested in `tests/proxy.test.ts`.

## 3. Environment variables (P0)
- [x] The proxy **fails closed in production** if `NEXT_PUBLIC_SUPABASE_URL` or
      `NEXT_PUBLIC_SUPABASE_ANON_KEY` is missing — it throws rather than serving
      protected routes to anonymous visitors.
- [x] Only four `NEXT_PUBLIC_*` variables exist, all legitimately public. No
      server-only secret is reachable from the client bundle.
- [ ] **[human]** Confirm all of them are set in the production project, and
      that RLS is enabled on the production database (it is enabled in every
      migration; this verifies the deployed project matches).

## 4. SEO & metadata (P1)
- [x] Per-route `metadata` across marketing, auth and product routes.
- [x] `robots.txt` (`app/robots.ts`) and `sitemap.xml` (`app/sitemap.ts`), both
      generated from `PUBLIC_ROUTES` so the two cannot drift.
- [x] Canonical origin centralised in `lib/seo/site.ts` (`SITE_URL`),
      `metadataBase` set in the root layout.
- [x] Open Graph images per marketing route; Twitter card in the root layout.
- [x] Favicons — `icon.svg`, light/dark 32×, `apple-icon`.
- [x] **Protected routes are explicitly `noindex, nofollow`** in
      `app/(hirelens)/layout.tsx` — added 12 Aug 2026. `robots.txt` alone was
      not sufficient: a `Disallow` prevents a fetch, not an indexing.
- [x] **Application-wide `app/not-found.tsx`** — added 12 Aug 2026. The
      route-group 404 does not catch URLs that match no route.
- [ ] **[human]** Set `NEXT_PUBLIC_SITE_URL` if the production domain is not
      `hirelens.app`. Every canonical, OG URL and sitemap entry derives from it.

## 5. Legal & trust (P1)
- [x] Privacy, Terms, Refunds and Contact all published and linked.
- [x] Trust copy asserts no compliance certification it cannot evidence
      (`tests/marketing-claims.test.ts` holds this).
- [x] No cookie banner, and that is the correct answer for the current build:
      analytics is Vercel Web Analytics, which is cookieless.
- [ ] **[human]** `lib/legal.ts` still carries unconfirmed entity fields behind
      `LEGAL_ENTITY_CONFIRMED`. `tests/legal.test.ts` prevents publishing a
      policy with a placeholder left in a governing-law clause — supply the real
      legal entity, address and grievance officer to close it.

## 6. Monitoring & analytics (P1)
- [x] `@vercel/analytics` mounted, production-only.
- [x] **Page-view URLs are redacted before sending** (`lib/analytics/redact.ts`,
      added 12 Aug 2026). Campaign and candidate UUIDs, search terms and hashes
      no longer leave the product surface.
- [x] Backend emits structured logs and request IDs
      (`app/core/observability.py`).
- [ ] **[human] No frontend error monitoring exists.** This is the largest
      remaining gap that code alone cannot close: pick a provider, supply a DSN,
      and scrub candidate PII from breadcrumbs before enabling.
- [ ] **[human]** Uptime checks against the backend health endpoint; alerting on
      provider 429s.

## 7. Performance & accessibility (P1)
- [x] Keyboard focus rings present on every reachable control across the public
      surface (verified 12 Aug 2026 at seven viewports).
- [x] No horizontal document scroll at 320 / 375 / 390 / 430 / 768 / 1280 / 1920.
      Wide policy and pricing tables scroll inside `overflow-x-auto
      [contain:paint]` containers.
- [x] Every image carries `alt`; every interactive control has an accessible
      name; landmarks and `lang` correct.
- [x] Both 404 states now open at `h1` rather than `h2`.
- [ ] The landing hero contains an `h1 → h3` heading skip — a candidate name
      inside a decorative product mock. Cosmetic to a screen reader, not a
      blocker; fix by demoting the mock card title out of the heading outline.
- [ ] **[human]** Lighthouse pass and `prefers-reduced-motion` spot-check.
- [ ] **The authenticated product has not been audited for responsive or a11y
      defects** — it needs a real session, which the audit did not have.

## 8. Final QA checklist
- [x] `pnpm typecheck` → 0
- [x] `pnpm lint` → 0 (was 5 errors + 3 warnings until 12 Aug 2026)
- [x] `pnpm build` → success, 36 static pages
- [x] `pnpm test` → 630 passing across 43 files
- [ ] **[human]** Auth happy paths: sign-up / sign-in / magic link / reset /
      invite, against a real Supabase project.
- [ ] **[human]** Inbox → Decision Intelligence → Approve/Override → Ledger.
- [ ] **[human]** Triage keyboard actions + undo; Deep Review verdict + note.
- [x] Marketing narrative, nav, pricing, FAQ and CTAs render at every viewport.
- [x] 404 renders in the product's own type and colour, and returns a real 404.
