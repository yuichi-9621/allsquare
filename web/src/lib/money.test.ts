import { expect, test } from "vitest"
import {
  convertMinor,
  decimalsFor,
  formatMoney,
  formatWithBase,
  minorToInput,
  parseMajorToMinor,
  splitEqualMinor,
} from "./money"

test.each([
  ["JPY", 0],
  ["USD", 2],
  ["EUR", 2],
  ["KWD", 3],
  ["XYZ", 2],
  ["constructor", 2],
  ["__proto__", 2],
  ["toString", 2],
  ["hasOwnProperty", 2],
])("decimalsFor(%s) === %i", (code, expected) => {
  expect(decimalsFor(code)).toBe(expected)
})

test("convertMinor mirrors core: JPY 5000 @0.0066 -> 3300 cents", () => {
  expect(convertMinor(5000, "JPY", "USD", 0.0066)).toBe(3300)
})

test("convertMinor same-currency ignores rate", () => {
  expect(convertMinor(500000, "JPY", "JPY", 999)).toBe(500000)
})

test("convertMinor rounds half-up and stays integer", () => {
  expect(convertMinor(100, "JPY", "USD", 0.00666)).toBe(67)
  expect(Number.isInteger(convertMinor(1234, "EUR", "USD", 1.0837))).toBe(true)
})

test("convertMinor half-up holds at a float .5 boundary (1 JPY @1.005 -> 101)", () => {
  expect(convertMinor(1, "JPY", "USD", 1.005)).toBe(101)
})

test("formatMoney: JPY has no decimals", () => {
  expect(formatMoney(5000, "JPY")).toBe("¥5,000")
})

test("formatMoney: USD shows two decimals", () => {
  expect(formatMoney(3310, "USD")).toBe("$33.10")
})

test("formatWithBase shows original as truth and base as derived", () => {
  expect(formatWithBase({ amountMinor: 5000, currency: "JPY" }, 3310, "USD")).toBe(
    "¥5,000 · ≈ $33.10",
  )
})

test("formatWithBase omits derivation when currency is already base", () => {
  expect(formatWithBase({ amountMinor: 3000, currency: "USD" }, 3000, "USD")).toBe("$30.00")
})

test.each([
  ["5000", "JPY", 5000],
  ["33.10", "USD", 3310],
  ["0", "USD", 0],
])("parseMajorToMinor(%s, %s) === %i", (input, currency, expected) => {
  expect(parseMajorToMinor(input, currency)).toBe(expected)
})

test.each(["", "  ", "abc", "-1", "1e999"])("parseMajorToMinor rejects %s", (bad) => {
  expect(parseMajorToMinor(bad, "USD")).toBeNull()
})

test.each([
  [2000, "USD", "20.00"],
  [5000, "JPY", "5000"],
  [199, "USD", "1.99"],
  [0, "EUR", "0.00"],
])("minorToInput(%i, %s) === %s", (minor, currency, expected) => {
  expect(minorToInput(minor, currency)).toBe(expected)
})

test.each([
  [2000, "USD"],
  [5000, "JPY"],
  [199, "USD"],
])("minorToInput round-trips through parseMajorToMinor (%i, %s)", (minor, currency) => {
  expect(parseMajorToMinor(minorToInput(minor, currency), currency)).toBe(minor)
})

test("splitEqualMinor conserves the total and hands leftover cents to the first members", () => {
  expect(splitEqualMinor(1000, 2)).toEqual([500, 500])
  expect(splitEqualMinor(1000, 3)).toEqual([334, 333, 333]) // 1 leftover -> first
  expect(splitEqualMinor(5, 3)).toEqual([2, 2, 1])
  expect(splitEqualMinor(100, 0)).toEqual([])
  for (const [total, n] of [
    [1234, 7],
    [999, 4],
  ] as const) {
    const parts = splitEqualMinor(total, n)
    expect(parts.reduce((a, b) => a + b, 0)).toBe(total)
  }
})
