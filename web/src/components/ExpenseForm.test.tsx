import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { expect, test, vi } from "vitest"
import type { Expense, Group, Member } from "../lib/types"
import { server } from "../test/server"
import { ExpenseForm } from "./ExpenseForm"

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
  const user = userEvent.setup({ pointerEventsCheck: 0 })
  render(<ExpenseForm group={group} members={members} defaultPayerId="m1" onAdded={onAdded} />)

  await user.type(screen.getByRole("textbox", { name: "Description" }), "Ramen")
  await user.click(screen.getByRole("combobox", { name: "Currency" }))
  await user.click(await screen.findByRole("option", { name: "JPY" }))
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
  const user = userEvent.setup({ pointerEventsCheck: 0 })
  render(<ExpenseForm group={group} members={members} defaultPayerId="m1" onAdded={onAdded} />)

  await user.type(screen.getByRole("textbox", { name: "Description" }), "Wagyu")
  await user.click(screen.getByRole("radio", { name: "Exact" }))
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

test("exact split in a foreign currency posts shares in that currency", async () => {
  let posted: Record<string, unknown> = {}
  server.use(
    http.get("http://localhost/api/fx", () =>
      HttpResponse.json({ rate: 1.1, rateDate: "2026-07-16" }),
    ),
    http.post("http://localhost/api/groups/abc123/expenses", async ({ request }) => {
      posted = (await request.json()) as Record<string, unknown>
      return HttpResponse.json({}, { status: 201 })
    }),
  )
  const onAdded = vi.fn()
  const user = userEvent.setup({ pointerEventsCheck: 0 })
  render(<ExpenseForm group={group} members={members} defaultPayerId="m1" onAdded={onAdded} />)

  await user.type(screen.getByRole("textbox", { name: "Description" }), "Gelato")
  await user.click(screen.getByRole("radio", { name: "Exact" }))
  await user.click(screen.getByRole("combobox", { name: "Currency" }))
  await user.click(await screen.findByRole("option", { name: "EUR" }))
  await user.type(screen.getByRole("textbox", { name: "Exact amount for Alice" }), "10")
  await user.type(screen.getByRole("textbox", { name: "Exact amount for Bob" }), "5")

  // total €15.00 * 1.1 = $16.50 preview
  await waitFor(() => expect(screen.getByTestId("fx-preview")).toHaveTextContent("≈ $16.50"))

  await user.click(screen.getByRole("button", { name: "Add expense" }))
  await waitFor(() => expect(onAdded).toHaveBeenCalled())

  expect(posted.currency).toBe("EUR")
  expect(posted.amountMinor).toBe(1500)
  expect(posted.split).toEqual({
    kind: "exact",
    shares: [
      { memberId: "m1", amountMinor: 1000 },
      { memberId: "m2", amountMinor: 500 },
    ],
  })
})

test("blocks submit with an invalid amount", async () => {
  const onAdded = vi.fn()
  const user = userEvent.setup({ pointerEventsCheck: 0 })
  render(<ExpenseForm group={group} members={members} defaultPayerId="m1" onAdded={onAdded} />)
  await user.type(screen.getByRole("textbox", { name: "Description" }), "Bad")
  await user.click(screen.getByRole("button", { name: "Add expense" }))
  await screen.findByRole("alert")
  expect(onAdded).not.toHaveBeenCalled()
})

const equalExpense: Expense = {
  id: "e1",
  payerId: "m1",
  amountMinor: 2000,
  currency: "USD",
  fxRateToBase: 1,
  fxRateDate: "2026-07-16",
  description: "Ramen",
  split: { kind: "equal", participantIds: ["m1", "m2"] },
  createdAt: "2026-07-16T00:00:00Z",
}

test("edit mode: prefills from the expense and PATCHes the changes", async () => {
  let patched: Record<string, unknown> = {}
  server.use(
    http.patch("http://localhost/api/groups/abc123/expenses/e1", async ({ request }) => {
      patched = (await request.json()) as Record<string, unknown>
      return HttpResponse.json({}, { status: 200 })
    }),
  )
  const onAdded = vi.fn()
  const onCancel = vi.fn()
  const user = userEvent.setup({ pointerEventsCheck: 0 })
  render(
    <ExpenseForm
      group={group}
      members={members}
      defaultPayerId="m1"
      onAdded={onAdded}
      expense={equalExpense}
      onCancel={onCancel}
    />,
  )

  // prefilled from the expense
  expect(screen.getByRole("textbox", { name: "Description" })).toHaveValue("Ramen")
  expect(screen.getByRole("textbox", { name: "Amount" })).toHaveValue("20.00")

  await user.clear(screen.getByRole("textbox", { name: "Amount" }))
  await user.type(screen.getByRole("textbox", { name: "Amount" }), "25")
  await user.click(screen.getByRole("button", { name: "Save changes" }))

  await waitFor(() => expect(onAdded).toHaveBeenCalled())
  expect(patched.amountMinor).toBe(2500)
  expect(patched.currency).toBe("USD")
  expect(onCancel).toHaveBeenCalled()
})

test("edit mode: Cancel exits without saving", async () => {
  const onAdded = vi.fn()
  const onCancel = vi.fn()
  const user = userEvent.setup({ pointerEventsCheck: 0 })
  render(
    <ExpenseForm
      group={group}
      members={members}
      defaultPayerId="m1"
      onAdded={onAdded}
      expense={equalExpense}
      onCancel={onCancel}
    />,
  )
  await user.click(screen.getByRole("button", { name: "Cancel" }))
  expect(onCancel).toHaveBeenCalled()
  expect(onAdded).not.toHaveBeenCalled()
})

test("edit mode: previews a foreign-currency amount against the FROZEN rate (no live fetch)", async () => {
  // No /api/fx handler is registered; with onUnhandledRequest:"error" a live
  // fetch would fail this test. The preview must come from the frozen rate.
  const foreign: Expense = {
    ...equalExpense,
    id: "e3",
    amountMinor: 5000,
    currency: "JPY",
    fxRateToBase: 0.0066,
  }
  render(
    <ExpenseForm
      group={group}
      members={members}
      defaultPayerId="m1"
      onAdded={vi.fn()}
      expense={foreign}
      onCancel={vi.fn()}
    />,
  )
  // 5000 JPY * 0.0066 = 3300 cents = $33.00
  await waitFor(() => expect(screen.getByTestId("fx-preview")).toHaveTextContent("≈ $33.00"))
})

test("edit mode: prefills an exact split in base amounts", () => {
  const exactExpense: Expense = {
    ...equalExpense,
    id: "e2",
    amountMinor: 3000,
    description: "Wagyu",
    split: {
      kind: "exact",
      shares: [
        { memberId: "m1", amountMinor: 2000 },
        { memberId: "m2", amountMinor: 1000 },
      ],
    },
  }
  render(
    <ExpenseForm
      group={group}
      members={members}
      defaultPayerId="m1"
      onAdded={vi.fn()}
      expense={exactExpense}
      onCancel={vi.fn()}
    />,
  )
  expect(screen.getByRole("radio", { name: "Exact" })).toBeChecked()
  expect(screen.getByRole("textbox", { name: "Exact amount for Alice" })).toHaveValue("20.00")
  expect(screen.getByRole("textbox", { name: "Exact amount for Bob" })).toHaveValue("10.00")
})
