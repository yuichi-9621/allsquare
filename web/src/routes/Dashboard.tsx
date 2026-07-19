import { Button } from "@allsquare/ui"
import { useState } from "react"
import { Link } from "react-router-dom"
import { TripCard } from "../components/TripCard"
import { useT } from "../lib/i18n"
import { usePageMeta } from "../lib/pageMeta"
import { forgetTrip, getTrips } from "../lib/recentTrips"
import { Landing } from "./Landing"

export function Dashboard() {
  const t = useT()
  const [trips, setTrips] = useState(getTrips)
  // When empty this renders <Landing/>, whose own meta must win; effects run
  // child-first, so mirror the landing meta here instead of overwriting it.
  usePageMeta(
    trips.length === 0
      ? { title: t("metaTitle"), description: t("metaDescription") }
      : { title: t("dashboardMetaTitle") },
  )

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
          {t("yourTrips")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("yourTripsDesc")}</p>
      </div>
      <ul aria-label={t("yourTrips")} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {trips.map((trip) => (
          <TripCard key={trip.slug} trip={trip} onForget={forget} />
        ))}
      </ul>
      <Button asChild variant="outline" className="w-full">
        <Link to="/new">{t("startGroup")}</Link>
      </Button>
      <Link
        to="/about"
        className="self-center font-mono text-[0.62rem] uppercase tracking-wider text-muted-foreground no-underline hover:underline"
      >
        {t("whatIsAllsquare")}
      </Link>
    </main>
  )
}
