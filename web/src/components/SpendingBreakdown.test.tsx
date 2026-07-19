import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { expect, test } from "vitest"
import type { Expense, Member } from "../lib/types"
import { SpendingBreakdown } from "./SpendingBreakdown"

const members: Member[] = [
  { id: "m1", name: "Alice", sortOrder: 0 },
  { id: "m2", name: "Bob", sortOrder: 1 },
]

function expense(over: Partial<Expense>): Expense {
  return {
    id: "e1",
    payerId: "m1",
    amountMinor: 3000,
    currency: "USD",
    fxRateToBase: 1,
    fxRateDate: "2026-07-19",
    description: "X",
    kind: "expense",
    category: "food",
    split: { kind: "equal", participantIds: ["m1", "m2"] },
    createdAt: "2026-07-19T00:00:00Z",
    ...over,
  }
}

test("collapsed by default; expands to per-category base totals, repayments excluded", async () => {
  const user = userEvent.setup()
  const expenses = [
    expense({ id: "e1", category: "food", amountMinor: 3000 }),
    // EUR lodging at frozen 1.10 = $22.00
    expense({
      id: "e2",
      category: "lodging",
      amountMinor: 2000,
      currency: "EUR",
      fxRateToBase: 1.1,
    }),
    expense({ id: "e3", category: "food", amountMinor: 1000 }),
    // repayment: flagged, must not count
    expense({
      id: "r1",
      kind: "repayment",
      category: null,
      amountMinor: 9900,
      split: { kind: "exact", shares: [{ memberId: "m1", amountMinor: 9900 }] },
    }),
    // legacy uncategorized: buckets to Other
    expense({ id: "e4", category: null, amountMinor: 500 }),
  ]
  render(<SpendingBreakdown expenses={expenses} members={members} baseCurrency="USD" />)
  expect(screen.queryByText("Food")).toBeNull()

  await user.click(screen.getByRole("button", { name: /Spending/ }))
  screen.getByText("Food")
  screen.getByText("$40.00")
  screen.getByText("Lodging")
  screen.getByText("$22.00")
  screen.getByText("Other")
  screen.getByText("$5.00")
  // the repayment's $99.00 appears nowhere
  expect(screen.queryByText("$99.00")).toBeNull()
})

test("renders nothing at all when there is no spending", () => {
  const { container } = render(
    <SpendingBreakdown expenses={[]} members={members} baseCurrency="USD" />,
  )
  expect(container).toBeEmptyDOMElement()
})
