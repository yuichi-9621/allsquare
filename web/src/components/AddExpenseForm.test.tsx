import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { expect, test, vi } from "vitest"
import type { Group, Member } from "../lib/types"
import { server } from "../test/server"
import { AddExpenseForm } from "./AddExpenseForm"

const group: Group = {
  slug: "abc123",
  title: "Kyoto",
  baseCurrency: "USD",
  rounding: 1,
  createdAt: "2026-07-16T00:00:00Z",
}
const members: Member[] = [
  { id: "m1", name: "Alice", sortOrder: 0 },
  { id: "m2", name: "Bob", sortOrder: 1 },
]

test("equal split: shows a live base preview and POSTs an equal expense", async () => {
  server.use(
    http.get("http://localhost/api/fx", () =>
      HttpResponse.json({ rate: 0.0066, rateDate: "2026-07-16" }),
    ),
  )
  let posted: Record<string, unknown> = {}
  server.use(
    http.post("http://localhost/api/groups/abc123/expenses", async ({ request }) => {
      posted = (await request.json()) as Record<string, unknown>
      return HttpResponse.json({}, { status: 201 })
    }),
  )
  const onAdded = vi.fn()
  const user = userEvent.setup()
  render(<AddExpenseForm group={group} members={members} defaultPayerId="m1" onAdded={onAdded} />)

  await user.type(screen.getByRole("textbox", { name: "Description" }), "Ramen")
  await user.selectOptions(screen.getByRole("combobox", { name: "Currency" }), "JPY")
  await user.type(screen.getByRole("textbox", { name: "Amount" }), "5000")

  // 5000 JPY * 0.0066 = 3300 cents = $33.00
  await waitFor(() => expect(screen.getByTestId("fx-preview")).toHaveTextContent("≈ $33.00"))

  await user.click(screen.getByRole("button", { name: "Add expense" }))
  await waitFor(() => expect(onAdded).toHaveBeenCalled())

  expect(posted.currency).toBe("JPY")
  expect(posted.amountMinor).toBe(5000)
  expect(posted.split).toEqual({ kind: "equal", participantIds: ["m1", "m2"] })
})

test("exact split: entered in base currency, POSTs shares that sum to the total", async () => {
  let posted: Record<string, unknown> = {}
  server.use(
    http.post("http://localhost/api/groups/abc123/expenses", async ({ request }) => {
      posted = (await request.json()) as Record<string, unknown>
      return HttpResponse.json({}, { status: 201 })
    }),
  )
  const onAdded = vi.fn()
  const user = userEvent.setup()
  render(<AddExpenseForm group={group} members={members} defaultPayerId="m1" onAdded={onAdded} />)

  await user.type(screen.getByRole("textbox", { name: "Description" }), "Wagyu")
  await user.click(screen.getByRole("radio", { name: "Exact (in USD)" }))
  await user.type(screen.getByRole("textbox", { name: "Exact amount for Alice" }), "20")
  await user.type(screen.getByRole("textbox", { name: "Exact amount for Bob" }), "10")
  await user.click(screen.getByRole("button", { name: "Add expense" }))
  await waitFor(() => expect(onAdded).toHaveBeenCalled())

  expect(posted.currency).toBe("USD")
  expect(posted.amountMinor).toBe(3000)
  expect(posted.split).toEqual({
    kind: "exact",
    shares: [
      { memberId: "m1", amountMinor: 2000 },
      { memberId: "m2", amountMinor: 1000 },
    ],
  })
})

test("blocks submit with an invalid amount", async () => {
  const onAdded = vi.fn()
  const user = userEvent.setup()
  render(<AddExpenseForm group={group} members={members} defaultPayerId="m1" onAdded={onAdded} />)
  await user.type(screen.getByRole("textbox", { name: "Description" }), "Bad")
  await user.click(screen.getByRole("button", { name: "Add expense" }))
  await screen.findByRole("alert")
  expect(onAdded).not.toHaveBeenCalled()
})
