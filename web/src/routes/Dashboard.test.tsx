import { render, screen } from "@testing-library/react"
import { http, HttpResponse } from "msw"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, expect, test } from "vitest"
import { recordTrip } from "../lib/recentTrips"
import { server } from "../test/server"
import { Dashboard } from "./Dashboard"

beforeEach(() => localStorage.clear())

test("with no saved trips it falls through to the create form", () => {
  render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>,
  )
  screen.getByRole("heading", { name: "Start a group" })
})

test("lists saved trips with a create-group call to action", async () => {
  recordTrip({ slug: "abc", title: "Kyoto", baseCurrency: "JPY", rounding: 1 })
  server.use(
    http.get("http://localhost/api/groups/abc/settlement", () =>
      HttpResponse.json({ balances: [], transfers: [] }),
    ),
  )
  render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>,
  )
  screen.getByRole("heading", { name: "Your trips" })
  screen.getByText("Kyoto")
  expect(screen.getByRole("link", { name: "Start a group" }).getAttribute("href")).toBe("/new")
  await screen.findByText("Settled")
})
