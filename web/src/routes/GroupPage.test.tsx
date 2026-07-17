import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { afterEach, expect, test } from "vitest"
import type { GroupState, Settlement } from "../lib/types"
import { server } from "../test/server"
import { GroupPage } from "./GroupPage"

const state: GroupState = {
  group: {
    slug: "abc123",
    title: "Kyoto Trip",
    baseCurrency: "USD",
    rounding: 1,
    createdAt: "2026-07-16T00:00:00Z",
  },
  members: [
    { id: "m1", name: "Alice", sortOrder: 0 },
    { id: "m2", name: "Bob", sortOrder: 1 },
  ],
  expenses: [],
}
const settlement: Settlement = { balances: [], transfers: [] }

afterEach(() => localStorage.clear())

function renderAt() {
  server.use(
    http.get("http://localhost/api/groups/abc123", () => HttpResponse.json(state)),
    http.get("http://localhost/api/groups/abc123/settlement", () => HttpResponse.json(settlement)),
  )
  return render(
    <MemoryRouter initialEntries={["/g/abc123"]}>
      <Routes>
        <Route path="/g/:slug" element={<GroupPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

test("loads the group and prompts the member picker", async () => {
  renderAt()
  await waitFor(() => screen.getByRole("heading", { name: "Kyoto Trip" }))
  screen.getByRole("button", { name: "I'm Alice" })
  screen.getByRole("heading", { name: "Settle up" })
})

test("deleting an expense calls DELETE and refreshes the group", async () => {
  const withExpense: GroupState = {
    ...state,
    expenses: [
      {
        id: "e1",
        payerId: "m1",
        amountMinor: 3000,
        currency: "USD",
        fxRateToBase: 1,
        fxRateDate: "2026-07-16",
        description: "Taxi",
        split: { kind: "equal", participantIds: ["m1", "m2"] },
        createdAt: "2026-07-16T00:00:00Z",
      },
    ],
  }
  let getCount = 0
  let deleted = false
  server.use(
    http.get("http://localhost/api/groups/abc123", () => {
      getCount++
      return HttpResponse.json(withExpense)
    }),
    http.get("http://localhost/api/groups/abc123/settlement", () => HttpResponse.json(settlement)),
    http.delete("http://localhost/api/groups/abc123/expenses/e1", () => {
      deleted = true
      return new HttpResponse(null, { status: 204 })
    }),
  )
  const user = userEvent.setup()
  render(
    <MemoryRouter initialEntries={["/g/abc123"]}>
      <Routes>
        <Route path="/g/:slug" element={<GroupPage />} />
      </Routes>
    </MemoryRouter>,
  )
  await screen.findByText("Taxi")
  const before = getCount
  await user.click(screen.getByRole("button", { name: "Delete Taxi" }))
  await waitFor(() => expect(deleted).toBe(true))
  await waitFor(() => expect(getCount).toBeGreaterThan(before))
})

test("refetches settlement when the expense ledger changes", async () => {
  const withExpense: GroupState = {
    ...state,
    expenses: [
      {
        id: "e1",
        payerId: "m1",
        amountMinor: 3000,
        currency: "USD",
        fxRateToBase: 1,
        fxRateDate: "2026-07-16",
        description: "Taxi",
        split: { kind: "equal", participantIds: ["m1", "m2"] },
        createdAt: "2026-07-16T00:00:00Z",
      },
    ],
  }
  let deleted = false
  let settlementCount = 0
  server.use(
    http.get("http://localhost/api/groups/abc123", () =>
      HttpResponse.json(deleted ? { ...withExpense, expenses: [] } : withExpense),
    ),
    http.get("http://localhost/api/groups/abc123/settlement", () => {
      settlementCount++
      return HttpResponse.json(settlement)
    }),
    http.delete("http://localhost/api/groups/abc123/expenses/e1", () => {
      deleted = true
      return new HttpResponse(null, { status: 204 })
    }),
  )
  const user = userEvent.setup()
  render(
    <MemoryRouter initialEntries={["/g/abc123"]}>
      <Routes>
        <Route path="/g/:slug" element={<GroupPage />} />
      </Routes>
    </MemoryRouter>,
  )
  await screen.findByText("Taxi")
  const before = settlementCount
  await user.click(screen.getByRole("button", { name: "Delete Taxi" }))
  await waitFor(() => expect(deleted).toBe(true))
  // ledger shrank 1 -> 0, so both settlement consumers (balances + transfers) refetch
  await waitFor(() => expect(settlementCount).toBeGreaterThan(before))
})
