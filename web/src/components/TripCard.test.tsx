import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, expect, test, vi } from "vitest"
import type { SavedTrip } from "../lib/recentTrips"
import { server } from "../test/server"
import { TripCard } from "./TripCard"

const trip: SavedTrip = { slug: "abc", title: "Kyoto", baseCurrency: "JPY", rounding: 1 }

function renderCard(t: SavedTrip = trip, onForget = vi.fn()) {
  render(
    <MemoryRouter>
      <ul>
        <TripCard trip={t} onForget={onForget} />
      </ul>
    </MemoryRouter>,
  )
  return onForget
}

beforeEach(() => localStorage.clear())

test("shows a settled status when there are no transfers", async () => {
  server.use(
    http.get("http://localhost/api/groups/abc/settlement", () =>
      HttpResponse.json({ balances: [], transfers: [] }),
    ),
  )
  renderCard()
  screen.getByText("Kyoto")
  await screen.findByText("Settled")
})

test("shows the number of payments to settle", async () => {
  server.use(
    http.get("http://localhost/api/groups/abc/settlement", () =>
      HttpResponse.json({
        balances: [
          { memberId: "m1", netMinor: 3400 },
          { memberId: "m2", netMinor: -3400 },
        ],
        transfers: [{ from: "m2", to: "m1", amountMinor: 3400 }],
      }),
    ),
  )
  renderCard()
  await screen.findByText("1 payment to settle")
})

test("shows your position when you've picked who you are", async () => {
  localStorage.setItem("allsquare:activeMember:abc", "m1")
  server.use(
    http.get("http://localhost/api/groups/abc/settlement", () =>
      HttpResponse.json({
        balances: [{ memberId: "m1", netMinor: 8200 }],
        transfers: [{ from: "m2", to: "m1", amountMinor: 8200 }],
      }),
    ),
  )
  renderCard()
  await screen.findByText("You are owed ¥8,200")
})

test("links to the group and can be removed", async () => {
  server.use(
    http.get("http://localhost/api/groups/abc/settlement", () =>
      HttpResponse.json({ balances: [], transfers: [] }),
    ),
  )
  const onForget = renderCard()
  expect(screen.getByRole("link").getAttribute("href")).toBe("/g/abc")
  await userEvent.click(screen.getByRole("button", { name: "Remove Kyoto" }))
  expect(onForget).toHaveBeenCalledWith("abc")
})

test("marks a trip whose group no longer loads", async () => {
  server.use(
    http.get(
      "http://localhost/api/groups/gone/settlement",
      () => new HttpResponse(null, { status: 404 }),
    ),
  )
  renderCard({ ...trip, slug: "gone" })
  await screen.findByText("Couldn't load")
})
