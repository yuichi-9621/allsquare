import { renderHook } from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { usePolling } from "./usePolling"

let visibility: "visible" | "hidden" = "visible"

function setVisibility(next: "visible" | "hidden") {
  visibility = next
  document.dispatchEvent(new Event("visibilitychange"))
}

beforeEach(() => {
  visibility = "visible"
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => visibility,
  })
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

test("polls immediately on mount when visible", () => {
  const onPoll = vi.fn()
  renderHook(() => usePolling(onPoll, { baseMs: 1000, maxMs: 8000 }))
  expect(onPoll).toHaveBeenCalledTimes(1)
})

test("does not poll while the tab is hidden", () => {
  visibility = "hidden"
  const onPoll = vi.fn()
  renderHook(() => usePolling(onPoll, { baseMs: 1000, maxMs: 8000 }))
  vi.advanceTimersByTime(5000)
  expect(onPoll).not.toHaveBeenCalled()
})

test("backs off: interval doubles up to the cap on successive visible ticks", () => {
  const onPoll = vi.fn()
  renderHook(() => usePolling(onPoll, { baseMs: 1000, maxMs: 8000 }))
  // mount poll = 1
  vi.advanceTimersByTime(1000) // 2 (next delay -> 2000)
  vi.advanceTimersByTime(2000) // 3 (next -> 4000)
  vi.advanceTimersByTime(4000) // 4 (next -> 8000, capped)
  vi.advanceTimersByTime(8000) // 5 (stays 8000)
  expect(onPoll).toHaveBeenCalledTimes(5)
  // still capped: advancing another base interval must NOT poll early
  vi.advanceTimersByTime(1000)
  expect(onPoll).toHaveBeenCalledTimes(5)
})

test("resets to base interval and polls immediately when the tab becomes visible", () => {
  visibility = "hidden"
  const onPoll = vi.fn()
  renderHook(() => usePolling(onPoll, { baseMs: 1000, maxMs: 8000 }))
  expect(onPoll).toHaveBeenCalledTimes(0)
  setVisibility("visible")
  expect(onPoll).toHaveBeenCalledTimes(1) // immediate poll on regaining visibility
  vi.advanceTimersByTime(1000)
  expect(onPoll).toHaveBeenCalledTimes(2) // back at the base interval
})

test("stops polling after unmount", () => {
  const onPoll = vi.fn()
  const { unmount } = renderHook(() => usePolling(onPoll, { baseMs: 1000, maxMs: 8000 }))
  unmount()
  onPoll.mockClear()
  vi.advanceTimersByTime(10000)
  expect(onPoll).not.toHaveBeenCalled()
})
