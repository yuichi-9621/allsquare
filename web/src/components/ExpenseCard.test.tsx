import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { expect, test, vi } from "vitest"
import type { Expense, Member } from "../lib/types"
import { ExpenseCard } from "./ExpenseCard"

const members: Member[] = [
  { id: "m1", name: "Alice", sortOrder: 0 },
  { id: "m2", name: "Bob", sortOrder: 1 },
]

const expense: Expense = {
  id: "e1",
  payerId: "m1",
  amountMinor: 5000,
  currency: "JPY",
  fxRateToBase: 0.0066,
  fxRateDate: "2026-07-16",
  description: "Taxi",
  split: { kind: "equal", participantIds: ["m1", "m2"] },
  createdAt: "2026-07-16T00:00:00Z",
}

const exactExpense: Expense = {
  ...expense,
  id: "e2",
  description: "Souvenirs",
  split: {
    kind: "exact",
    shares: [
      { memberId: "m1", amountMinor: 3000 },
      { memberId: "m2", amountMinor: 2000 },
    ],
  },
}

test("shows the description, total (with base), and who paid", () => {
  render(<ExpenseCard expense={expense} members={members} baseCurrency="USD" />)
  screen.getByText("Taxi")
  screen.getByText("Alice paid")
  // 5000 JPY * 0.0066 = 3300 cents = $33.00
  screen.getByText("¥5,000 · ≈ $33.00")
})

test("shows a per-person breakdown in the expense currency for an equal split", () => {
  render(<ExpenseCard expense={expense} members={members} baseCurrency="USD" />)
  // ¥5,000 split equally between Alice & Bob -> ¥2,500 each (stacked)
  const breakdown = screen.getByRole("list", { name: "Breakdown for Taxi" })
  const shares = within(breakdown).getAllByText("¥2,500")
  expect(shares).toHaveLength(2)
})

test("shows a per-person breakdown from exact shares", () => {
  render(<ExpenseCard expense={exactExpense} members={members} baseCurrency="USD" />)
  const breakdown = screen.getByRole("list", { name: "Breakdown for Souvenirs" })
  within(breakdown).getByText("¥3,000")
  within(breakdown).getByText("¥2,000")
})

test("renders an edit button that calls onEdit with the expense id", async () => {
  const onEdit = vi.fn()
  const user = userEvent.setup()
  render(<ExpenseCard expense={expense} members={members} baseCurrency="USD" onEdit={onEdit} />)
  await user.click(screen.getByRole("button", { name: "Edit Taxi" }))
  expect(onEdit).toHaveBeenCalledWith("e1")
})

test("omits the edit button when onEdit is not provided", () => {
  render(<ExpenseCard expense={expense} members={members} baseCurrency="USD" />)
  expect(screen.queryByRole("button", { name: /Edit/ })).toBeNull()
})

test("renders a delete button that calls onDelete with the expense id", async () => {
  const onDelete = vi.fn()
  const user = userEvent.setup()
  render(<ExpenseCard expense={expense} members={members} baseCurrency="USD" onDelete={onDelete} />)
  await user.click(screen.getByRole("button", { name: "Delete Taxi" }))
  expect(onDelete).toHaveBeenCalledWith("e1")
})

test("omits the delete button when onDelete is not provided", () => {
  render(<ExpenseCard expense={expense} members={members} baseCurrency="USD" />)
  expect(screen.queryByRole("button", { name: /Delete/ })).toBeNull()
})
