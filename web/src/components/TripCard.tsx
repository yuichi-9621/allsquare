import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@allsquare/ui"
import type { BadgeProps } from "@allsquare/ui"
import { Link } from "react-router-dom"
import { useT } from "../lib/i18n"
import { useTripStatus } from "../hooks/useTripStatus"
import { getActiveMemberId } from "../lib/activeMember"
import { formatMoney } from "../lib/money"
import type { SavedTrip } from "../lib/recentTrips"

type StatusKind = "loading" | "unavailable" | "settled" | "owing"

const STATUS_VARIANT: Record<StatusKind, NonNullable<BadgeProps["variant"]>> = {
  loading: "muted",
  unavailable: "danger",
  settled: "success",
  owing: "foil",
}

const POSITION_CLASS: Record<"owed" | "owe" | "square", string> = {
  owed: "text-success",
  owe: "text-danger",
  square: "text-muted-foreground",
}

export function TripCard({
  trip,
  onForget,
}: {
  trip: SavedTrip
  onForget: (slug: string) => void
}) {
  const t = useT()
  const { loading, unavailable, settlement } = useTripStatus(trip.slug, trip.rounding)
  const activeId = getActiveMemberId(trip.slug)

  let statusKind: StatusKind
  let statusText: string
  if (loading) {
    statusKind = "loading"
    statusText = t("tripStatusChecking")
  } else if (unavailable || !settlement) {
    statusKind = "unavailable"
    statusText = t("tripStatusUnavailable")
  } else if (settlement.transfers.length === 0) {
    statusKind = "settled"
    statusText = t("tripStatusSettled")
  } else {
    statusKind = "owing"
    const n = settlement.transfers.length
    statusText = n === 1 ? t("tripStatusToSettleOne") : t("tripStatusToSettle", { n })
  }

  // "Your position" only when you've told this device who you are on this trip.
  const balance =
    settlement && activeId ? settlement.balances.find((b) => b.memberId === activeId) : undefined
  let position: { text: string; tone: "owed" | "owe" | "square" } | null = null
  if (balance) {
    if (balance.netMinor > 0) {
      position = {
        text: t("youAreOwedAmount", { amount: formatMoney(balance.netMinor, trip.baseCurrency) }),
        tone: "owed",
      }
    } else if (balance.netMinor < 0) {
      position = {
        text: t("youOweAmount", { amount: formatMoney(-balance.netMinor, trip.baseCurrency) }),
        tone: "owe",
      }
    } else {
      position = { text: t("youAreAllSquare"), tone: "square" }
    }
  }

  return (
    <li>
      <Card className="relative">
        <Link to={`/g/${trip.slug}`} className="block rounded-lg focus-visible:outline-none">
          {/* pr-24 keeps the title clear of the absolutely-positioned Remove button. */}
          <CardHeader className="pr-24">
            <CardTitle className="min-w-0 truncate">{trip.title}</CardTitle>
          </CardHeader>
          <CardContent>
            {position ? (
              <p className={`text-sm ${POSITION_CLASS[position.tone]}`}>{position.text}</p>
            ) : null}
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant={STATUS_VARIANT[statusKind]} data-status={statusKind}>
                {statusText}
              </Badge>
              <Badge variant="muted">{trip.baseCurrency}</Badge>
            </div>
          </CardContent>
        </Link>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={t("removeTrip", { title: trip.title })}
          onClick={() => onForget(trip.slug)}
          className="absolute right-2 top-2"
        >
          {t("remove")}
        </Button>
      </Card>
    </li>
  )
}
