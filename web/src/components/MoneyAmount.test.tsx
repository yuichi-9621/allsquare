import { render, screen } from "@testing-library/react"
import { test } from "vitest"
import { MoneyAmount } from "./MoneyAmount"

test("renders plain formatted money when no base conversion given", () => {
  render(<MoneyAmount amountMinor={3600} currency="USD" />)
  screen.getByText("$36.00")
})

test("renders formatWithBase string when baseValue + differing baseCurrency given", () => {
  render(<MoneyAmount amountMinor={3600} currency="USD" baseValue={3200} baseCurrency="EUR" />)
  screen.getByText("$36.00 · ≈ €32.00")
})

test("falls back to plain formatted money when baseCurrency matches currency", () => {
  render(<MoneyAmount amountMinor={3600} currency="USD" baseValue={3600} baseCurrency="USD" />)
  screen.getByText("$36.00")
})
