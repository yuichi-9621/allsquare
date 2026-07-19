# Categories, Itemized Split, Japanese Localization: Implementation Plan

> Spec: `docs/superpowers/specs/2026-07-19-categories-itemized-i18n-design.md`
> Executed inline (session-driven), one phase per feature, deploy after each
> phase. Naming conventions are defined in the spec's "Naming used in this
> spec" section.

**Goal:** ship categories + spending breakdown, itemized receipt split, and
Japanese localization, on a repayment-kind foundation that receipt scanning
and premium can build on.

## Phase 0 + A: repayment kind + categories (one migration, one deploy)

1. Migration `0003_kind_category.sql`: add `kind TEXT NOT NULL DEFAULT
   'expense'` and `category TEXT` to expenses.
2. Worker: extend `EXPENSE_COLS`, `ExpenseRow`, `toExpense`, insert/update
   binds; zod: `kind` enum optional (default expense), `category` enum of the
   8 ids, nullable/optional; server forces `category = null` when kind is
   repayment. Tests: POST with category round-trips; repayment kind
   round-trips; invalid category 400.
3. Web: `lib/categories.ts` (ids, emoji, labels); types gain
   `kind?`/`category?`; Mark paid sends `kind: "repayment"`;
   `isRepayment` = flag OR legacy heuristic (regression test with an old-shape
   row); form category chip row (default `other`); card emoji;
   `SpendingBreakdown` collapsed section in the rail (bars, base totals,
   repayments excluded). Tests: chip select posts category; breakdown math;
   legacy heuristic still detected.
4. Deploy: migrate remote → worker → web. Suites green.

## Phase B: itemized split

1. Migration `0004_items.sql`: `items TEXT` on expenses.
2. Worker: parse/validate items JSON (shape + sum === amountMinor + memberIds
   all in group), store/echo; PATCH replaces items; tests.
3. Web: `lib/items.ts` `compileItems(items) -> exact shares`
   (largest-remainder per item, summed; unit tests for conservation);
   ExpenseForm "Items" mode (rows: name, price, member chips, Everyone
   toggle; derived read-only total; unassigned-item submit guard); card
   renders items with assignee chips; edit prefills. Tests: compile
   conservation across currencies, form POst shape, card render.
4. Deploy: migrate remote → worker → web.

## Phase C: Japanese localization

1. `web/src/lib/i18n.ts`: typed key union, `t(key, vars)`, locale state
   (localStorage `allsquare:locale` → navigator.language), `<html lang>`
   sync, `useLocale()` hook re-rendering on change.
2. `web/src/locales/en.ts` + `ja.ts`; a type-level check that both carry
   every key (compile error otherwise).
3. Sweep every component/route to `t()`; localized category labels;
   repayment rows rendered via localized template keyed off `kind`;
   `usePageMeta` localized titles/descriptions; `Intl` date/number
   formatting.
4. Language switcher (EN / 日本語) in trip menu + landing footer.
5. Tests: ja smoke render of landing + trip screen; dictionary completeness
   is a type test; en snapshots unchanged.
6. Deploy web.

## After C (separate decisions, not in this plan)

- Receipt scanning worker endpoint (Claude Haiku vision, ~0.5¢/scan) feeding
  the Items editor; premium-gated.
- Roommate mode + one-time premium unlock (Stripe payment link per trip).
