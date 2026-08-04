/**
 * Interaction walkthrough — drives REAL Chrome through the product the way a
 * person uses it, and captures the states that only exist mid-interaction.
 *
 * This is the companion to capture.mjs, not a replacement. capture.mjs proves
 * every screen renders; it only ever sees resting state. Everything a designer
 * actually judges — the hover, the focus ring, the drawer sliding in, the
 * validation message, the skeleton before data lands — is invisible to it.
 *
 * Run headed so the interactions are real ones against a real compositor:
 *   node tests/visual/walkthrough.mjs --role-id <id> [--headless]
 *
 * Each step writes `<n>-<name>.png` plus a line in `walkthrough.json` recording
 * what was asserted about that state, so a reviewer can tell an intended
 * treatment from an accident.
 */
import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const argv = process.argv.slice(2)
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`)
  return i === -1 ? d : argv[i + 1]
}
const BASE = 'http://127.0.0.1:3000'
const OUT = arg('out', path.join(process.cwd(), '.qa-walk'))
const ROLE_ID = arg('role-id', null)
const THEME = arg('theme', 'light')
const HEADLESS = argv.includes('--headless')

await mkdir(OUT, { recursive: true })

const log = []
let n = 0

const browser = await chromium.launch({
  channel: 'chrome',
  headless: HEADLESS,
  args: ['--force-device-scale-factor=1'],
})
const ctx = await browser.newContext({
  viewport: { width: Number(arg('width', 1440)), height: 900 },
  colorScheme: THEME,
  // Real input timing: instant synthetic clicks skip hover/active entirely.
  hasTouch: false,
})
await ctx.addInitScript((t) => {
  try {
    localStorage.setItem('hl-theme', t)
  } catch {}
}, THEME)

const page = await ctx.newPage()
const consoleErrors = []
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200))
})

async function shot(name, note, target) {
  n += 1
  const file = `${String(n).padStart(2, '0')}-${name}.png`
  const el = target ? await page.$(target) : null
  if (el) await el.screenshot({ path: path.join(OUT, file) }).catch(() => page.screenshot({ path: path.join(OUT, file) }))
  else await page.screenshot({ path: path.join(OUT, file) })
  log.push({ step: n, name, note, file })
  console.log(`${String(n).padStart(2, '0')}  ${name} — ${note}`)
}

async function settle(ms = 900) {
  await page.waitForTimeout(ms)
}

// ── 1. Sign-in, including a wrong password ──────────────────────────────────
await page.goto(`${BASE}/auth/login`, { waitUntil: 'networkidle' })
await settle(1500)
await shot('login-rest', 'sign-in, resting')

// Focus ring on a real control in the assembled app (it was only ever checked
// in Storybook, which is where the invisible-ring bug hid).
await page.keyboard.press('Tab')
await settle(400)
await shot('login-focus-1', 'first Tab stop — focus ring visible?')
await page.keyboard.press('Tab')
await settle(400)
await shot('login-focus-2', 'second Tab stop')

await page.fill('input[type="email"]', 'qa.browser@hirelens.test')
await page.getByRole('button', { name: /^continue$/i }).hover()
await settle(500)
await shot('login-cta-hover', 'primary CTA hover state')
await page.getByRole('button', { name: /^continue$/i }).click()
await page.waitForSelector('input[type="password"]')
await settle(700)
await shot('login-password-step', 'step 2 — transition from email to password')

await page.fill('input[type="password"]', 'definitely-wrong')
await page.getByRole('button', { name: /^sign in$/i }).click()
await settle(2500)
await shot('login-error', 'WRONG PASSWORD — error state and its treatment')

await page.fill('input[type="password"]', 'HireLensQA!2026')
const signIn = page.getByRole('button', { name: /^sign in$/i })
await signIn.click()
await settle(350)
await shot('login-loading', 'submit in flight — button loading state')
await page.waitForURL((u) => !u.pathname.startsWith('/auth/'), { timeout: 45000 })
await settle(2500)

// ── 2. Shell: nav hover, keyboard focus, collapse ───────────────────────────
await shot('dashboard-rest', 'Inbox, resting')
await page.getByRole('link', { name: /^Roles$/ }).hover()
await settle(500)
await shot('nav-hover', 'rail item hover vs the active item above it')

await page.keyboard.press('Tab')
await page.keyboard.press('Tab')
await settle(400)
await shot('shell-focus', 'keyboard focus inside the shell')

const collapse = page.getByRole('button', { name: /collapse/i }).first()
if (await collapse.count()) {
  await collapse.click()
  await settle(1200)
  await shot('nav-collapsed', 'rail collapsed — icon-only state')
  const railItem = page.locator('nav a').nth(2)
  await railItem.hover()
  await settle(700)
  await shot('nav-collapsed-tooltip', 'collapsed rail tooltip')
  await page.getByRole('button', { name: /expand|collapse/i }).first().click()
  await settle(1000)
}

// ── 3. Command palette ──────────────────────────────────────────────────────
await page.keyboard.press('Control+k')
await settle(1000)
await shot('command-palette', 'Cmd-K palette — overlay, scrim, elevation')
await page.keyboard.press('Escape')
await settle(700)

// ── 4. Roles: card hover ────────────────────────────────────────────────────
await page.goto(`${BASE}/roles`, { waitUntil: 'domcontentloaded' })
await settle(2500)
await page.locator('a[href^="/roles/"]').first().hover()
await settle(600)
await shot('role-card-hover', 'role card hover — lift/elevation change')

// ── 5. Pipeline: row hover, popover, drawer ─────────────────────────────────
if (ROLE_ID) {
  await page.goto(`${BASE}/roles/${ROLE_ID}`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('table, [role="grid"]', { timeout: 30000 }).catch(() => {})
  await settle(3000)
  await shot('pipeline-rest', 'pipeline table, resting')

  const row = page.locator('tbody tr').first()
  if (await row.count()) {
    await row.hover()
    await settle(600)
    await shot('pipeline-row-hover', 'table row hover')
  }

  const stage = page.locator('tbody tr').first().locator('select, button').first()
  if (await stage.count()) {
    await stage.click().catch(() => {})
    await settle(900)
    await shot('pipeline-stage-open', 'stage control opened — popover/select')
    await page.keyboard.press('Escape')
    await settle(500)
  }

  // Open the candidate drawer the way a user does: click the name.
  const name = page.locator('tbody tr').first().locator('td').nth(1)
  await name.click().catch(() => {})
  await settle(1600)
  await shot('candidate-drawer', 'candidate drawer/peek — entry, scrim, elevation')
  await page.mouse.wheel(0, 600)
  await settle(800)
  await shot('candidate-drawer-scrolled', 'drawer scrolled — nested scroll + sticky')
  await page.keyboard.press('Escape')
  await settle(900)
  await shot('drawer-dismissed', 'after Escape — did it close cleanly')
}

// ── 6. Analytics: charts ────────────────────────────────────────────────────
await page.goto(`${BASE}/analytics`, { waitUntil: 'domcontentloaded' })
await settle(3500)
await shot('analytics-rest', 'analytics, resting — bars should have height')
const bar = page.locator('[role="img"]').first()
if (await bar.count()) {
  await bar.hover()
  await settle(600)
  await shot('analytics-bar-hover', 'histogram bar hover — tooltip?')
}
await page.mouse.wheel(0, 900)
await settle(900)
await shot('analytics-scrolled', 'analytics scrolled — sticky header behaviour')

// ── 7. Ask: submit a question, catch the loading state ──────────────────────
await page.goto(`${BASE}/ask`, { waitUntil: 'domcontentloaded' })
await settle(3000)
await shot('ask-rest', 'Ask, empty state')
const composer = page.locator('textarea').first()
if (await composer.count()) {
  await composer.click()
  await settle(400)
  await shot('ask-composer-focus', 'composer focused — focus treatment on a large field')
  await composer.fill('Which candidates should I shortlist next?')
  await settle(500)
  await shot('ask-composer-filled', 'composer with content — send button enabled state')
  await page.keyboard.press('Enter')
  await settle(1200)
  await shot('ask-thinking', 'answer in flight — AI loading/streaming treatment')
  await settle(6000)
  await shot('ask-answer', 'answer settled')
}

// ── 8. Talent: search + empty results ───────────────────────────────────────
await page.goto(`${BASE}/talent`, { waitUntil: 'domcontentloaded' })
await settle(2500)
const talentInput = page.locator('input[type="text"], input:not([type])').first()
if (await talentInput.count()) {
  await talentInput.fill('quantum blacksmith with a pilot licence')
  await page.getByRole('button', { name: /^search$/i }).click().catch(() => {})
  await settle(1000)
  await shot('talent-searching', 'search in flight — loading state')
  await settle(6000)
  await shot('talent-no-results', 'deliberately absurd query — empty-results state')
}

// ── 9. Settings: form + validation ──────────────────────────────────────────
await page.goto(`${BASE}/settings`, { waitUntil: 'domcontentloaded' })
await settle(2500)
await shot('settings-rest', 'Settings ▸ Profile, resting')
// The profile email field is deliberately disabled, so pick an editable one.
const field = page.locator('input[type="text"]:not([disabled]), input:not([type]):not([disabled])').first()
if (await field.count()) {
  await field.click()
  await settle(400)
  await shot('settings-field-focus', 'text field focused — ring treatment')
  // Emptying the field and SAVING used to be the check here. It persisted:
  // it wiped the QA account's full_name, which then showed up two runs later
  // as a blank greeting and a "?" avatar that looked like a rendering bug.
  // A walkthrough must not mutate the data it is inspecting — clear the field
  // to see the empty/invalid treatment, then restore it without submitting.
  const original = await field.inputValue()
  await field.fill('')
  await settle(600)
  await shot('settings-field-empty', 'required field emptied — empty/invalid treatment (not saved)')
  await field.fill(original)
  await settle(300)
}

// ── 10. Theme toggle, live ──────────────────────────────────────────────────
await page.goto(`${BASE}/home`, { waitUntil: 'domcontentloaded' })
await settle(2500)
const toggle = page.locator('button:has(svg)').filter({ hasNot: page.locator('nav') })
const themeBtn = page.getByRole('button', { name: /theme|dark|light/i }).first()
if (await themeBtn.count()) {
  await themeBtn.click()
  await settle(1200)
  await shot('theme-toggled', 'theme switched live — any flash or mismatched surface')
}

await writeFile(path.join(OUT, 'walkthrough.json'), JSON.stringify({ steps: log, consoleErrors }, null, 2))
console.log(`\n${n} states captured → ${OUT}`)
if (consoleErrors.length) {
  const unique = [...new Set(consoleErrors)]
  console.log(`console errors (${unique.length} unique):`)
  for (const e of unique.slice(0, 8)) console.log('  ' + e)
}
await browser.close()
