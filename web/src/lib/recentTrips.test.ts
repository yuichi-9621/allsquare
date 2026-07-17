import { beforeEach, expect, test } from "vitest"
import { type SavedTrip, forgetTrip, getTrips, recordTrip } from "./recentTrips"

const trip = (slug: string, title = slug): SavedTrip => ({
  slug,
  title,
  baseCurrency: "USD",
  rounding: 1,
})

beforeEach(() => localStorage.clear())

test("returns an empty list when nothing is stored", () => {
  expect(getTrips()).toEqual([])
})

test("records trips most-recent-first", () => {
  recordTrip(trip("a"))
  recordTrip(trip("b"))
  expect(getTrips().map((t) => t.slug)).toEqual(["b", "a"])
})

test("re-recording a slug de-dupes and moves it to the front with fresh data", () => {
  recordTrip(trip("a", "Old title"))
  recordTrip(trip("b"))
  recordTrip(trip("a", "New title"))
  const trips = getTrips()
  expect(trips.map((t) => t.slug)).toEqual(["a", "b"])
  expect(trips[0]?.title).toBe("New title")
})

test("forgetTrip removes only the named trip", () => {
  recordTrip(trip("a"))
  recordTrip(trip("b"))
  forgetTrip("a")
  expect(getTrips().map((t) => t.slug)).toEqual(["b"])
})

test("survives corrupt storage", () => {
  localStorage.setItem("allsquare:trips", "{ not json")
  expect(getTrips()).toEqual([])
})
