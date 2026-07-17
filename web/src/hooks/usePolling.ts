import { useEffect, useRef } from "react"

export type PollingOptions = { baseMs?: number; maxMs?: number }

export function usePolling(onPoll: () => void, options: PollingOptions = {}): void {
  const { baseMs = 3000, maxMs = 30000 } = options
  const onPollRef = useRef(onPoll)
  onPollRef.current = onPoll

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    let delay = baseMs

    const isVisible = () => document.visibilityState === "visible"

    const schedule = () => {
      timer = setTimeout(tick, delay)
    }

    const tick = () => {
      if (isVisible()) {
        onPollRef.current()
        delay = Math.min(delay * 2, maxMs)
      }
      // Hidden ticks re-check cheaply at the base cadence; they never poll.
      schedule()
    }

    const onVisibility = () => {
      if (!isVisible()) return
      delay = baseMs
      if (timer) clearTimeout(timer)
      onPollRef.current()
      schedule()
    }

    document.addEventListener("visibilitychange", onVisibility)
    if (isVisible()) onPollRef.current()
    schedule()

    return () => {
      if (timer) clearTimeout(timer)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [baseMs, maxMs])
}
