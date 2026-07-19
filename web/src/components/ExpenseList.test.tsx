import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { expect, test, vi } from "vitest"
import type { Expense, Member } from "../lib/types"
import { ExpenseList } from "./ExpenseList"

const members: Member[] = [
  { id: "m1", name: "Alice", sortOrder: 0 },
  { id: "m2", name: "Bob", sortOrder: 1 },
]

const expenses: Expense[] = [
  {
    id: "e1",
    payerId: "m1",
    amountMinor: 5000,
    currency: "JPY",
    fxRateToBase: 0.0066,
    fxRateDate: "2026-07-16",
    description: "Ramen",
    split: { kind: "equal", participantIds: ["m1", "m2"] },
    createdAt: "2026-07-16T00:00:00Z",
  },
]

test("shows the original amount as truth and the base as derived", () => {
  render(<ExpenseList expenses={expenses} members={members} baseCurrency="USD" />)
  screen.getByText("Ramen")
  screen.getByText(
    (_, el) => el?.tagName === "P" && el.textContent?.replace(/\s+/g, " ").trim() === "Alice paid",
  )
  // 5000 JPY * 0.0066 = 3300 cents = $33.00
  screen.getByText("¥5,000 · ≈ $33.00")
})

test("shows a per-person breakdown in the expense currency", () => {
  render(<ExpenseList expenses={expenses} members={members} baseCurrency="USD" />)
  // ¥5,000 split equally between Alice & Bob -> ¥2,500 each (stacked)
  const breakdown = screen.getByRole("list", { name: "Breakdown for Ramen" })
  const shares = within(breakdown).getAllByText("¥2,500")
  expect(shares).toHaveLength(2)
})

test("renders an empty state", () => {
  render(<ExpenseList expenses={[]} members={members} baseCurrency="USD" />)
  screen.getByText("No expenses yet.")
})

test("renders a delete button that calls onDelete with the expense id", async () => {
  const onDelete = vi.fn()
  const user = userEvent.setup()
  render(
    <ExpenseList expenses={expenses} members={members} baseCurrency="USD" onDelete={onDelete} />,
  )
  await user.click(screen.getByRole("button", { name: "Delete Ramen" }))
  expect(onDelete).toHaveBeenCalledWith("e1")
})

test("omits delete buttons when onDelete is not provided", () => {
  render(<ExpenseList expenses={expenses} members={members} baseCurrency="USD" />)
  expect(screen.queryByRole("button", { name: /Delete/ })).toBeNull()
})

test("renders an edit button that calls onEdit with the expense id", async () => {
  const onEdit = vi.fn()
  const user = userEvent.setup()
  render(<ExpenseList expenses={expenses} members={members} baseCurrency="USD" onEdit={onEdit} />)
  await user.click(screen.getByRole("button", { name: "Edit Ramen" }))
  expect(onEdit).toHaveBeenCalledWith("e1")
})

test("omits edit buttons when onEdit is not provided", () => {
  render(<ExpenseList expenses={expenses} members={members} baseCurrency="USD" />)
  expect(screen.queryByRole("button", { name: /Edit/ })).toBeNull()
})
