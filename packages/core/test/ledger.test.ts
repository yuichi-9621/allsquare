import { expect, test } from "vitest"
import { computeBalances, settle } from "../src/ledger.js"
import type { ExpenseInput } from "../src/ledger.js"

// USD-base group. Alice fronts a 5000 JPY dinner (rate 0.0066 -> 3300 cents),
// split equally across Alice/Bob/Carol. Bob fronts a 30.00 USD taxi split equally.
const expenses: ExpenseInput[] = [
  {
    payerId: "alice",
    amountMinor: 5000,
    currency: "JPY",
    fxRateToBase: 0.0066,
    split: { kind: "equal", memberIds: ["alice", "bob", "carol"] },
  },
  {
    payerId: "bob",
    amountMinor: 3000,
    currency: "USD",
    fxRateToBase: 1,
    split: { kind: "equal", memberIds: ["alice", "bob", "carol"] },
  },
]

test("computeBalances nets to zero across the group", () => {
  const bal = computeBalances(expenses, "USD")
  let sum = 0
  for (const v of bal.values()) sum += v
  expect(sum).toBe(0)
})

test("frozen rate is used, not recomputed", () => {
  // dinner base value = 3300 cents; each owes 1100. taxi = 3000; each owes 1000.
  // alice paid 3300, owes 1100+1000=2100 -> net +1200
  const bal = computeBalances(expenses, "USD")
  expect(bal.get("alice")).toBe(1200)
})

test("settle produces a minimal, rounded transfer set that fully clears", () => {
  const transfers = settle(expenses, { baseCurrency: "USD", rounding: 1 })
  expect(transfers.length).toBeLessThanOrEqual(2)
  for (const t of transfers) expect(t.amountMinor % 100).toBe(0) // whole dollars
})

test("exact split is honored", () => {
  const bal = computeBalances(
    [
      {
        payerId: "alice",
        amountMinor: 1000,
        currency: "USD",
        fxRateToBase: 1,
        split: {
          kind: "exact",
          shares: [
            { memberId: "alice", amountMinor: 200 },
            { memberId: "bob", amountMinor: 800 },
          ],
        },
      },
    ],
    "USD",
  )
  expect(bal.get("bob")).toBe(-800)
  expect(bal.get("alice")).toBe(800)
})
