import { Button } from "@allsquare/ui"
import { useState } from "react"
import { Link } from "react-router-dom"
import { TripCard } from "../components/TripCard"
import { DEFAULT_META, usePageMeta } from "../lib/pageMeta"
import { forgetTrip, getTrips } from "../lib/recentTrips"
import { Landing } from "./Landing"

export function Dashboard() {
  const [trips, setTrips] = useState(getTrips)
  // When empty this renders <Landing/>, whose own meta must win; effects run
  // child-first, so mirror the landing meta here instead of overwriting it.
  usePageMeta(trips.length === 0 ? DEFAULT_META : { title: "Your trips | Allsquare" })

  // Smart root: a device with no trips yet gets the pitch; returning users
  // go straight to their trips. The landing stays reachable at /about.
  if (trips.length === 0) return <Landing />

  const forget = (slug: string) => {
    forgetTrip(slug)
    setTrips(getTrips())
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">
          Your trips
        </h1>
        <p className="text-sm text-muted-foreground">
          Trips you've started or opened on this device.
        </p>
      </div>
      <ul aria-label="Your trips" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {trips.map((trip) => (
          <TripCard key={trip.slug} trip={trip} onForget={forget} />
        ))}
      </ul>
      <Button asChild variant="outline" className="w-full">
        <Link to="/new">Start a group</Link>
      </Button>
      <Link
        to="/about"
        className="self-center font-mono text-[0.62rem] uppercase tracking-wider text-muted-foreground no-underline hover:underline"
      >
        What is Allsquare?
      </Link>
    </main>
  )
}
