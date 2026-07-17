import type { Rounding } from "./types"

// A trip remembered on THIS device. There are no accounts (the link is the
// credential), so the dashboard is a device-local list, stored in the same
// place as the per-trip "who am I". We keep just enough to render a card
// header instantly and offline; live status is fetched per card.
export type SavedTrip = {
  slug: string
  title: string
  baseCurrency: string
  rounding: Rounding
}

const KEY = "allsquare:trips"

export function getTrips(): SavedTrip[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as SavedTrip[]) : []
  } catch {
    return []
  }
}

// Upsert by slug and move to the front, so the list is most-recent-first by
// array order — deterministic, no timestamps to sort.
export function recordTrip(trip: SavedTrip): void {
  try {
    const rest = getTrips().filter((t) => t.slug !== trip.slug)
    localStorage.setItem(KEY, JSON.stringify([trip, ...rest]))
  } catch {
    // private-mode / quota failures are non-fatal: the trip just isn't remembered.
  }
}

export function forgetTrip(slug: string): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(getTrips().filter((t) => t.slug !== slug)))
  } catch {
    // ignore
  }
}
