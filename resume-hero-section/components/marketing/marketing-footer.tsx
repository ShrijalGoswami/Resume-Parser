/**
 * Marketing footer — deliberately minimal and honest. Legal links (Privacy /
 * Terms / Security) are intentionally omitted until those pages exist rather
 * than pointing at dead routes.
 */
export function MarketingFooter() {
  const year = new Date().getFullYear()
  return (
    <footer className="border-t border-mkt-border-subtle bg-mkt-paper">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-10 sm:flex-row sm:items-baseline sm:justify-between">
        <span className="font-[family-name:var(--font-fraunces)] text-lg text-mkt-fg">HireLens</span>
        <p className="font-hl-mono text-[11px] uppercase tracking-widest text-mkt-fg-subtle">
          © {year} HireLens · Precision in recruitment
        </p>
      </div>
    </footer>
  )
}
