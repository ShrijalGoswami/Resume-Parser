# HireLens V4 — Public Launch Checklist

Everything required before the V4 experience is served publicly. Boxes are unchecked;
owners fill in as completed. Grouped by blocking severity (see `PRODUCTION_GAPS.md`).

## 1. Routing & navigation (P0)
- [ ] **Resolve dead nav links.** `Roles → /roles` (only `/roles/[roleId]` exists) and `Analytics → /analytics` (no route) currently 404. Either build the index/analytics pages or hide/relabel the nav items in `components/hirelens/shell/nav-config.ts`.
- [ ] **Inbox route** — decide whether Inbox stays at `/home` or flips to a canonical `/inbox` (update `home/inbox-meta.ts` note + nav-config).
- [ ] Remove or gate the `/foundations` dev showcase route for production.

## 2. `/welcome → /` cutover (P0)
- [ ] Retire or repoint the legacy landing that owns `/`.
- [ ] Move the marketing route from `app/(marketing)/welcome` to the root of the group (or add a root redirect). Components use hash anchors + root-relative `/auth/*` links, so **no component changes are required** — only routing.
- [ ] Confirm legacy auth (`/login`) vs V4 auth (`/auth/*`) precedence post-cutover.

## 3. Environment variables (P0)
- [ ] `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (screens degrade to a calm "not configured" state if missing — verify set in prod).
- [ ] `NEXT_PUBLIC_API_URL` (FastAPI AI backend base).
- [ ] Any AI-gateway / provider keys consumed server-side.
- [ ] Verify Supabase RLS policies are enabled in the production project.

## 4. SEO & metadata (P1)
- [ ] Per-route `metadata` (titles/descriptions) — marketing done; audit product routes.
- [ ] `robots.txt` (`app/robots.ts`) — allow marketing, disallow authenticated/app routes.
- [ ] `sitemap.xml` (`app/sitemap.ts`) — public marketing + any public pages.
- [ ] Canonical URLs (esp. after `/welcome → /`).
- [ ] Open Graph / Twitter card images (`app/opengraph-image`, `app/twitter-image`) — 1200×630, editorial dark aesthetic; add `og:*` metadata to the marketing layout.
- [ ] Favicons already present (`icon.svg`, light/dark 32×, apple-icon) — confirm.

## 5. Legal & trust (P1)
- [ ] Privacy Policy, Terms of Service, Security pages (marketing footer intentionally omits links until these exist).
- [ ] Cookie/consent handling if analytics set cookies in-region.
- [ ] Ensure the marketing trust section states only verifiable facts (no compliance claims) — currently compliant.

## 6. Monitoring & analytics (P1)
- [ ] Error monitoring (e.g. Sentry) for both frontend and the AI backend.
- [ ] Uptime/health checks (AI backend has a health module).
- [ ] Web analytics — `@vercel/analytics` is already mounted in the root layout; confirm consent + prod project.
- [ ] Log/alert on AI backend 429s and provider failures.

## 7. Performance & accessibility (P1)
- [ ] Lighthouse pass on `/welcome` and key app routes.
- [ ] Verify prefers-reduced-motion paths (rack-focus, marketing).
- [ ] Confirm keyboard flows (⌘K, Triage A/R/S/D, Deep Review A/S/R, marketing anchor nav).

## 8. Final QA checklist
- [ ] `npx tsc --noEmit` → 0
- [ ] `npx eslint .` → 0
- [ ] `npx next build` → success
- [ ] Auth: sign-up / sign-in / magic link / reset / invite happy paths.
- [ ] Inbox → Decision Intelligence → Approve/Override → Ledger reflects the decision.
- [ ] Triage: grouping, keyboard actions + undo, Bulk Confirm apply.
- [ ] Deep Review: verdict, decision actions, note.
- [ ] Marketing: full-scroll narrative, nav active-highlight, pricing, FAQ, CTAs.
- [ ] Mobile/responsive spot-check of shell + marketing.
- [ ] 404/empty/error/unconfigured states render calmly on every surface.
