import { env } from "cloudflare:test"
import { beforeEach, expect, test, vi } from "vitest"
import { FxUnavailableError, resolveRate } from "../src/fx.js"

// Models Frankfurter: `date -> { symbol: rate }`. Missing days 404 (as ECB gaps do).
function mockFetch(byDate: Record<string, Record<string, number>>) {
  return vi.fn(async (url: string) => {
    const m = url.match(/\/v1\/(\d{4}-\d{2}-\d{2})\?base=([A-Z]{3})&symbols=([A-Z]{3})/)
    if (!m) return new Response("bad request", { status: 400 })
    // biome-ignore lint/style/noNonNullAssertion: capture groups guaranteed present by the regex match above
    const date = m[1]!
    // biome-ignore lint/style/noNonNullAssertion: capture groups guaranteed present by the regex match above
    const quote = m[3]!
    const day = byDate[date]
    if (!day || day[quote] === undefined) {
      return new Response(JSON.stringify({ message: "not found" }), { status: 404 })
    }
    return new Response(JSON.stringify({ base: m[2], date, rates: { [quote]: day[quote] } }), {
      status: 200,
      headers: { "content-type": "application/json" },
    })
  })
}

beforeEach(async () => {
  await env.DB.exec("DELETE FROM fx_rates")
})

test("same currency short-circuits to rate 1 and never fetches", async () => {
  const fetchImpl = mockFetch({})
  const r = await resolveRate(env.DB, "USD", "USD", "2026-07-16", fetchImpl)
  expect(r).toEqual({ rate: 1, rateDate: "2026-07-16" })
  expect(fetchImpl).not.toHaveBeenCalled()
})

test("fetches, returns rate + date, and caches (second call hits cache)", async () => {
  const fetchImpl = mockFetch({ "2026-07-16": { USD: 0.0066 } })
  const first = await resolveRate(env.DB, "JPY", "USD", "2026-07-16", fetchImpl)
  expect(first).toEqual({ rate: 0.0066, rateDate: "2026-07-16" })
  expect(fetchImpl).toHaveBeenCalledTimes(1)

  const second = await resolveRate(env.DB, "JPY", "USD", "2026-07-16", fetchImpl)
  expect(second).toEqual({ rate: 0.0066, rateDate: "2026-07-16" })
  expect(fetchImpl).toHaveBeenCalledTimes(1) // served from cache, no new fetch
})

test("carry-forward walks back to the last published day", async () => {
  // 2026-07-18 is a Saturday (404); 2026-07-17 Friday has a rate.
  const fetchImpl = mockFetch({ "2026-07-17": { USD: 0.0067 } })
  const r = await resolveRate(env.DB, "JPY", "USD", "2026-07-18", fetchImpl)
  expect(r).toEqual({ rate: 0.0067, rateDate: "2026-07-17" })
  expect(fetchImpl).toHaveBeenCalledTimes(2) // Saturday 404 + Friday 200

  // The walked-back rate is cached under Friday; re-requesting Saturday finds it there.
  const again = await resolveRate(env.DB, "JPY", "USD", "2026-07-18", fetchImpl)
  expect(again).toEqual({ rate: 0.0067, rateDate: "2026-07-17" })
  expect(fetchImpl).toHaveBeenCalledTimes(3) // Saturday 404 again, then Friday cache hit
})

test("throws FxUnavailableError when nothing published within the window", async () => {
  const fetchImpl = mockFetch({}) // every day 404s
  await expect(resolveRate(env.DB, "JPY", "USD", "2026-07-18", fetchImpl)).rejects.toBeInstanceOf(
    FxUnavailableError,
  )
})

test("malformed 200 body carries forward to the previous published day", async () => {
  // 2026-07-18 (Sat) returns a 200 with a non-JSON body; 2026-07-17 (Fri) is valid.
  const fetchImpl = vi.fn(async (url: string) => {
    // biome-ignore lint/style/noNonNullAssertion: URL is constructed by resolveRate, always matches
    const date = url.match(/\/v1\/(\d{4}-\d{2}-\d{2})/)![1]
    if (date === "2026-07-17") {
      return new Response(JSON.stringify({ base: "JPY", date, rates: { USD: 0.0067 } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    }
    return new Response("<html>gateway timeout</html>", { status: 200 })
  })
  const r = await resolveRate(env.DB, "JPY", "USD", "2026-07-18", fetchImpl)
  expect(r).toEqual({ rate: 0.0067, rateDate: "2026-07-17" })
})

test("all-malformed window throws FxUnavailableError, not a parse error", async () => {
  const fetchImpl = vi.fn(async () => new Response("not json", { status: 200 }))
  await expect(resolveRate(env.DB, "JPY", "USD", "2026-07-18", fetchImpl)).rejects.toBeInstanceOf(
    FxUnavailableError,
  )
})
