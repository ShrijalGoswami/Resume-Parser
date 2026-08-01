/**
 * Development-only session reset.
 *
 * In dev we want every fresh `next dev` boot to start signed out: the Supabase
 * auth cookie otherwise survives a server restart, so "Start with HireLens"
 * bounces straight into /home and the real sign-in path never gets exercised.
 *
 * Mechanism: the server mints one random boot id per process and mirrors it into
 * a `hl-dev-boot` cookie. A request whose cookie doesn't carry the current boot
 * id is the first one this browser has made since the server started, so the
 * proxy drops its Supabase auth cookies and treats it as anonymous. Every later
 * request in the same run carries a matching boot id and is left alone, so
 * signing in during a dev session sticks until the next restart.
 *
 * PRODUCTION IS UNTOUCHED: `isDevSessionResetEnabled()` is false whenever
 * NODE_ENV is 'production' (i.e. `next build` / `next start` / Vercel), and the
 * proxy never calls into this module in that case. Set
 * `HL_DEV_PERSIST_SESSION=1` to opt a dev run back into persistent login.
 */

/** Cookie holding the boot id this browser last saw. Dev-only, non-sensitive. */
export const DEV_BOOT_COOKIE = 'hl-dev-boot'

export function isDevSessionResetEnabled(
  env: { NODE_ENV?: string; HL_DEV_PERSIST_SESSION?: string } = process.env,
): boolean {
  return env.NODE_ENV !== 'production' && env.HL_DEV_PERSIST_SESSION !== '1'
}

// Kept on globalThis rather than in module scope: Next re-evaluates the proxy
// module on recompiles, and a fresh id there would sign the developer out on
// every edit. The edge sandbox's globalThis outlives those re-evaluations.
const bootIdHolder = globalThis as typeof globalThis & { __hlDevBootId?: string }

/** Random id, stable for the life of this server process. */
export function getDevBootId(): string {
  bootIdHolder.__hlDevBootId ??= crypto.randomUUID()
  return bootIdHolder.__hlDevBootId
}

/**
 * Supabase session cookies, including the `.0`/`.1` chunks used when the JWT
 * exceeds one cookie. The PKCE `-auth-token-code-verifier` is deliberately NOT
 * matched: clearing it would break a magic-link or OAuth callback that happens
 * to be the first request after a restart.
 */
export function isSupabaseSessionCookie(name: string): boolean {
  return /^sb-.+-auth-token(\.\d+)?$/.test(name)
}

/** True when this request predates the current server boot. */
export function isStaleDevRequest(bootCookieValue: string | undefined): boolean {
  return bootCookieValue !== getDevBootId()
}
