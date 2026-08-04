/**
 * Browser QA harness — drives the real product in Chromium.
 *
 * Replaces the blocked Claude-in-Chrome path documented in
 * docs/BROWSER_QA_CHECKLIST.md §0: that extension cannot act on localhost, so
 * every screen in the monetization and redesign work had only ever been checked
 * statically. Playwright talks to the dev server directly and has no such limit.
 *
 * Signs in once with a real Supabase password grant, reuses the storage state,
 * then walks every route across themes and viewport widths capturing both
 * screenshots and machine-checkable page facts (horizontal overflow, console
 * errors, failed requests).
 *
 *   node tests/visual/capture.mjs --out <dir> [--tag free] [--routes home,roles]
 */
import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const BASE = process.env.QA_BASE_URL ?? 'http://127.0.0.1:3000'
const EMAIL = process.env.QA_EMAIL ?? 'qa.browser@hirelens.test'
const PASSWORD = process.env.QA_PASSWORD ?? 'HireLensQA!2026'

const argv = process.argv.slice(2)
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`)
  return i === -1 ? fallback : argv[i + 1]
}

const OUT = arg('out', path.join(process.cwd(), '.qa-shots'))
const TAG = arg('tag', 'run')
const ONLY = arg('routes', null)?.split(',').map((s) => s.trim())

// Route ids are stable filename stems; `wait` is an extra selector to settle on.
const ROUTES = [
  { id: 'marketing-home', url: '/', public: true },
  { id: 'marketing-pricing', url: '/pricing', public: true },
  { id: 'auth-login', url: '/auth/login', public: true, anon: true },
  { id: 'auth-signup', url: '/auth/signup', public: true, anon: true },
  { id: 'dashboard', url: '/home' },
  { id: 'roles', url: '/roles' },
  { id: 'role-pipeline', url: '__ROLE__' },
  { id: 'candidate-detail', url: '__CANDIDATE__' },
  { id: 'ask-copilot', url: '/ask' },
  { id: 'interviews', url: '/interviews' },
  { id: 'analytics', url: '/analytics' },
  { id: 'talent', url: '/talent' },
  { id: 'ledger', url: '/ledger' },
  { id: 'notifications', url: '/notifications' },
  { id: 'settings', url: '/settings' },
  { id: 'settings-billing', url: '/settings/billing' },
  { id: 'settings-members', url: '/settings/members' },
  { id: 'foundations', url: '/foundations' },
]

const VIEWPORTS = [
  { id: 'desktop', width: 1440, height: 900 },
  { id: 'laptop', width: 1280, height: 800 },
]
const THEMES = ['light', 'dark']

const findings = []

/** Sign in through the real two-step form and return the storage state. */
async function signIn(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  await page.goto(`${BASE}/auth/login`, { waitUntil: 'networkidle' })

  // The form is a client component: clicking before hydration is a no-op and the
  // password step never appears, so wait for React to attach first.
  await page.waitForTimeout(2000)
  await page.fill('input[type="email"]', EMAIL)
  await page.getByRole('button', { name: /continue$/i }).click()
  await page.waitForSelector('input[type="password"]', { timeout: 20000 })
  await page.fill('input[type="password"]', PASSWORD)
  await page.getByRole('button', { name: /^sign in$/i }).click()

  await page.waitForURL((u) => !u.pathname.startsWith('/auth/'), { timeout: 45000 })
  const state = await ctx.storageState()
  await ctx.close()
  return state
}

/** Resolve the seeded role + candidate ids by reading the rendered Roles page. */
async function resolveDynamicRoutes(ctx) {
  const page = await ctx.newPage()
  await page.goto(`${BASE}/roles`, { waitUntil: 'networkidle' })
  const roleHref = await page
    .locator('a[href^="/roles/"]')
    .first()
    .getAttribute('href')
    .catch(() => null)

  // Ids, never paths: a `/roles/...` argument gets rewritten to a Windows path by
  // Git Bash's MSYS path conversion before node ever sees it, which silently
  // produced blank captures for both of these routes.
  const roleId = arg('role-id', null)
  const candidateId = arg('candidate-id', null)

  const resolvedRole = roleId ? `/roles/${roleId}` : roleHref
  const candidateHref =
    resolvedRole && candidateId ? `${resolvedRole}/candidates/${candidateId}` : null

  await page.close()
  return { roleHref: resolvedRole, candidateHref }
}

async function capture(ctx, route, theme, viewport) {
  const stem = `${TAG}__${route.id}__${theme}__${viewport.id}`
  const page = await ctx.newPage()
  const consoleErrors = []
  const failedRequests = []
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300))
  })
  page.on('requestfailed', (r) => failedRequests.push(`${r.method()} ${r.url().slice(0, 160)}`))

  await page.setViewportSize({ width: viewport.width, height: viewport.height })

  // Commit the navigation first, THEN try to settle. Going straight for
  // `networkidle` loses the whole screen on any page that holds a connection
  // open (the Role workspace does): the goto rejects and the page is never
  // captured, which is how role-pipeline and candidate-detail came back blank.
  await page.goto(`${BASE}${route.url}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForSelector('main, [role="main"]', { timeout: 30000 }).catch(() => {})
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
  await page.waitForTimeout(2000)

  // Machine-checkable facts that a screenshot alone would not prove.
  const facts = await page.evaluate(() => {
    const de = document.documentElement
    const overflow = de.scrollWidth - de.clientWidth
    const offenders = []
    if (overflow > 1) {
      for (const el of document.querySelectorAll('*')) {
        const r = el.getBoundingClientRect()
        if (r.width > 0 && r.right > de.clientWidth + 1) {
          offenders.push({
            tag: el.tagName.toLowerCase(),
            cls: (el.className?.toString?.() ?? '').slice(0, 120),
            right: Math.round(r.right),
          })
        }
        if (offenders.length >= 8) break
      }
    }
    return {
      theme: de.getAttribute('data-hl-theme'),
      overflowPx: overflow,
      offenders,
      title: document.title,
      bodyText: (document.body.innerText ?? '').replace(/\s+/g, ' ').slice(0, 400),
    }
  })

  await page.screenshot({ path: path.join(OUT, `${stem}.png`), fullPage: true })

  findings.push({
    stem,
    route: route.id,
    url: route.url,
    theme,
    viewport: viewport.id,
    ...facts,
    consoleErrors,
    failedRequests,
  })
  await page.close()
}

const browser = await chromium.launch()
await mkdir(OUT, { recursive: true })

const state = await signIn(browser)

for (const theme of THEMES) {
  const ctx = await browser.newContext({
    storageState: state,
    viewport: { width: 1440, height: 900 },
    colorScheme: theme,
  })
  // next-themes reads this before paint, so the first render is already correct.
  await ctx.addInitScript((t) => {
    try {
      window.localStorage.setItem('hl-theme', t)
    } catch {}
  }, theme)

  const { roleHref, candidateHref } = await resolveDynamicRoutes(ctx)

  for (const route of ROUTES) {
    if (ONLY && !ONLY.includes(route.id)) continue
    let url = route.url
    if (url === '__ROLE__') url = roleHref
    if (url === '__CANDIDATE__') url = candidateHref
    if (!url) {
      findings.push({ stem: `${TAG}__${route.id}__${theme}`, route: route.id, skipped: 'no url resolved' })
      continue
    }
    for (const vp of VIEWPORTS) {
      await capture(ctx, { ...route, url }, theme, vp)
    }
  }
  await ctx.close()
}

// Anonymous pass so the signed-out marketing and auth screens are real.
for (const theme of THEMES) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: theme })
  await ctx.addInitScript((t) => {
    try {
      window.localStorage.setItem('hl-theme', t)
    } catch {}
  }, theme)
  for (const route of ROUTES.filter((r) => r.anon)) {
    if (ONLY && !ONLY.includes(route.id)) continue
    for (const vp of VIEWPORTS) {
      await capture(ctx, { ...route, id: `${route.id}-anon` }, theme, vp)
    }
  }
  await ctx.close()
}

await browser.close()
await writeFile(path.join(OUT, `${TAG}__report.json`), JSON.stringify(findings, null, 2))

const overflowing = findings.filter((f) => (f.overflowPx ?? 0) > 1)
const errored = findings.filter((f) => f.consoleErrors?.length)
console.log(`captured ${findings.filter((f) => !f.skipped).length} screenshots → ${OUT}`)
console.log(`horizontal overflow on ${overflowing.length}`)
for (const f of overflowing) console.log(`  ${f.stem}: +${f.overflowPx}px`, JSON.stringify(f.offenders?.[0] ?? {}))
console.log(`console errors on ${errored.length}`)
for (const f of errored.slice(0, 10)) console.log(`  ${f.stem}: ${f.consoleErrors[0]}`)
for (const f of findings.filter((x) => x.skipped)) console.log(`  SKIPPED ${f.route}: ${f.skipped}`)
