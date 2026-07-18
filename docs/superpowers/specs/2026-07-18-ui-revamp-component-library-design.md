---
title: Allsquare UI Revamp — Universal Component Library ("Stamp" identity)
date: 2026-07-18
status: approved-for-planning
---

# Allsquare UI Revamp — Universal Component Library

## Goal

Replace Allsquare's hand-written CSS with a **token-driven, reusable component
library** (`@allsquare/ui`) built on **shadcn/ui + Tailwind + Radix**, and cut the
entire `web` app over to it under a new visual identity — **"Stamp"** — expressed
entirely through swappable theme tokens.

## What we are NOT doing (scope fences)

- **No changes** to `worker`, `packages/core`, the API contract, D1, FX/money
  logic, or any behavior. This is a **presentation-layer** revamp. Every screen
  keeps its current behavior and data flow; only its markup/styling changes.
- **No new product features.** Delete/edit/add/settle all work exactly as today.
- **No light mode build.** Tokens are structured so a light theme (or a wholly
  different skin) is *possible* as one more token file, but we ship dark-only
  ("forest cover") now. (YAGNI.)
- **No runtime network for UI.** Offline-PWA / CSP constraint stands: fonts are
  self-hosted `woff2`, every dependency is bundled, nothing fetched at runtime.

## Locked decisions (from brainstorming)

| Decision | Choice |
|---|---|
| Library home | `packages/ui` in this monorepo (`@allsquare/ui`) |
| Theming | Token-driven, multi-theme-ready; "Stamp" is theme #1 |
| Migration | Full cutover; Tailwind becomes the project styling standard |
| Catalog | Storybook, in `packages/ui` |
| Visual direction | "Stamp" (passport/travel-document) in the Olive/Cornsilk/Copper palette |

---

## The "Stamp" identity

A trip is a passport filling with stamps. A **dark forest "cover"** holds the app;
expenses are **cornsilk paper receipts** with perforated edges; the primary action
and the settle-up "stamp" are **copper**; a **caramel foil** rule and badges add
warmth. When everyone is settled, the pending dashed seal flips to a solid olive
**"ALL SQUARE"** stamp — the one signature moment.

### Palette → semantic roles

| Named color | Hex | Semantic role(s) |
|---|---|---|
| Black Forest | `#283618` | `background` (app cover), ink on paper (`card-foreground`) |
| Cornsilk | `#FEFAE0` | `card`/`popover` (paper), `foreground` (text on cover), `primary-foreground` |
| Copper | `#BC6C25` | `primary` (actions), `danger`/owe status, focus `ring` |
| Light Caramel | `#DDA15E` | `foil` accent — breakdown rules, badges, highlights |
| Olive Leaf | `#606C38` | `secondary` (structural green), the "ALL SQUARE" seal |
| — (owed) | `#4E7D2B` | `success` / **owed** status (clearer green, pulled off olive so it reads distinctly from copper) |

**One semantic rule across the whole app:**
**green = good / owed / all-square · copper = action / owe / attention · caramel = foil accent.**
Transfer amounts render in neutral ink so copper only ever means owe/action.

### Two-surface token model (the load-bearing theming idea)

The app has two grounds: the **forest cover** and **cornsilk paper**. A single flat
token set can't serve both (text/border must invert between them). Solution:
**surface-scoped token contexts.**

- The app root establishes the **cover context**: `--foreground` = cornsilk,
  `--border` = low-alpha cornsilk, `--muted-foreground` = dim cornsilk.
- The **`Card`/`Popover` components re-bind those same tokens locally** to their
  paper values (`--foreground` = ink, `--border` = low-alpha ink,
  `--muted-foreground` = olive-grey, `--success`/`--danger` = the on-paper
  variants). Everything inside a Card therefore reads the correct surface values
  automatically, and components stay surface-agnostic — no `on-dark`/`on-light`
  props threaded through the tree.

Colors are stored as **HSL channel triplets** (shadcn convention: `--primary: 26 66% 44%;`)
so Tailwind's `hsl(var(--token) / <alpha>)` opacity modifiers work. Exact triplet
values are derived from the hex table above during implementation.

### Semantic token set

Standard shadcn tokens, mapped to Stamp: `background`, `foreground`, `card`,
`card-foreground`, `popover`, `popover-foreground`, `primary`, `primary-foreground`,
`secondary`, `secondary-foreground`, `muted`, `muted-foreground`, `accent`,
`accent-foreground`, `border`, `input`, `ring`. Plus Allsquare additions:
`success` (owed), `danger` (owe), `foil` (caramel).

### Typography (self-hosted, CSP/offline-safe)

- **Display** (headings, labels, buttons): a condensed grotesk — proposal
  **Archivo Narrow** (OFL). Uppercase, letter-spaced for the stamped/ticket feel.
- **Mono** (amounts, currency codes, breakdowns): **IBM Plex Mono** (OFL), with
  `tabular-nums`.
- **Body** (running text): native `system-ui` stack — zero payload, already CSP-safe.

Two faces self-hosted as Latin-subset `woff2` under `packages/ui`, loaded via
`@font-face`. (Final face choice confirmed at P1 start; the spec assumes
Archivo Narrow + IBM Plex Mono.)

### Radius / elevation / motion

- **Radius:** small and document-like — `--radius: 8px` (sm 6 / lg 12). Not pill-round.
- **Elevation:** paper cards get a soft drop shadow + a 1px inset top highlight;
  the cover is flat with a faint caramel radial glow at the top edge.
- **Motion:** minimal. The one deliberate moment is the **stamp "press"** when a
  group reaches all-square (a short scale/rotate settle). Everything respects
  `prefers-reduced-motion`.

---

## Architecture

```
packages/ui/                      NEW — @allsquare/ui (universal, themeable)
  src/
    lib/utils.ts                  cn() — clsx + tailwind-merge
    styles/tokens.css             semantic token declarations (HSL triplets)
    styles/themes/stamp.css       the "Stamp" theme values (cover context)
    styles/fonts.css              @font-face (Archivo Narrow, IBM Plex Mono)
    fonts/*.woff2                  self-hosted subsets
    components/ui/                 shadcn-derived primitives (re-themed)
      button.tsx input.tsx label.tsx badge.tsx card.tsx
      select.tsx checkbox.tsx radio-group.tsx popover.tsx
    components/stamp.tsx           generic rotated "seal" (label + state)
    index.ts                      barrel export
  tailwind-preset.ts              Tailwind theme mapping tokens → utilities
  tailwind.config.ts              Storybook-local config (uses preset)
  .storybook/                     Storybook config
  *.stories.tsx                   one story per primitive + Stamp
  package.json                    exports "." → src/index.ts (source-consumed)

web/                              consumes @allsquare/ui
  tailwind.config.ts              NEW — uses preset; content globs web + packages/ui
  postcss.config.js               NEW — tailwindcss + autoprefixer
  src/index.css                   NEW — @tailwind base/components/utilities + token imports
  src/main.tsx                    imports index.css (was styles.css)
  src/components/                  domain components on primitives:
    MoneyAmount.tsx BalanceChip.tsx ExpenseCard.tsx SettleRow.tsx
    (existing components migrated: AddMember, ExpenseForm, ExpenseList,
     MemberPicker, TripMenu→Popover, RenameTrip, ShareBar, QrCode,
     BalanceList, SettleUp, TripCard, InstallHint)
  src/routes/                      CreateGroup, Dashboard, GroupPage — restyled
  src/styles.css                   DELETED at end of cutover
```

**Consumption model:** `@allsquare/ui` is **source-consumed** (no build step) — Vite
compiles its TS/TSX directly as a workspace dep, and Tailwind scans its source via a
content glob. This is the simplest correct setup for an internal monorepo package.

**Dependencies added** (all bundled, CSP-safe): `tailwindcss`, `autoprefixer`,
`postcss`, `class-variance-authority`, `clsx`, `tailwind-merge`,
`@radix-ui/react-select`, `-checkbox`, `-radio-group`, `-popover`, `-label`,
`lucide-react` (icons, tree-shaken), plus `storybook` + Vite Storybook addons and
`@storybook/addon-a11y` as dev deps.

**Tooling:** Biome stays the formatter/linter (formats copied shadcn source too).
Vitest/MSW/jsdom test harness stays.

---

## Component surface (YAGNI — built from actual app usage)

### Universal primitives (`packages/ui`, shadcn/Radix-derived, re-themed)

| Component | Notes | Replaces (today) |
|---|---|---|
| `Button` | variants: `primary` (copper), `secondary` (olive), `ghost`, `outline`; sizes | all `button` styling |
| `Input` | text/decimal fields | `input` styling |
| `Label` | field labels (Radix Label) | `label` styling |
| `Select` | Radix Select (payer, currency, rounding) | native `<select>` |
| `Checkbox` | Radix (participants) | native checkbox |
| `RadioGroup` | Radix (split kind) | native radios |
| `Card` | establishes **paper context**; header/total/body slots | expense/settle/panel CSS |
| `Badge` | currency codes, status pills (foil/success/danger variants) | `.chip`, `.p-badge` |
| `Popover` | the ⋮ trip menu | `TripMenu` hand-rolled disclosure |
| `Stamp` | generic rotated seal; `state="pending"\|"square"`, `label` | new (signature element) |

### Domain components (`web`, compose primitives + money lib)

| Component | Responsibility |
|---|---|
| `MoneyAmount` | render minor units in a currency via `lib/money`, `tabular-nums`, optional `≈ base` |
| `BalanceChip` | a member's net as a `Badge` — `success` when owed, `danger` when owe, with sign |
| `ExpenseCard` | `Card` with desc + `MoneyAmount` total, "who paid", stacked breakdown, edit/delete actions |
| `SettleRow` | one transfer "A → B" with neutral-ink `MoneyAmount` |
| (the `Stamp`) | consumed in the settle-up section; `square` when `transfers` is empty |

Domain components stay in `web` because they depend on `core`/app types; the library
holds only universal, themeable UI.

---

## Screen / component cutover inventory

All of `web`'s UI migrates. Behavior and public props/roles are preserved except
where a Radix primitive changes the accessibility tree (see Testing).

- **Routes:** `CreateGroup` (hero + form), `Dashboard` (trip cards, empty state),
  `GroupPage` (header + ⋮, identity, collapsed add-expense, expense list, settle-up).
- **Components:** `AddMember`, `ExpenseForm` (the largest — select/radio/checkbox/
  input/button), `ExpenseList` → `ExpenseCard`s, `MemberPicker`, `TripMenu` →
  `Popover`, `RenameTrip`, `ShareBar`, `QrCode` (unchanged markup, restyled frame),
  `BalanceList` → `BalanceChip`s, `SettleUp` → `SettleRow`s + `Stamp`, `TripCard`,
  `InstallHint`.

The collapsed-add-expense pattern and settle-up-last IA (just shipped) are preserved.

---

## Testing strategy

The vitest + RTL + MSW + jsdom harness is unchanged. Coverage is preserved, not
reduced. Migration is **screen-by-screen, tests updated alongside**.

- **Stable** (no query change): text, headings, `Button`, `Checkbox`/`RadioGroup`
  (Radix preserves `checkbox`/`radio` roles + accessible names), links.
- **Changes required** — Radix `Select` is not a native `<select>`: `getByRole("combobox")`
  + `selectOptions()` become "click trigger → click option". Affects
  `ExpenseForm.test` (payer, currency) and the rounding control in `TripMenu`.
  These tests are rewritten to the Radix interaction pattern.
- **Popover menu:** `TripMenu.test` updates to Radix Popover's open/close + `aria`
  semantics.
- **jsdom caveats:** Radix uses `ResizeObserver`/`PointerEvent`/`scrollIntoView` —
  add the standard jsdom shims in `web/src/test/setup` so primitives mount.
- New components (`MoneyAmount`, `BalanceChip`, `ExpenseCard`, `SettleRow`, `Stamp`)
  get their own unit tests. Storybook primitives get a smoke render + `addon-a11y`.

`core` and `worker` suites are untouched and must stay green.

---

## Constraints & quality bar

- **CSP/offline:** self-hosted fonts only; no CDN; no runtime fetch for UI.
- **A11y:** Radix supplies keyboard nav + focus management; keep a visible copper
  focus ring on every interactive element; color is never the sole signal (signs,
  labels, and the stamp text carry state too).
- **Reduced motion:** the stamp animation and any transitions gate on
  `prefers-reduced-motion`.
- **PWA:** unchanged; watch bundle size (Radix adds weight) — acceptable, note the
  gzipped delta at P4.
- **No dead CSS:** `styles.css` is deleted, not orphaned.

## Phasing (drives the build plan)

1. **P1 — Foundation.** Scaffold `packages/ui`: Tailwind + preset, token/theme
   system (Stamp, two-surface contexts), `cn()`, self-hosted fonts, Storybook, and
   every primitive (`Button`, `Input`, `Label`, `Badge`, `Card`, `Select`,
   `Checkbox`, `RadioGroup`, `Popover`, `Stamp`) — each with a story and a smoke
   test. **Deliverable:** a browsable Storybook in the Stamp theme.
2. **P2 — App wiring + domain components.** Add Tailwind/PostCSS to `web`, import
   the token + font CSS, consume `@allsquare/ui`; build `MoneyAmount`, `BalanceChip`,
   `ExpenseCard`, `SettleRow`, and wire the `Stamp`, each with tests. **Deliverable:**
   domain components render in isolation; app still runs on old screens.
3. **P3 — Screen cutover.** Migrate `CreateGroup`, `Dashboard`, `GroupPage` and all
   remaining components to primitives/domain components; update the Radix-affected
   tests; add jsdom shims. **Deliverable:** the whole app on the new system, same
   behavior, full web suite green.
4. **P4 — Retire & ship.** Delete `styles.css` and any dead CSS; final a11y/visual/
   type/lint/build pass; confirm `core`/`worker`/`web` suites green; deploy to Pages;
   e2e-verify on production; note bundle delta.

## Acceptance criteria

- `@allsquare/ui` exists, is source-consumed by `web`, and its Storybook builds.
- The app is fully cut over; `web/src/styles.css` is deleted; no hand-written CSS
  outside Tailwind/tokens remains.
- `core`, `worker`, `web` test suites all green; typecheck, Biome, and production
  build clean; Storybook builds.
- Live deploy on `all-sqr.com` verified; identity matches the approved "Stamp" mock
  (palette, green/copper semantics, paper cards, stamp signature).

## Risks

- **Tailwind content globs** must include `packages/ui/src` or classes get purged →
  broken styles. Explicit task + a visual check.
- **Radix Select test churn** — the known, planned cost; contained to a few files.
- **Two-surface token nuance** — validated early in P1 with a Storybook example that
  places a Card on the cover.
- **Font payload / bundle size** — subset fonts; measure at P4.
