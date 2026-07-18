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

test("the expense form is collapsed until you tap Add an expense", async () => {
  const user = userEvent.setup()
  renderAt()
  await waitFor(() => screen.getByRole("heading", { name: "Kyoto Trip" }))

  // Overview leads: the form is hidden, only the open button shows.
  expect(screen.queryByRole("heading", { name: "Add an expense" })).toBeNull()
  await user.click(screen.getByRole("button", { name: "Add an expense" }))

  // The form is now revealed.
  await screen.findByRole("heading", { name: "Add an expense" })
  screen.getByRole("textbox", { name: "Description" })

  // Cancel returns to the overview.
  await user.click(screen.getByRole("button", { name: "Cancel" }))
  await waitFor(() => expect(screen.queryByRole("heading", { name: "Add an expense" })).toBeNull())
})

test("tapping Edit on an expense opens the form in edit mode", async () => {
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
  server.use(
    http.get("http://localhost/api/groups/abc123", () => HttpResponse.json(withExpense)),
    http.get("http://localhost/api/groups/abc123/settlement", () => HttpResponse.json(settlement)),
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
  // No edit form is open yet.
  expect(screen.queryByRole("heading", { name: "Edit expense" })).toBeNull()
  await user.click(screen.getByRole("button", { name: "Edit Taxi" }))
  await screen.findByRole("heading", { name: "Edit expense" })
})

test("adding your name from the picker adds you and identifies you", async () => {
  let added = false
  const withCarol: GroupState = {
    ...state,
    members: [...state.members, { id: "m3", name: "Carol", sortOrder: 2 }],
  }
  server.use(
    http.get("http://localhost/api/groups/abc123", () =>
      HttpResponse.json(added ? withCarol : state),
    ),
    http.get("http://localhost/api/groups/abc123/settlement", () => HttpResponse.json(settlement)),
    http.post("http://localhost/api/groups/abc123/members", () => {
      added = true
      return HttpResponse.json({ id: "m3", name: "Carol", sortOrder: 2 }, { status: 201 })
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
  await waitFor(() => screen.getByRole("heading", { name: "Kyoto Trip" }))
  await user.type(screen.getByRole("textbox", { name: "Not listed? Add your name" }), "Carol")
  await user.click(screen.getByRole("button", { name: "Add & continue" }))
  await screen.findByText("You are Carol.")
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
