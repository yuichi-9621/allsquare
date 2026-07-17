import { SELF, env } from "cloudflare:test"
import { expect, test } from "vitest"

async function seedRate(base: string, quote: string, date: string, rate: number) {
  await env.DB.prepare(
    "INSERT OR REPLACE INTO fx_rates (base, quote, date, rate) VALUES (?, ?, ?, ?)",
  )
    .bind(base, quote, date, rate)
    .run()
}

test("GET /api/fx returns the cached frozen rate + date", async () => {
  // base = to (USD), quote = from (JPY).
  await seedRate("USD", "JPY", "2026-07-16", 0.0066)
  const res = await SELF.fetch("https://x/api/fx?from=JPY&to=USD&date=2026-07-16")
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual({ rate: 0.0066, rateDate: "2026-07-16" })
})

test("same-currency preview returns rate 1 with no cache", async () => {
  const res = await SELF.fetch("https://x/api/fx?from=USD&to=USD&date=2026-07-16")
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual({ rate: 1, rateDate: "2026-07-16" })
})

test("invalid query is 400", async () => {
  const res = await SELF.fetch("https://x/api/fx?from=JP&to=USD&date=bad")
  expect(res.status).toBe(400)
})

test("CORS: preflight is answered and responses are cross-origin", async () => {
  const preflight = await SELF.fetch("https://x/api/fx?from=USD&to=USD&date=2026-07-16", {
    method: "OPTIONS",
    headers: {
      origin: "https://allsquare.pages.dev",
      "access-control-request-method": "GET",
    },
  })
  expect(preflight.headers.get("access-control-allow-origin")).toBe("*")

  const res = await SELF.fetch("https://x/api/fx?from=USD&to=USD&date=2026-07-16")
  expect(res.headers.get("access-control-allow-origin")).toBe("*")
})
