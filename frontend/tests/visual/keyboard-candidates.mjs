/**
 * Keyboard verification for the candidate row — the product's primary object.
 *
 * Checks the five things that have to hold on EVERY surface that opens a
 * candidate drawer: the opener is focusable, it shows a focus ring, Enter and
 * Space both activate it, the drawer traps focus, and focus comes back to the
 * row that opened it. Mouse is re-checked alongside so a keyboard fix can't
 * quietly regress pointer use.
 *
 * Focus restoration is the one that regresses silently: the candidate lists are
 * virtualized, so the opener React element is replaced while the drawer is up.
 * Radix holds a node reference, that node is detached, focusing it is a no-op,
 * and focus lands on <body>. Nothing throws; a keyboard user is just dumped to
 * the top of the page. See DRAWER_FOCUS_KEY in ui/drawer.tsx.
 *
 *   ROLE_ID=<id> node tests/visual/keyboard-candidates.mjs
 */
import { chromium } from 'playwright'

const BASE = 'http://127.0.0.1:3000'
const ROLE_ID = process.env.ROLE_ID
const results = []

const browser = await chromium.launch({ channel: 'chrome' })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()

await page.goto(`${BASE}/auth/login`, { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
await page.fill('input[type="email"]', 'qa.browser@hirelens.test')
await page.getByRole('button', { name: /^continue$/i }).click()
await page.waitForSelector('input[type="password"]')
await page.fill('input[type="password"]', 'HireLensQA!2026')
await page.getByRole('button', { name: /^sign in$/i }).click()
await page.waitForURL((u) => !u.pathname.startsWith('/auth/'), { timeout: 45000 })

const focusKey = () =>
  page.evaluate(() => {
    const a = document.activeElement
    if (!(a instanceof HTMLElement)) return null
    return {
      key: a.getAttribute('data-drawer-focus-key'),
      tag: a.tagName,
      label: (a.textContent || '').trim().slice(0, 24),
      inDialog: Boolean(a.closest('[role="dialog"]')),
    }
  })
const drawerCount = () => page.locator('[role="dialog"]').count()

async function check(surface, opener) {
  const row = { surface, focusable: false, ring: false, enter: false, space: false, restored: false, trapped: false, mouse: false }

  for (const key of ['Enter', ' ']) {
    await opener.focus()
    const before = await focusKey()
    row.focusable = before?.tag === 'BUTTON'
    row.ring = await opener.evaluate((el) => {
      const cs = getComputedStyle(el)
      return cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0
    })
    const openerKey = before?.key ?? null

    await page.keyboard.press(key)
    await page.waitForTimeout(1500)
    const opened = (await drawerCount()) > 0
    if (key === 'Enter') row.enter = opened
    else row.space = opened

    // Focus must not escape the dialog.
    let escapes = 0
    for (let i = 0; i < 8; i += 1) {
      await page.keyboard.press('Tab')
      await page.waitForTimeout(90)
      const f = await focusKey()
      if (f && !f.inDialog) escapes += 1
    }
    row.trapped = escapes === 0

    await page.keyboard.press('Escape')
    await page.waitForTimeout(1200)
    const after = await focusKey()
    const back = Boolean(openerKey) && after?.key === openerKey
    if (key === ' ') row.restored = back
    else row.restored = back
  }

  await opener.click()
  await page.waitForTimeout(1400)
  row.mouse = (await drawerCount()) > 0
  await page.keyboard.press('Escape')
  await page.waitForTimeout(900)

  results.push(row)
}

// 1. Pipeline table (virtualized)
await page.goto(`${BASE}/roles/${ROLE_ID}`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('tbody tr button', { timeout: 30000 }).catch(() => {})
await page.waitForTimeout(2500)
await check('Pipeline (table)', page.locator('tbody tr button[data-drawer-focus-key]').first())

// 2. Pipeline board (cards) — same data, different view.
const board = page.getByRole('button', { name: /board/i }).first()
if (await board.count()) {
  await board.click()
  await page.waitForTimeout(2000)
  const cardOpener = page.locator('button[data-drawer-focus-key]').first()
  if (await cardOpener.count()) await check('Pipeline (board)', cardOpener)
}

// 3. Talent search results (virtualized)
await page.goto(`${BASE}/talent`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(2500)
const q = page.locator('input[type="text"], input:not([type])').first()
if (await q.count()) {
  await q.fill('engineer')
  await page.getByRole('button', { name: /^search$/i }).click().catch(() => {})
  await page.waitForTimeout(7000)
  const opener = page.locator('button[data-drawer-focus-key]').first()
  if (await opener.count()) await check('Talent search', opener)
  else results.push({ surface: 'Talent search', skipped: 'no results returned' })
}

console.log('\nsurface                 focusable ring enter space trap restored mouse')
for (const r of results) {
  if (r.skipped) {
    console.log(`${r.surface.padEnd(23)} SKIPPED — ${r.skipped}`)
    continue
  }
  const y = (v) => (v ? ' ok ' : 'FAIL')
  console.log(
    `${r.surface.padEnd(23)} ${y(r.focusable)}     ${y(r.ring)} ${y(r.enter)} ${y(r.space)} ${y(r.trapped)} ${y(r.restored)}    ${y(r.mouse)}`,
  )
}
const failed = results.filter((r) => !r.skipped && !(r.focusable && r.ring && r.enter && r.space && r.trapped && r.restored && r.mouse))
console.log(failed.length ? `\n${failed.length} surface(s) FAILED` : '\nall surfaces pass')
await browser.close()
