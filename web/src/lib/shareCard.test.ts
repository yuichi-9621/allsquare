import { expect, test } from "vitest"
import { isRepayment, tripSummary } from "./shareCard"
import type { Expense, Member } from "./types"

const members: Member[] = [
  { id: "m1", name: "Alice", sortOrder: 0 },
  { id: "m2", name: "Bob", sortOrder: 1 },
]

function expense(over: Partial<Expense>): Expense {
  return {
    id: "e1",
    payerId: "m1",
    amountMinor: 3000,
    currency: "USD",
    fxRateToBase: 1,
    fxRateDate: "2026-07-18",
    description: "Taxi",
    split: { kind: "equal", participantIds: ["m1", "m2"] },
    createdAt: "2026-07-18T00:00:00Z",
    ...over,
  }
}

const repayment = expense({
  id: "r1",
  payerId: "m2",
  amountMinor: 1500,
  description: "Bob paid Alice",
  split: { kind: "exact", shares: [{ memberId: "m1", amountMinor: 1500 }] },
})

test("recognises a Mark-paid repayment by its exact shape", () => {
  expect(isRepayment(repayment, members)).toBe(true)
})

test("a real single-beneficiary expense is NOT a repayment (description differs)", () => {
  const gift = expense({
    payerId: "m2",
    amountMinor: 1500,
    description: "Alice's ticket",
    split: { kind: "exact", shares: [{ memberId: "m1", amountMinor: 1500 }] },
  })
  expect(isRepayment(gift, members)).toBe(false)
})

test("equal splits are never repayments", () => {
  expect(isRepayment(expense({}), members)).toBe(false)
})

test("tripSummary totals in base at frozen rates and skips repayments", () => {
  const expenses = [
    expense({}), // $30.00 USD
    expense({ id: "e2", payerId: "m2", amountMinor: 2000, currency: "EUR", fxRateToBase: 1.1 }), // $22.00
    repayment, // excluded
  ]
  const s = tripSummary(expenses, members, "USD")
  expect(s.totalMinor).toBe(5200)
  expect(s.expenseCount).toBe(2)
  expect(s.memberCount).toBe(2)
  expect(s.currencyCount).toBe(2)
})

test("kind flag is authoritative over the legacy heuristic", () => {
  // flagged repayment with a localized (non-English) description
  const flagged = expense({
    id: "j1",
    payerId: "m2",
    kind: "repayment",
    amountMinor: 1500,
    description: "ボブがアリスに支払い",
    split: { kind: "exact", shares: [{ memberId: "m1", amountMinor: 1500 }] },
  })
  expect(isRepayment(flagged, members)).toBe(true)

  // explicitly kind=expense: never a repayment even in the legacy shape
  const marked = expense({
    id: "j2",
    payerId: "m2",
    kind: "expense",
    amountMinor: 1500,
    description: "Bob paid Alice",
    split: { kind: "exact", shares: [{ memberId: "m1", amountMinor: 1500 }] },
  })
  expect(isRepayment(marked, members)).toBe(false)

  // legacy row without kind: heuristic still applies (regression)
  expect(isRepayment(repayment, members)).toBe(true)
})
