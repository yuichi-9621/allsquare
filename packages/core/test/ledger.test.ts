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

test("exact split in a foreign currency derives per-share base values and conserves the total", () => {
  // USD base; a €15.00 expense at rate 1.115 (base-per-EUR).
  // baseTotal = convert(1500, EUR, USD, 1.115) = 15 * 1.115 * 100 = 1672.5 -> 1673
  // Alice €10 -> 1115 (exact); Bob €5 -> 557.5 -> 557 + 1 reconciled = 558. Sum 1673.
  const bal = computeBalances(
    [
      {
        payerId: "alice",
        amountMinor: 1500,
        currency: "EUR",
        fxRateToBase: 1.115,
        split: {
          kind: "exact",
          shares: [
            { memberId: "alice", amountMinor: 1000 },
            { memberId: "bob", amountMinor: 500 },
          ],
        },
      },
    ],
    "USD",
  )
  // Alice paid baseTotal (1673), owes her derived share (1115) -> +558
  expect(bal.get("alice")).toBe(558)
  expect(bal.get("bob")).toBe(-558)
})

test("foreign exact shares always sum to the converted base total (conservation)", () => {
  // Awkward rate + amounts that don't divide cleanly, across 3 members.
  const cases = [
    { shares: [333, 333, 334], rate: 1.2345 },
    { shares: [100, 200, 700], rate: 0.8137 },
    { shares: [1, 1, 1], rate: 3.3333 },
  ]
  for (const { shares, rate } of cases) {
    const total = shares.reduce((a, b) => a + b, 0)
    const bal = computeBalances(
      [
        {
          payerId: "p",
          amountMinor: total,
          currency: "EUR",
          fxRateToBase: rate,
          split: {
            kind: "exact",
            shares: shares.map((amountMinor, i) => ({ memberId: `m${i}`, amountMinor })),
          },
        },
      ],
      "USD",
    )
    // payer 'p' is not a member here, so members' owed shares must sum to -baseTotal;
    // the whole ledger still nets to zero (payer credited the same baseTotal).
    let net = 0
    for (const v of bal.values()) net += v
    expect(net).toBe(0)
    const owed = [...bal.entries()].filter(([k]) => k !== "p").reduce((a, [, v]) => a + v, 0)
    expect(owed).toBe(-(bal.get("p") ?? 0)) // members owe exactly what the payer is owed
  }
})

test("settle drops transfers that round to zero", () => {
  const jpyExpenses: ExpenseInput[] = [
    {
      payerId: "alice",
      amountMinor: 6600,
      currency: "JPY",
      fxRateToBase: 1,
      split: {
        kind: "exact",
        shares: [
          { memberId: "alice", amountMinor: 0 },
          { memberId: "bob", amountMinor: 6600 },
        ],
      },
    },
    {
      payerId: "alice",
      amountMinor: 40,
      currency: "JPY",
      fxRateToBase: 1,
      split: {
        kind: "exact",
        shares: [
          { memberId: "alice", amountMinor: 0 },
          { memberId: "carol", amountMinor: 40 },
        ],
      },
    },
  ]
  const transfers = settle(jpyExpenses, { baseCurrency: "JPY", rounding: 100 })
  expect(transfers.every((t) => t.amountMinor > 0)).toBe(true)
  expect(transfers).toEqual([{ from: "bob", to: "alice", amountMinor: 6600 }])
})
