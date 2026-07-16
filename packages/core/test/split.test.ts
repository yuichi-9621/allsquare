import { expect, test } from "vitest"
import { SplitSumError, splitEqual, splitExact } from "../src/split.js"

function sum(shares: { amountMinor: number }[]): number {
  return shares.reduce((a, s) => a + s.amountMinor, 0)
}

test("even split divides cleanly", () => {
  const shares = splitEqual(900, ["a", "b", "c"])
  expect(shares).toEqual([
    { memberId: "a", amountMinor: 300 },
    { memberId: "b", amountMinor: 300 },
    { memberId: "c", amountMinor: 300 },
  ])
})

test("remainder goes to earliest members and total is conserved", () => {
  const shares = splitEqual(1000, ["a", "b", "c"]) // 1000/3 => 334,333,333
  expect(shares.map((s) => s.amountMinor)).toEqual([334, 333, 333])
  expect(sum(shares)).toBe(1000)
})

test("splitEqual conserves total for many awkward cases", () => {
  for (const total of [1, 7, 101, 999, 500001]) {
    for (const n of [1, 2, 3, 4, 5, 7]) {
      const ids = Array.from({ length: n }, (_, i) => `m${i}`)
      expect(sum(splitEqual(total, ids))).toBe(total)
    }
  }
})

test("splitEqual throws on empty members", () => {
  expect(() => splitEqual(100, [])).toThrow()
})

test("splitExact returns shares when they sum to total", () => {
  const shares = [
    { memberId: "a", amountMinor: 700 },
    { memberId: "b", amountMinor: 300 },
  ]
  expect(splitExact(1000, shares)).toEqual(shares)
})

test("splitExact throws SplitSumError on mismatch", () => {
  const shares = [
    { memberId: "a", amountMinor: 700 },
    { memberId: "b", amountMinor: 200 },
  ]
  expect(() => splitExact(1000, shares)).toThrow(SplitSumError)
})
