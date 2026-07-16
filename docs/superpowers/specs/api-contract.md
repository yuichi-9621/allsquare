# Allsquare HTTP API Contract (v1)

The frozen seam between `worker` (implements) and `web` (consumes). Both Plan 2
and Plan 3 are written against this document. Any change here is a change to both
plans.

## Conventions

- Base path: `/api`. All bodies and responses are JSON.
- **Money is always integer minor units** (`amountMinor`), matching `@allsquare/core`.
- Currency codes are ISO 4217 uppercase strings.
- A `slug` is an unguessable URL-safe token (the group's capability credential —
  possession of the slug grants read+write, per design §3.1).
- Timestamps are ISO 8601 UTC strings.
- Errors: `{ "error": { "code": string, "message": string } }` with an
  appropriate HTTP status (400 validation, 404 not found, 409 conflict).

## Types (wire shapes)

```ts
type Rounding = 1 | 10 | 100 | 1000

type Group = {
  slug: string
  title: string
  baseCurrency: string
  rounding: Rounding
  createdAt: string
}

type Member = { id: string; name: string; sortOrder: number }

type SplitEqual = { kind: "equal"; participantIds: string[] }
type SplitExact = { kind: "exact"; shares: { memberId: string; amountMinor: number }[] }
// SplitExact.shares are in GROUP BASE CURRENCY minor units and must sum to the
// expense's converted base total (design §6 note; matches core `splitExact`).

type Expense = {
  id: string
  payerId: string
  amountMinor: number      // in `currency`, as entered
  currency: string
  fxRateToBase: number     // FROZEN at entry; target(base)-per-source(currency)
  fxRateDate: string       // YYYY-MM-DD the rate is dated to (may be carried-forward)
  description: string
  split: SplitEqual | SplitExact
  createdAt: string
}

type GroupState = { group: Group; members: Member[]; expenses: Expense[] }

type Balance = { memberId: string; netMinor: number }   // + = is owed, - = owes
type Transfer = { from: string; to: string; amountMinor: number }
type Settlement = { balances: Balance[]; transfers: Transfer[] }
```

## Endpoints

### `POST /api/groups`
Create a group. Server generates `slug` and member ids.
- Body: `{ title: string; baseCurrency: string; rounding: Rounding; memberNames: string[] }`
- 201 → `GroupState`

### `GET /api/groups/:slug`
Full current state. **This is the polling endpoint** the web app hits.
- 200 → `GroupState`
- 404 if slug unknown

### `POST /api/groups/:slug/members`
Add a member to an existing group.
- Body: `{ name: string }`
- 201 → `Member`

### `POST /api/groups/:slug/expenses`
Add an expense. Server resolves and **freezes** the FX rate (`currency`→`baseCurrency`)
for today's date (carry-forward on non-publishing days), then stores it.
- Body:
  `{ payerId: string; amountMinor: number; currency: string; description: string; split: SplitEqual | SplitExact }`
- 201 → `Expense`
- 400 if `split.kind === "exact"` and shares don't sum to the converted base total,
  or if `payerId`/participant ids are not group members.
- 400 if `amountMinor` (and each exact `shares[].amountMinor`) is not a safe,
  non-negative integer. The worker MUST call `core.assertSafeMinor` on every
  incoming money value before persisting — `@allsquare/core` performs no input
  validation of its own (it assumes the boundary already guarded these).

### `PATCH /api/groups/:slug/expenses/:id`
Edit an expense. Same body as POST (all fields required — full replace). Re-freezes
the FX rate **only if** `currency` changed; otherwise keeps the original frozen rate.
- 200 → `Expense`
- 404 if expense not in group

### `DELETE /api/groups/:slug/expenses/:id`
Soft-delete (sets `deleted_at`; row retained for history + D1 Time Travel).
- 204, no body

### `GET /api/groups/:slug/settlement?rounding=<1|10|100|1000>`
Server computes balances + minimal transfers via `@allsquare/core`'s `settle`.
`rounding` query param overrides the group default for this response only (the
web app lets users preview rounding levels without persisting).
- 200 → `Settlement`
- 404 if slug unknown

### `GET /api/fx?from=<CUR>&to=<CUR>&date=<YYYY-MM-DD>`
Preview a frozen rate (used by the expense form to show "≈ $X" before submit).
- 200 → `{ rate: number; rateDate: string }` (`rateDate` may be earlier than
  requested `date` when carried forward)

## Notes for implementers

- The worker maps stored expense rows → `core.ExpenseInput` (payerId, amountMinor,
  currency, fxRateToBase, split) and calls `core.settle` / `core.computeBalances`.
  The worker never re-derives rates for existing expenses — it passes the stored
  frozen `fxRateToBase`.
- **Field-name seam:** the wire `SplitEqual` uses `participantIds`, but
  `core.ExpenseInput`'s equal split uses `memberIds`. This is deliberate (wire vs
  domain vocabulary); the worker maps `participantIds` → `memberIds` when building
  `core.ExpenseInput`. `SplitExact.shares` (`{memberId, amountMinor}`) is identical
  on both sides, and its `amountMinor` values are in GROUP BASE CURRENCY minor
  units (core validates they sum to the converted base total).
- The web app never imports `@allsquare/core`; it consumes `/settlement` output.
  (Optional later optimization: share core for optimistic UI. Out of scope v1.)
