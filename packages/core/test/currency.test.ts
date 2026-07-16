import { expect, test } from "vitest"
import { decimalsFor, minorPerUnit } from "../src/currency.js"

test.each([
  ["JPY", 0],
  ["USD", 2],
  ["EUR", 2],
  ["KWD", 3],
  ["XYZ", 2], // unknown falls back to 2
  ["constructor", 2], // prototype collision: must default to 2, not return Object constructor
  ["__proto__", 2], // prototype collision
  ["toString", 2], // prototype collision
  ["hasOwnProperty", 2], // prototype collision
])("decimalsFor(%s) === %i", (code, expected) => {
  expect(decimalsFor(code)).toBe(expected)
})

test("minorPerUnit reflects decimals", () => {
  expect(minorPerUnit("JPY")).toBe(1)
  expect(minorPerUnit("USD")).toBe(100)
  expect(minorPerUnit("KWD")).toBe(1000)
})

test("minorPerUnit handles prototype collisions", () => {
  expect(minorPerUnit("constructor")).toBe(100) // should default to 2, not NaN
  expect(minorPerUnit("__proto__")).toBe(100)
  expect(minorPerUnit("toString")).toBe(100)
  expect(minorPerUnit("hasOwnProperty")).toBe(100)
})
