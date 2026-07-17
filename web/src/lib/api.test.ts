import { http, HttpResponse } from "msw"
import { expect, test } from "vitest"
import { server } from "../test/server"
import {
  ApiError,
  addExpense,
  createGroup,
  deleteExpense,
  getFx,
  getGroup,
  getSettlement,
} from "./api"
import type { Expense, GroupState, Settlement } from "./types"

const groupState: GroupState = {
  group: {
    slug: "abc123",
    title: "Kyoto",
    baseCurrency: "USD",
    rounding: 1,
    createdAt: "2026-07-16T00:00:00Z",
  },
  members: [
    { id: "m1", name: "Alice", sortOrder: 0 },
    { id: "m2", name: "Bob", sortOrder: 1 },
  ],
  expenses: [],
}

test("createGroup POSTs the body and returns GroupState", async () => {
  let seen: unknown
  server.use(
    http.post("http://localhost/api/groups", async ({ request }) => {
      seen = await request.json()
      return HttpResponse.json(groupState, { status: 201 })
    }),
  )
  const result = await createGroup({
    title: "Kyoto",
    baseCurrency: "USD",
    rounding: 1,
    memberNames: ["Alice", "Bob"],
  })
  expect(result.group.slug).toBe("abc123")
  expect(seen).toEqual({
    title: "Kyoto",
    baseCurrency: "USD",
    rounding: 1,
    memberNames: ["Alice", "Bob"],
  })
})

test("getGroup GETs the polling endpoint", async () => {
  server.use(http.get("http://localhost/api/groups/abc123", () => HttpResponse.json(groupState)))
  const result = await getGroup("abc123")
  expect(result.members).toHaveLength(2)
})

test("addExpense returns the created Expense", async () => {
  const expense: Expense = {
    id: "e1",
    payerId: "m1",
    amountMinor: 5000,
    currency: "JPY",
    fxRateToBase: 0.0066,
    fxRateDate: "2026-07-16",
    description: "Ramen",
    split: { kind: "equal", participantIds: ["m1", "m2"] },
    createdAt: "2026-07-16T00:00:00Z",
  }
  server.use(
    http.post("http://localhost/api/groups/abc123/expenses", () =>
      HttpResponse.json(expense, { status: 201 }),
    ),
  )
  const result = await addExpense("abc123", {
    payerId: "m1",
    amountMinor: 5000,
    currency: "JPY",
    description: "Ramen",
    split: { kind: "equal", participantIds: ["m1", "m2"] },
  })
  expect(result.fxRateToBase).toBe(0.0066)
})

test("getSettlement passes the rounding query param", async () => {
  const settlement: Settlement = {
    balances: [
      { memberId: "m1", netMinor: 100 },
      { memberId: "m2", netMinor: -100 },
    ],
    transfers: [{ from: "m2", to: "m1", amountMinor: 100 }],
  }
  let seenRounding: string | null = null
  server.use(
    http.get("http://localhost/api/groups/abc123/settlement", ({ request }) => {
      seenRounding = new URL(request.url).searchParams.get("rounding")
      return HttpResponse.json(settlement)
    }),
  )
  const result = await getSettlement("abc123", 100)
  expect(seenRounding).toBe("100")
  expect(result.transfers[0]?.amountMinor).toBe(100)
})

test("getFx passes from/to/date and returns a frozen rate", async () => {
  let url = ""
  server.use(
    http.get("http://localhost/api/fx", ({ request }) => {
      url = request.url
      return HttpResponse.json({ rate: 0.0066, rateDate: "2026-07-15" })
    }),
  )
  const result = await getFx("JPY", "USD", "2026-07-16")
  const params = new URL(url).searchParams
  expect(params.get("from")).toBe("JPY")
  expect(params.get("to")).toBe("USD")
  expect(params.get("date")).toBe("2026-07-16")
  expect(result.rateDate).toBe("2026-07-15")
})

test("deleteExpense tolerates a 204 no-body response", async () => {
  server.use(
    http.delete(
      "http://localhost/api/groups/abc123/expenses/e1",
      () => new HttpResponse(null, { status: 204 }),
    ),
  )
  await expect(deleteExpense("abc123", "e1")).resolves.toBeUndefined()
})

test("error responses throw ApiError with code + status", async () => {
  server.use(
    http.get("http://localhost/api/groups/nope", () =>
      HttpResponse.json(
        { error: { code: "not_found", message: "no such group" } },
        { status: 404 },
      ),
    ),
  )
  await expect(getGroup("nope")).rejects.toMatchObject({
    name: "ApiError",
    status: 404,
    code: "not_found",
  })
  await expect(getGroup("nope")).rejects.toBeInstanceOf(ApiError)
})
