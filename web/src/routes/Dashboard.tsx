import { Button } from "@allsquare/ui"
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
    <main className="flex w-full flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">
          Your trips
        </h1>
        <p className="text-sm text-muted-foreground">
          Trips you've started or opened on this device.
        </p>
      </div>
      <ul aria-label="Your trips" className="flex flex-col gap-3">
        {trips.map((trip) => (
          <TripCard key={trip.slug} trip={trip} onForget={forget} />
        ))}
      </ul>
      <Button asChild variant="outline" className="w-full">
        <Link to="/new">Start a group</Link>
      </Button>
    </main>
  )
}
