import { expect, test } from "vitest"
import { paymentTarget } from "./paymentLink"

test("@handle builds a Venmo pay link with amount and note", () => {
  const t = paymentTarget("@yu-money", 4200, "USD", "Kyoto Trip")
  expect(t).toEqual({
    kind: "link",
    href: "https://venmo.com/u/yu-money?txn=pay&amount=42.00&note=Kyoto%20Trip",
  })
})

test("$cashtag builds a Cash App link with amount", () => {
  const t = paymentTarget("$yumoney", 4200, "USD", "x")
  expect(t).toEqual({ kind: "link", href: "https://cash.app/%24yumoney/42.00" })
})

test("paypal.me gets amount and currency appended, scheme added if missing", () => {
  expect(paymentTarget("paypal.me/yu", 4200, "USD", "x")).toEqual({
    kind: "link",
    href: "https://paypal.me/yu/42.00USD",
  })
  expect(paymentTarget("https://www.paypal.me/yu/", 1000, "EUR", "x")).toEqual({
    kind: "link",
    href: "https://www.paypal.me/yu/10.00EUR",
  })
})

test("zero-decimal currencies format without cents", () => {
  const t = paymentTarget("paypal.me/yu", 1500, "JPY", "x")
  expect(t).toEqual({ kind: "link", href: "https://paypal.me/yu/1500JPY" })
})

test("any other URL passes through untouched", () => {
  const t = paymentTarget("https://kraken.me/yu", 4200, "USD", "x")
  expect(t).toEqual({ kind: "link", href: "https://kraken.me/yu" })
})

test("plain text becomes a copy target", () => {
  const t = paymentTarget("Apple Pay: 415-555-0100", 4200, "USD", "x")
  expect(t).toEqual({ kind: "copy", text: "Apple Pay: 415-555-0100" })
})
