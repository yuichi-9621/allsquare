import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { expect, test } from "vitest"
import type { GroupState } from "../lib/types"
import { server } from "../test/server"
import { CreateGroup } from "./CreateGroup"

function renderApp() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<CreateGroup />} />
        <Route path="/g/:slug" element={<div>Group page abc123</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

test("submitting a valid form creates a group and navigates to /g/:slug", async () => {
  const state: GroupState = {
    group: {
      slug: "abc123",
      title: "Kyoto",
      baseCurrency: "JPY",
      rounding: 100,
      createdAt: "2026-07-16T00:00:00Z",
    },
    members: [
      { id: "m1", name: "Alice", sortOrder: 0 },
      { id: "m2", name: "Bob", sortOrder: 1 },
    ],
    expenses: [],
  }
  let body: { title?: string; memberNames?: string[]; baseCurrency?: string } = {}
  server.use(
    http.post("http://localhost/api/groups", async ({ request }) => {
      body = (await request.json()) as typeof body
      return HttpResponse.json(state, { status: 201 })
    }),
  )

  const user = userEvent.setup()
  renderApp()

  await user.type(screen.getByRole("textbox", { name: "Trip title" }), "Kyoto")
  await user.selectOptions(screen.getByRole("combobox", { name: "Base currency" }), "JPY")
  await user.type(screen.getByRole("textbox", { name: "Member 1" }), "Alice")
  await user.type(screen.getByRole("textbox", { name: "Member 2" }), "Bob")
  await user.click(screen.getByRole("button", { name: "Create group" }))

  await screen.findByText("Group page abc123")
  expect(body.title).toBe("Kyoto")
  expect(body.baseCurrency).toBe("JPY")
  expect(body.memberNames).toEqual(["Alice", "Bob"])
})

test("an added member row can be removed again", async () => {
  const user = userEvent.setup()
  renderApp()
  await user.click(screen.getByRole("button", { name: "Add member" }))
  expect(screen.getByRole("textbox", { name: "Member 3" })).toBeTruthy()
  await user.click(screen.getByRole("button", { name: "Remove member 3" }))
  expect(screen.queryByRole("textbox", { name: "Member 3" })).toBeNull()
})

test("rejects a form with fewer than two members", async () => {
  const user = userEvent.setup()
  renderApp()
  await user.type(screen.getByRole("textbox", { name: "Trip title" }), "Solo")
  await user.type(screen.getByRole("textbox", { name: "Member 1" }), "Alice")
  await user.click(screen.getByRole("button", { name: "Create group" }))
  await waitFor(() => screen.getByRole("alert"))
  expect(screen.queryByText("Group page abc123")).toBeNull()
})
