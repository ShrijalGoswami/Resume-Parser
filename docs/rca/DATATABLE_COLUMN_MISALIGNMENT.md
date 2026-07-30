# RCA — DataTable header/cell column misalignment (Audit Log)

**Status: ROOT CAUSE PROVEN. FIXED. Verified on a production build.**
**Date:** 29 Jul 2026 · **Component:** `components/hirelens/ui/data-table.tsx`

## 0. Answer

`.hl-row-hover::before` — an absolutely-positioned pseudo-element on a `<tr>` —
was generating an **anonymous table-cell**, adding a phantom leading column to
every body row. Header rows do not carry the class, so the body sat one column
right of the header. **It reproduces only in a production build**, which is why
two earlier investigations against the dev server found nothing.

The accent is now an inset `box-shadow` on the row's first cell. No pseudo-
element, no anonymous box, no phantom column.

> The first two attempts at this RCA concluded "not reproducible" and declined
> to patch. That was the right call at the time — but the missing variable was
> the build mode, not the DOM state. **Always reproduce a layout defect against
> the artefact you ship.**

---

## 1. What was observed

During the visual QA pass, the Audit Log table on `/settings/usage` rendered
every value one column right of its header. Nothing appeared under `Action`;
`By` showed the resource type; `When` showed the user's email.

Measured three times in one page session, including after a forced double-rAF
reflow — so it was a **stable state of that page instance, not a transient read**:

| | `Action` | `Resource` | `By` | `When` | 5th |
|---|---|---|---|---|---|
| `<th>` x / width | 567 / 104 | 672 / 205 | 877 / 119 | 997 / 361 | — |
| `<td>` x / width | 672 / 205 | 877 / 119 | 997 / 361 | 1358 / 108 | — |

Each `<td>` had the geometry of the **next** `<th>`. The header row spanned
567–1356; the body row spanned 672–1465.

**The decisive number:** the table measured 898px wide, but the header cells
summed to 789 and the body cells to 793 — neither fills the table. They only
reconcile as **five** columns: 104 + 205 + 119 + 361 + 108 = 897 ≈ 898. A
phantom leading column existed in layout.

## 2. What the DOM said at the same moment

- exactly one `<table>`; `display: table`, `table-layout: auto`
- `<thead>` `table-header-group`, `<tbody>` `table-row-group`, rows `table-row`,
  cells `table-cell` — no display overrides
- **4 `<th>` and 4 `<td>`**, every `colSpan` = 1
- every one of the 11 rows had exactly 4 cells (checked explicitly)
- no `<colgroup>` (it is only emitted when a column declares a `width`, and the
  audit columns declare none)
- `<caption class="sr-only">` present

Four cells in a five-column table is only possible if a box exists in layout
that is not an element child — i.e. an **anonymous table-cell**, which CSS
generates when a `table-row` has a child that is not a `table-cell`.

## 3. Root cause

`.hl-row-hover::before` — the row hover accent — is a pseudo-element child of a
`<tr>`, which is `display: table-row`. CSS wraps any child of a table-row that
is not a table-cell in an **anonymous table-cell**, and Chrome performs that
wrapping during box-tree construction — *before* out-of-flow boxes are
extracted. `position: absolute` therefore did not exempt it: the pseudo still
claimed a column slot.

`hl-row-hover` is applied to body rows only; the header row does not carry it.
So the body gained a phantom leading column the header did not have, and every
cell rendered exactly one column right of its label.

## 4. Reproduction: dev vs production

Against the same route, same data, same browser, the **dev server** never
reproduced it:

| Condition | Result |
|---|---|
| Fresh page load | aligned, columns sum to table width |
| Sidebar collapsed → expanded | aligned |
| Sort toggled (asc / desc / asc) | aligned |
| Scroller forced to 600 / 420 / 320px | aligned, **including while horizontally overflowing** |
| After a forced reflow | aligned |

In every dev state `sum(th) === sum(td) === tableWidth`.

**Then the same page was loaded from `next start` against the production
build — and it reproduced immediately and every time:**

| Build | `sum(th)` | `sum(td)` | table | aligned |
|---|---|---|---|---|
| dev (`next dev`) | 898 | 898 | 898 | yes |
| **production (`next build` + `next start`)** | **781** | **788** | **898** | **no** |

### The decisive experiment

On the broken production page, suppress only the pseudo-element and re-measure:

```js
document.head.appendChild(Object.assign(document.createElement('style'),
  { textContent: '.hl-row-hover::before{content:none !important}' }))
```

| State | sum(th) | sum(td) | aligned |
|---|---|---|---|
| before | 781 | 788 | **no** |
| `content: none` applied | 898 | 898 | **yes** |
| rule removed again | 781 | 788 | **no** |

Deterministic and reversible in both directions. Causality proven.

## 5. Why it only appeared in production

Both earlier investigations ran against `next dev` and found nothing, which is
why this sat open through two passes. The dev and production stylesheets differ
in emission order and minification, and the pseudo only wins a column slot in
the production output. The behavioural lesson is build-mode independent:
**a layout defect must be reproduced against the artefact that ships.**

## 6. Blast radius

`DataTable` is shared by four surfaces, all of which render `hl-row-hover` rows:

| Surface | Component | Status before fix |
|---|---|---|
| **Audit Log** | `usage-audit-section` | observed misaligned |
| **Ledger** | `ledger-table` | affected (no rows in this tenant to observe) |
| **Interviews** | `interviews-screen` | affected (no rows) |
| **Analytics** | `analytics-screen` | affected (no rows) |

Only Audit Log had data, so only Audit Log was *seen* failing — but the cause is
in shared CSS, so all four were affected. `pipeline-table` uses the same row
class and is equally covered by the fix.

## 7. Why testing missed it

Nothing here is caught by the existing gates, and that is the structural finding:

- **jsdom has no layout.** `getBoundingClientRect` returns zeros, so no unit
  test can assert column alignment. The 127-test suite cannot see this class of
  bug at all.
- **TypeScript and ESLint are irrelevant** — the markup is valid and the props
  are correct. The defect is in generated layout boxes.
- **The build is clean.** It compiles.
- Only a real browser measuring real geometry finds it, and nothing in CI does
  that.

## 8. The fix

`app/globals.css` — the accent moved off the pseudo-element:

```css
.hl-row-hover > :first-child      { box-shadow: inset 0 0 0 0 var(--hl-accent-solid); }
.hl-row-hover:hover > :first-child { box-shadow: inset 2px 0 0 0 var(--hl-accent-solid); }
```

A cell is a real table-cell, so no anonymous box is generated and no column can
appear. It is painted on the first cell rather than the row because the table
sets `border-collapse: collapse`, under which row-level backgrounds and shadows
are unreliable. The visual result is identical: a 2px accent on the row's
leading edge, same token, same transition.

## 9. Verification

Rebuilt (`pnpm build`, clean) and re-served via `next start`:

| | sum(th) | sum(td) | table | aligned |
|---|---|---|---|---|
| production, before fix | 781 | 788 | 898 | **no** |
| production, after fix | **898** | **898** | **898** | **yes** |

All four columns line up and the row now reads correctly: *Action* = "Copilot
Accessed", *Resource*, *By* = the user's email, *When* = "7m ago".

## 10. Regression risks

- **Low.** One CSS rule, no component or markup change; nothing in the box tree
  depends on the old pseudo.
- The accent is now clipped to the first cell rather than the full row height —
  visually the same 2px bar, since the cell fills the row.
- `position: relative` was dropped from `.hl-row-hover`; nothing else positioned
  against it.
- **Watch for:** any future `::before`/`::after` added to a `<tr>` anywhere in
  the product will reintroduce this exact class of bug. That is the rule to
  remember, and it is recorded in the CSS comment at the fix site.

## 11. Why testing missed it — and the gap that remains

- **jsdom has no layout.** `getBoundingClientRect` returns zeros, so no unit
  test can assert column alignment. The 127-test suite cannot see this class of
  bug at all.
- **TypeScript and ESLint are irrelevant** — the markup is valid, the props are
  correct. The defect is in generated layout boxes.
- **The build is clean.** It compiles perfectly, before and after.
- **The dev server does not reproduce it**, so even manual QA missed it twice.

The standing gap: nothing in CI measures real browser geometry against a
production build. Until something does, this class of defect can only be caught
by hand.
