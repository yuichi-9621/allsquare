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

test("payee with a Venmo handle gets a Pay link with amount and note", () => {
  const withHandle: Member[] = [
    { id: "m1", name: "Alice", sortOrder: 0, paymentHandle: "@alice-pays" },
    { id: "m2", name: "Bob", sortOrder: 1 },
  ]
  const transfer: Transfer = { from: "m2", to: "m1", amountMinor: 4200 }
  render(
    <SettleRow
      transfer={transfer}
      members={withHandle}
      baseCurrency="USD"
      note="Kyoto"
      onMarkPaid={vi.fn()}
    />,
  )
  const link = screen.getByRole("link", { name: "Pay Alice" })
  expect(link).toHaveAttribute(
    "href",
    "https://venmo.com/u/alice-pays?txn=pay&amount=42.00&note=Kyoto",
  )
})

test("payee with plain-text payment info gets a copy button", async () => {
  const user = userEvent.setup()
  const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue()
  const withHandle: Member[] = [
    { id: "m1", name: "Alice", sortOrder: 0, paymentHandle: "Apple Pay: 415-555-0100" },
    { id: "m2", name: "Bob", sortOrder: 1 },
  ]
  const transfer: Transfer = { from: "m2", to: "m1", amountMinor: 4200 }
  render(
    <SettleRow
      transfer={transfer}
      members={withHandle}
      baseCurrency="USD"
      note="Kyoto"
      onMarkPaid={vi.fn()}
    />,
  )
  await user.click(screen.getByRole("button", { name: "Copy Alice's payment info" }))
  expect(writeText).toHaveBeenCalledWith("Apple Pay: 415-555-0100")
  await screen.findByText("Copied!")
})

test("no Pay affordance when the payee has no handle", () => {
  const transfer: Transfer = { from: "m2", to: "m1", amountMinor: 4200 }
  render(
    <SettleRow
      transfer={transfer}
      members={members}
      baseCurrency="USD"
      note="Kyoto"
      onMarkPaid={vi.fn()}
    />,
  )
  expect(screen.queryByRole("link", { name: "Pay Alice" })).toBeNull()
})
