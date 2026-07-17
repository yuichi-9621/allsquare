import { useEffect, useState } from "react"
import { getSettlement } from "../lib/api"
import type { Rounding, Settlement } from "../lib/types"

export type TripStatus = {
  loading: boolean
  unavailable: boolean
  settlement: Settlement | null
}

// One-shot settlement fetch for a dashboard card. Unlike useSettlement it keeps
// loading and error distinct, so a card can show "Checking…" vs. a group that
// no longer loads ("Couldn't load", offering removal).
export function useTripStatus(slug: string, rounding: Rounding): TripStatus {
  const [status, setStatus] = useState<TripStatus>({
    loading: true,
    unavailable: false,
    settlement: null,
  })

  useEffect(() => {
    let alive = true
    setStatus({ loading: true, unavailable: false, settlement: null })
    getSettlement(slug, rounding)
      .then((s) => {
        if (alive) setStatus({ loading: false, unavailable: false, settlement: s })
      })
      .catch(() => {
        if (alive) setStatus({ loading: false, unavailable: true, settlement: null })
      })
    return () => {
      alive = false
    }
  }, [slug, rounding])

  return status
}
