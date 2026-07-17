import { useEffect, useState } from "react"
import { getSettlement } from "../lib/api"
import type { Rounding, Settlement } from "../lib/types"

export function useSettlement(slug: string, rounding: Rounding, revision = 0): Settlement | null {
  const [settlement, setSettlement] = useState<Settlement | null>(null)

  // biome-ignore lint/correctness/useExhaustiveDependencies: revision (e.g. expense count) is a manual bump key that triggers a refetch when the ledger changes; it isn't read inside the effect body
  useEffect(() => {
    let alive = true
    getSettlement(slug, rounding)
      .then((s) => {
        if (alive) setSettlement(s)
      })
      .catch(() => {
        if (alive) setSettlement(null)
      })
    return () => {
      alive = false
    }
  }, [slug, rounding, revision])

  return settlement
}
