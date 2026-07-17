import { useCallback, useState } from "react"
import { getGroup } from "../lib/api"
import type { GroupState } from "../lib/types"
import { usePolling } from "./usePolling"

export function useGroup(slug: string): {
  state: GroupState | null
  error: Error | null
  refresh: () => Promise<void>
} {
  const [state, setState] = useState<GroupState | null>(null)
  const [error, setError] = useState<Error | null>(null)

  const refresh = useCallback(async () => {
    try {
      setState(await getGroup(slug))
      setError(null)
    } catch (e) {
      setError(e as Error)
    }
  }, [slug])

  // Smart polling drives both the initial load (immediate poll on mount) and
  // ongoing sync (visible-only, idle backoff).
  usePolling(
    () => {
      void refresh()
    },
    { baseMs: 3000, maxMs: 30000 },
  )

  return { state, error, refresh }
}
