import { expect, test } from "vitest"
import { convertMinor } from "../src/convert.js"

test("same currency returns input unchanged regardless of rate", () => {
  expect(convertMinor(500000, "JPY", "JPY", 999)).toBe(500000)
})

test("JPY(0dp) -> USD(2dp): 5000 yen at 0.0066 => 3300 cents", () => {
  // 5000 JPY * 0.0066 = 33.00 USD = 3300 cents
  expect(convertMinor(5000, "JPY", "USD", 0.0066)).toBe(3300)
})

test("USD(2dp) -> JPY(0dp): 1000 cents at 151.5 => 15150 yen", () => {
  // 10.00 USD * 151.5 = 1515 JPY
  expect(convertMinor(1000, "USD", "JPY", 151.5)).toBe(1515)
})

test("rounds half-up to target minor unit", () => {
  // 100 JPY * 0.00666 = 0.666 USD = 66.6 cents -> 67
  expect(convertMinor(100, "JPY", "USD", 0.00666)).toBe(67)
})

test("result is always an integer", () => {
  const r = convertMinor(1234, "EUR", "USD", 1.0837)
  expect(Number.isInteger(r)).toBe(true)
})
