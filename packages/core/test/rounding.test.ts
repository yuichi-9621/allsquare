import { expect, test } from "vitest"
import { roundTransfers } from "../src/rounding.js"
import type { Transfer } from "../src/settlement.js"

const t = (amountMinor: number): Transfer => ({ from: "a", to: "b", amountMinor })

test("JPY rounds to nearest 100 yen (step in major units)", () => {
  // 15150 yen -> nearest 100 -> 15200
  // biome-ignore lint/style/noNonNullAssertion: test data guaranteed to be non-empty
  expect(roundTransfers([t(15150)], 100, "JPY")[0]!.amountMinor).toBe(15200)
})

test("JPY rounds to nearest 1000 yen", () => {
  // biome-ignore lint/style/noNonNullAssertion: test data guaranteed to be non-empty
  expect(roundTransfers([t(15499)], 1000, "JPY")[0]!.amountMinor).toBe(15000)
})

test("USD step=1 rounds to nearest whole dollar (100 cents)", () => {
  // 3349 cents -> nearest dollar -> 3300 cents
  // biome-ignore lint/style/noNonNullAssertion: test data guaranteed to be non-empty
  expect(roundTransfers([t(3349)], 1, "USD")[0]!.amountMinor).toBe(3300)
  // 3350 cents -> 3400 cents
  // biome-ignore lint/style/noNonNullAssertion: test data guaranteed to be non-empty
  expect(roundTransfers([t(3350)], 1, "USD")[0]!.amountMinor).toBe(3400)
})

test("preserves from/to and never goes negative", () => {
  // biome-ignore lint/style/noNonNullAssertion: test data guaranteed to be non-empty
  const out = roundTransfers([t(40)], 100, "JPY")[0]!
  expect(out.from).toBe("a")
  expect(out.to).toBe("b")
  expect(out.amountMinor).toBeGreaterThanOrEqual(0)
})
