import { renderHook, waitFor } from "@testing-library/react"
import { http, HttpResponse } from "msw"
import { expect, test } from "vitest"
import type { GroupState } from "../lib/types"
import { server } from "../test/server"
import { useGroup } from "./useGroup"

const state: GroupState = {
  group: {
    slug: "abc123",
    title: "Kyoto",
    baseCurrency: "USD",
    rounding: 1,
    createdAt: "2026-07-16T00:00:00Z",
  },
  members: [{ id: "m1", name: "Alice", sortOrder: 0 }],
  expenses: [],
}

test("loads the group state on mount", async () => {
  server.use(http.get("http://localhost/api/groups/abc123", () => HttpResponse.json(state)))
  const { result } = renderHook(() => useGroup("abc123"))
  await waitFor(() => expect(result.current.state?.group.title).toBe("Kyoto"))
})

test("exposes an error when the group is missing", async () => {
  server.use(
    http.get("http://localhost/api/groups/nope", () =>
      HttpResponse.json({ error: { code: "not_found", message: "no" } }, { status: 404 }),
    ),
  )
  const { result } = renderHook(() => useGroup("nope"))
  await waitFor(() => expect(result.current.error).not.toBeNull())
})
