import { render, screen } from "@testing-library/react"
import { test } from "vitest"
import { BalanceChip } from "./BalanceChip"

function bySpanText(text: string) {
  return (_: string, node: Element | null) =>
    node?.tagName.toLowerCase() === "span" && node.textContent === text
}

test("renders a success-styled chip with + sign when netMinor is positive", () => {
  render(<BalanceChip netMinor={4880} baseCurrency="USD" name="Bob" />)
  const el = screen.getByText(bySpanText("Bob +$48.80"))
  expect(el.className).toContain("text-success")
})

test("renders a danger-styled chip with U+2212 minus sign when netMinor is negative", () => {
  render(<BalanceChip netMinor={-4240} baseCurrency="USD" name="Carol" />)
  const el = screen.getByText(bySpanText("Carol −$42.40"))
  expect(el.className).toContain("text-danger")
})

test("renders a muted chip with no sign when netMinor is zero", () => {
  render(<BalanceChip netMinor={0} baseCurrency="USD" name="Dana" />)
  const el = screen.getByText(bySpanText("Dana $0.00"))
  expect(el.className).toContain("text-muted-foreground")
})
