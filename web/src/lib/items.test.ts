import { expect, test } from "vitest"
import { compileItems } from "./items"
import type { ExpenseItem } from "./types"

test("odd cents conserve within an item (largest remainder)", () => {
  const items: ExpenseItem[] = [{ name: "Pitcher", amountMinor: 1000, memberIds: ["a", "b", "c"] }]
  const shares = compileItems(items)
  expect(shares.reduce((s, r) => s + r.amountMinor, 0)).toBe(1000)
  const amounts = shares.map((s) => s.amountMinor).sort((x, y) => y - x)
  expect(amounts).toEqual([334, 333, 333])
})

test("amounts accumulate across items per member and conserve the receipt total", () => {
  const items: ExpenseItem[] = [
    { name: "Ramen", amountMinor: 1400, memberIds: ["a"] },
    { name: "Beer", amountMinor: 1600, memberIds: ["a", "b"] },
    { name: "Tax", amountMinor: 301, memberIds: ["a", "b"] },
  ]
  const shares = compileItems(items)
  const byId = Object.fromEntries(shares.map((s) => [s.memberId, s.amountMinor]))
  // a: 1400 + 800 + 151 = 2351; b: 800 + 150 = 950
  expect(byId.a).toBe(2351)
  expect(byId.b).toBe(950)
  expect(2351 + 950).toBe(1400 + 1600 + 301)
})

test("a member in no items gets no share row", () => {
  const items: ExpenseItem[] = [{ name: "Solo", amountMinor: 500, memberIds: ["a"] }]
  const shares = compileItems(items)
  expect(shares).toEqual([{ memberId: "a", amountMinor: 500 }])
})
