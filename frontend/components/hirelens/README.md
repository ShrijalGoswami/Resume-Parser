# HireLens V3 — Frontend Architecture

Canonical, self-contained implementation of HireLens V3. Built in parallel with
the frozen v1.0 app (`app/(legacy)/`, `components/{ui,recruiter,hero,…}`), which
is left untouched until V3 reaches parity and the legacy app is retired.

**Contracts (do not reinterpret):**
- `docs/HIRELENS_V3_UX_SPEC.md` — functional & UX contract
- `docs/HIRELENS_V3_DESIGN_BIBLE.md` — visual identity contract

## Isolation rules

1. **Routes** live under `app/(hirelens)/`. During coexistence V3 does not claim
   `/` or `/login` (held by untouched v1.0); it claims `/roles`, `/talent`,
   `/ask`, `/settings`. `/` is taken over only at cutover.
2. **Styling** is scoped to the `.hl` root the shell renders. Every token is an
   `--hl-*` variable (globals.css); Tailwind utilities are `*-hl-*`
   (`bg-hl-canvas`, `text-hl-fg`, `rounded-hl-lg`, `font-hl-display`).
3. **Dark mode** is `[data-hl-theme='dark']` (next-themes), never `.dark`, so the
   legacy light-only app is unaffected.
4. **Reuse** only generic, stable, implementation-agnostic utilities from the
   shared repo (e.g. `@/lib/utils` `cn`). No legacy UI is retrofitted.

## Folder map

```
app/(hirelens)/
  layout.tsx                Shell mount: ThemeProvider + .hl root + providers
  roles/ talent/ ask/ settings/   V3 routes (built P1+)
  foundations/              P0 review harness (living style guide)

components/hirelens/
  theme/
    fonts.ts                Inter / Fraunces / JetBrains Mono (next/font)
    theme-provider.tsx      next-themes wrapper (data-hl-theme)
    theme-toggle.tsx        light / dark / system control
  lib/
    density.tsx             Density context (comfortable | compact, §II)
    use-media-query.ts      Responsive breakpoint hooks (§3.6)
    use-announcer.tsx       SR live-region announcer (§IX)
  ui/                       Primitives (Design Bible Part IV)
    button, input, textarea, card, badge, avatar, divider, tooltip,
    dialog, drawer, tabs, dropdown-menu, skeleton, spinner, toast, kbd, …
  states/                   Global state patterns (§4.5 / §4.9 / §4.10)
    empty-state, error-state, offline-banner, gate-state, loading
  shell/                    App shell (Design Bible Part V)
    app-shell, left-nav, top-bar, breadcrumbs, workspace-switcher,
    notifications, account-menu
  command-palette/          ⌘K infrastructure (§4.2 / §5.7)
  index.ts                  Public barrel for the V3 design system
```

## Conventions

- **TypeScript strict**, no `any`, explicit public prop types.
- Primitives are **theme-aware and density-aware**; variants via
  `class-variance-authority`; class merging via `cn` (`@/lib/utils`).
- Every interactive element has a visible `:focus-visible` ring, a keyboard
  path, and (where it conveys state) an icon/label — never color alone.
- Components render their spec states (loading/empty/error/gated) or compose the
  shared ones in `states/`.
