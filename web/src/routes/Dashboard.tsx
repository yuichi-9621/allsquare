import { useState } from "react"
import { Link } from "react-router-dom"
import { TripCard } from "../components/TripCard"
import { forgetTrip, getTrips } from "../lib/recentTrips"
import { CreateGroup } from "./CreateGroup"

export function Dashboard() {
  const [trips, setTrips] = useState(getTrips)

  // A device with no trips yet lands straight on the create form — first run
  // is unchanged, and there's no empty dashboard to explain.
  if (trips.length === 0) return <CreateGroup />

  const forget = (slug: string) => {
    forgetTrip(slug)
    setTrips(getTrips())
  }

  return (
    <main>
      <h1>Your trips</h1>
      <p className="lede">Trips you've started or opened on this device.</p>
      <ul aria-label="Your trips" className="trip-list">
        {trips.map((trip) => (
          <TripCard key={trip.slug} trip={trip} onForget={forget} />
        ))}
      </ul>
      <Link className="cta-link" to="/new">
        Start a group
      </Link>
    </main>
  )
}
