# Categories, Itemized Split, Japanese Localization: Design

Three features building toward the premium roadmap (receipt scanning, roommate
mode as a one-time unlock). Decisions below were made with the user on
2026-07-19.

## Naming used in this spec

- "category" is one of a fixed set of 8 ids (lowercase english words like
  `food`); the emoji and display label live client-side only.
- "kind" is an expense's role: `expense` (normal) or `repayment` (created by
  Mark paid). The database stores these exact strings.
- "items" are receipt line items stored on an expense; "shares" remain the
  settlement-authoritative split. Items never enter settlement math.

## Foundation: repayment flag (prerequisite for everything)

The current repayment detection is a heuristic matching the English
description "X paid Y". Japanese localization would break it silently,
corrupting trip totals and Add-again chips.

- Migration `0003`: `ALTER TABLE expenses ADD COLUMN kind TEXT NOT NULL
  DEFAULT 'expense'` (plus `category TEXT`, below).
- Contract: `ExpenseBody.kind?: "expense" | "repayment"` (default `expense`);
  `Expense.kind` always present in responses.
- Mark paid sends `kind: "repayment"`.
- Web `isRepayment(e, members)` becomes: `e.kind === "repayment"` OR the
  legacy heuristic (kept for rows created before this deploy; never removed
  data, no backfill needed).
- Repayments always store `category = null`; the server forces this.

## Feature A: Categories + spending breakdown

**Fixed set of 8, defined once in `web/src/lib/categories.ts`:**

| id | emoji | label |
|---|---|---|
| food | 🍜 | Food |
| drinks | 🍺 | Drinks |
| transport | 🚕 | Transport |
| lodging | 🏨 | Lodging |
| activities | 🎟️ | Activities |
| groceries | 🛒 | Groceries |
| shopping | 🛍️ | Shopping |
| other | 📦 | Other |

- DB: `category TEXT` nullable. Null displays as Other; no backfill.
- Worker: zod `z.enum([the 8 ids])` optional/nullable on POST and PATCH;
  echoed in all expense payloads.
- Form: a wrapping chip row (emoji + label, single-select, default `other`)
  between Description and Split. One tap, never required thought.
- Expense card: the emoji renders before the description.
- **Spending breakdown**: a second collapsed section next to Totals in the
  settle rail ("Spending"), listing categories with money totals (base
  currency, frozen rates, repayments excluded), sorted descending, each row
  with a proportional bar (`bg-foil/40`) and the category emoji+label. Only
  categories with spending appear.

## Feature B: Itemized receipt split

A third split mode alongside Equal and Exact, designed so receipt scanning
later just prefills it.

- **Data**: `items TEXT` (JSON) column on expenses, same `0004` migration.
  Shape: `[{ name: string, amountMinor: number, memberIds: string[] }]`.
  Items are display + editing data only; the client compiles them to the
  existing exact shares, which stay settlement-authoritative. Server
  validates shape and that item sum equals `amountMinor`, stores opaquely.
- **Compilation**: each item splits equally among its `memberIds`
  (largest-remainder to conserve cents, same policy as core's equal split);
  per-member share = sum across items. A "Everyone" toggle per item covers
  tax/tip lines.
- **Form**: Split radio gains "Items". The editor is rows of name + price +
  member chips (the MemberAvatar chips, tappable); the expense Amount is
  derived (sum of items) and read-only in this mode; unassigned items block
  submit with a clear error.
- **Card**: an itemized expense's breakdown shows the items with assignee
  chips instead of the per-person equal math.
- **Edit**: prefills items from the stored JSON.

## Feature C: Japanese localization

- **Mechanism**: no i18n library. `web/src/lib/i18n.ts` with typed keys,
  `t(key, vars?)` interpolation (`{name}`, `{n}`), and two dictionaries
  (`en.ts`, `ja.ts`). TypeScript enforces both dictionaries carry every key.
- **Locale resolution**: localStorage override → `navigator.language`
  starts with `ja` → `ja`, else `en`. `<html lang>` kept in sync. Language
  switcher in the trip menu and landing footer (EN / 日本語).
- **Scope**: every UI string, the landing page (hero, use cases, steps,
  FAQ), page titles/descriptions via `usePageMeta`, and the create screen.
  Category labels localized; category ids never change. Dates/numbers via
  `Intl` with the active locale. The share-card image and OG image stay
  English (one canonical brand surface). JSON-LD stays English.
- **Repayment descriptions**: stay in the format `X paid Y` in the ledger
  (data, not UI); the UI renders repayment rows through a localized
  template using the kind flag. This keeps stored data locale-independent.
- SEO: no separate `/ja` routes for now; the app is client-localized. If
  Japanese SEO becomes a goal, hreflang routes are a later project.

## Explicitly out of scope (later phases of the roadmap)

- Receipt photo scanning (worker endpoint + Claude Haiku vision, ~0.5¢ per
  scan; prefills the Items editor). Design exists, gated on premium.
- Roommate mode and the one-time premium unlock (Stripe payment link per
  trip). Decide after A–C ship.

## Testing policy

Same as all prior work: money math changes ship with worker + web tests;
the repayment flag ships with a legacy-heuristic regression test; i18n
ships with a both-dictionaries-complete type test and a rendered ja smoke
test. Existing suites must stay green throughout; settlement math is
untouched by all three features (items compile to exact shares
client-side).
