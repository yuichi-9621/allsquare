import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { expect, test } from "vitest"
import type { Balance, Expense, Member } from "../lib/types"
import { MemberTotals } from "./MemberTotals"

const members: Member[] = [
  { id: "m1", name: "Alice", sortOrder: 0 },
  { id: "m2", name: "Bob", sortOrder: 1 },
]

// Alice paid $30 (USD, base) split equally; Bob paid a EUR expense frozen at
// 1.10, worth $22.00 in base. Server balances: Alice +4, Bob -4 (in cents:
// paid - share; Alice 3000-2600=+400, Bob 2200-2600=-400).
const expenses: Expense[] = [
  {
    id: "e1",
    payerId: "m1",
    amountMinor: 3000,
    currency: "USD",
    fxRateToBase: 1,
    fxRateDate: "2026-07-18",
    description: "Taxi",
    split: { kind: "equal", participantIds: ["m1", "m2"] },
    createdAt: "2026-07-18T00:00:00Z",
  },
  {
    id: "e2",
    payerId: "m2",
    amountMinor: 2000,
    currency: "EUR",
    fxRateToBase: 1.1,
    fxRateDate: "2026-07-18",
    description: "Dinner",
    split: { kind: "equal", participantIds: ["m1", "m2"] },
    createdAt: "2026-07-18T00:00:00Z",
  },
]
const balances: Balance[] = [
  { memberId: "m1", netMinor: 400 },
  { memberId: "m2", netMinor: -400 },
]

test("is collapsed by default and expands to show paid and share per member", async () => {
  const user = userEvent.setup()
  render(
    <MemberTotals expenses={expenses} members={members} balances={balances} baseCurrency="USD" />,
  )
  // collapsed: no amounts yet
  expect(screen.queryByText("Alice")).toBeNull()

  await user.click(screen.getByRole("button", { name: /Totals/ }))

  // Alice paid $30.00; Bob paid EUR 20.00 at the FROZEN 1.10 rate = $22.00.
  screen.getByText("Alice")
  screen.getByText("$30.00")
  screen.getByText("Bob")
  screen.getByText("$22.00")
  // Both shares are paid - net = $26.00 (3000-400 and 2200+400).
  expect(screen.getAllByText("$26.00").length).toBe(2)
})

test("members with no expenses show zero paid", async () => {
  const user = userEvent.setup()
  render(<MemberTotals expenses={[]} members={members} balances={[]} baseCurrency="USD" />)
  await user.click(screen.getByRole("button", { name: /Totals/ }))
  expect(screen.getAllByText("$0.00").length).toBe(4)
})
