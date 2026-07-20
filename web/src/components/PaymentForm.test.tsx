import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { expect, test, vi } from "vitest"
import type { Member, Transfer } from "../lib/types"
import { PaymentForm } from "./PaymentForm"

const members: Member[] = [
  { id: "m1", name: "Alice", sortOrder: 0 },
  { id: "m2", name: "Bob", sortOrder: 1 },
]

// Bob owes Alice $19.83 (the netted suggestion).
const transfers: Transfer[] = [{ from: "m2", to: "m1", amountMinor: 1983 }]

test("prefills from the active member's suggested transfer and records it", async () => {
  const onRecordPayment = vi.fn().mockResolvedValue(undefined)
  const onCancel = vi.fn()
  const user = userEvent.setup({ pointerEventsCheck: 0 })
  render(
    <PaymentForm
      members={members}
      transfers={transfers}
      baseCurrency="USD"
      defaultFromId="m2"
      onRecordPayment={onRecordPayment}
      onCancel={onCancel}
    />,
  )
  // Bob is the active member and the debtor, so the fields are pre-filled.
  expect(screen.getByRole("combobox", { name: "Who paid" })).toHaveTextContent("Bob")
  expect(screen.getByRole("combobox", { name: "Paid to" })).toHaveTextContent("Alice")
  expect(screen.getByRole("textbox", { name: /Amount/ })).toHaveValue("19.83")

  await user.click(screen.getByRole("button", { name: "Record payment" }))
  await vi.waitFor(() => expect(onRecordPayment).toHaveBeenCalledWith("m2", "m1", 1983))
  expect(onCancel).toHaveBeenCalled()
})

test("a suggested-transfer chip fills the fields in one tap", async () => {
  const onRecordPayment = vi.fn().mockResolvedValue(undefined)
  const user = userEvent.setup({ pointerEventsCheck: 0 })
  render(
    <PaymentForm
      members={members}
      transfers={transfers}
      baseCurrency="USD"
      defaultFromId="m1"
      onRecordPayment={onRecordPayment}
      onCancel={vi.fn()}
    />,
  )
  await user.click(screen.getByRole("button", { name: "Bob → Alice · $19.83" }))
  expect(screen.getByRole("combobox", { name: "Who paid" })).toHaveTextContent("Bob")
  expect(screen.getByRole("textbox", { name: /Amount/ })).toHaveValue("19.83")
})

test("manual entry with no suggestions records the payment", async () => {
  const onRecordPayment = vi.fn().mockResolvedValue(undefined)
  const user = userEvent.setup({ pointerEventsCheck: 0 })
  render(
    <PaymentForm
      members={members}
      transfers={[]}
      baseCurrency="USD"
      defaultFromId="m1"
      onRecordPayment={onRecordPayment}
      onCancel={vi.fn()}
    />,
  )
  // Defaults: Alice pays, Bob receives (first member who isn't the payer).
  expect(screen.getByRole("combobox", { name: "Who paid" })).toHaveTextContent("Alice")
  expect(screen.getByRole("combobox", { name: "Paid to" })).toHaveTextContent("Bob")
  await user.type(screen.getByRole("textbox", { name: /Amount/ }), "5")
  await user.click(screen.getByRole("button", { name: "Record payment" }))
  await vi.waitFor(() => expect(onRecordPayment).toHaveBeenCalledWith("m1", "m2", 500))
})

test("blocks recording when payer and recipient are the same person", async () => {
  const onRecordPayment = vi.fn().mockResolvedValue(undefined)
  const user = userEvent.setup({ pointerEventsCheck: 0 })
  render(
    <PaymentForm
      members={members}
      transfers={transfers}
      baseCurrency="USD"
      defaultFromId="m2"
      onRecordPayment={onRecordPayment}
      onCancel={vi.fn()}
    />,
  )
  // Set "Paid to" to Bob as well (same as payer).
  await user.click(screen.getByRole("combobox", { name: "Paid to" }))
  await user.click(await screen.findByRole("option", { name: "Bob" }))
  await user.click(screen.getByRole("button", { name: "Record payment" }))

  await screen.findByRole("alert")
  expect(onRecordPayment).not.toHaveBeenCalled()
})
