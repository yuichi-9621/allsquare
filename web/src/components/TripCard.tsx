import { Link } from "react-router-dom"
import { useTripStatus } from "../hooks/useTripStatus"
import { getActiveMemberId } from "../lib/activeMember"
import { formatMoney } from "../lib/money"
import type { SavedTrip } from "../lib/recentTrips"

type StatusKind = "loading" | "unavailable" | "settled" | "owing"

export function TripCard({
  trip,
  onForget,
}: {
  trip: SavedTrip
  onForget: (slug: string) => void
}) {
  const { loading, unavailable, settlement } = useTripStatus(trip.slug, trip.rounding)
  const activeId = getActiveMemberId(trip.slug)

  let statusKind: StatusKind
  let statusText: string
  if (loading) {
    statusKind = "loading"
    statusText = "Checking…"
  } else if (unavailable || !settlement) {
    statusKind = "unavailable"
    statusText = "Couldn't load"
  } else if (settlement.transfers.length === 0) {
    statusKind = "settled"
    statusText = "Settled"
  } else {
    statusKind = "owing"
    const n = settlement.transfers.length
    statusText = `${n} payment${n === 1 ? "" : "s"} to settle`
  }

  // "Your position" only when you've told this device who you are on this trip.
  const balance =
    settlement && activeId ? settlement.balances.find((b) => b.memberId === activeId) : undefined
  let position: { text: string; tone: "owed" | "owe" | "square" } | null = null
  if (balance) {
    if (balance.netMinor > 0) {
      position = {
        text: `You are owed ${formatMoney(balance.netMinor, trip.baseCurrency)}`,
        tone: "owed",
      }
    } else if (balance.netMinor < 0) {
      position = {
        text: `You owe ${formatMoney(-balance.netMinor, trip.baseCurrency)}`,
        tone: "owe",
      }
    } else {
      position = { text: "You are all square", tone: "square" }
    }
  }

  return (
    <li className="trip">
      <Link className="trip-open" to={`/g/${trip.slug}`}>
        <span className="trip-head">
          <span className="trip-title">{trip.title}</span>
          <span className="trip-currency">{trip.baseCurrency}</span>
        </span>
        {position ? (
          <span className={`trip-position trip-position--${position.tone}`}>{position.text}</span>
        ) : null}
        <span className="trip-status" data-status={statusKind}>
          {statusText}
        </span>
      </Link>
      <button
        type="button"
        className="trip-forget"
        aria-label={`Remove ${trip.title}`}
        onClick={() => onForget(trip.slug)}
      >
        Remove
      </button>
    </li>
  )
}
