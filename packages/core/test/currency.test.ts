import { expect, test } from "vitest"
import { decimalsFor, minorPerUnit } from "../src/currency.js"

test.each([
  ["JPY", 0],
  ["USD", 2],
  ["EUR", 2],
  ["KWD", 3],
  ["XYZ", 2], // unknown falls back to 2
])("decimalsFor(%s) === %i", (code, expected) => {
  expect(decimalsFor(code)).toBe(expected)
})

test("minorPerUnit reflects decimals", () => {
  expect(minorPerUnit("JPY")).toBe(1)
  expect(minorPerUnit("USD")).toBe(100)
  expect(minorPerUnit("KWD")).toBe(1000)
})
