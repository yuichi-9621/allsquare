import { renderHook, waitFor } from "@testing-library/react"
import { http, HttpResponse } from "msw"
import { expect, test } from "vitest"
import { server } from "../test/server"
import { useTripStatus } from "./useTripStatus"

test("reports the settlement once the group loads", async () => {
  server.use(
    http.get("http://localhost/api/groups/abc/settlement", () =>
      HttpResponse.json({ balances: [], transfers: [] }),
    ),
  )
  const { result } = renderHook(() => useTripStatus("abc", 1))
  await waitFor(() => expect(result.current.loading).toBe(false))
  expect(result.current.unavailable).toBe(false)
  expect(result.current.settlement).toEqual({ balances: [], transfers: [] })
})

test("marks the trip unavailable when the group no longer loads", async () => {
  server.use(
    http.get(
      "http://localhost/api/groups/gone/settlement",
      () => new HttpResponse(null, { status: 404 }),
    ),
  )
  const { result } = renderHook(() => useTripStatus("gone", 1))
  await waitFor(() => expect(result.current.loading).toBe(false))
  expect(result.current.unavailable).toBe(true)
  expect(result.current.settlement).toBeNull()
})
