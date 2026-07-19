import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { expect, test, vi } from "vitest"
import type { Member, Transfer } from "../lib/types"
import { SettleRow } from "./SettleRow"

const members: Member[] = [
  { id: "m1", name: "Alice", sortOrder: 0 },
  { id: "m2", name: "Bob", sortOrder: 1 },
]

test("renders the transfer as 'from -> to' plus the amount", () => {
  const transfer: Transfer = { from: "m2", to: "m1", amountMinor: 15150 }
  render(
    <SettleRow transfer={transfer} members={members} baseCurrency="JPY" onMarkPaid={vi.fn()} />,
  )
  screen.getByText("Bob → Alice")
  screen.getByText("¥15,150")
})

test("falls back to '?' for an unknown member id", () => {
  const transfer: Transfer = { from: "m9", to: "m1", amountMinor: 100 }
  render(
    <SettleRow transfer={transfer} members={members} baseCurrency="USD" onMarkPaid={vi.fn()} />,
  )
  screen.getByText("? → Alice")
})

test("Mark paid reports the transfer to the parent", async () => {
  const user = userEvent.setup()
  const onMarkPaid = vi.fn().mockResolvedValue(undefined)
  const transfer: Transfer = { from: "m2", to: "m1", amountMinor: 2500 }
  render(
    <SettleRow transfer={transfer} members={members} baseCurrency="USD" onMarkPaid={onMarkPaid} />,
  )
  await user.click(screen.getByRole("button", { name: "Mark Bob paid Alice" }))
  expect(onMarkPaid).toHaveBeenCalledWith(transfer)
})

test("shows an error when recording the payment fails", async () => {
  const user = userEvent.setup()
  const onMarkPaid = vi.fn().mockRejectedValue(new Error("boom"))
  const transfer: Transfer = { from: "m2", to: "m1", amountMinor: 2500 }
  render(
    <SettleRow transfer={transfer} members={members} baseCurrency="USD" onMarkPaid={onMarkPaid} />,
  )
  await user.click(screen.getByRole("button", { name: "Mark Bob paid Alice" }))
  await screen.findByRole("alert")
  // the button recovers so the payment can be retried
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Mark Bob paid Alice" })).toBeEnabled(),
  )
})
