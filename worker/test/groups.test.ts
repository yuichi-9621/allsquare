import { SELF } from "cloudflare:test"
import { expect, test } from "vitest"

function post(path: string, body: unknown) {
  return SELF.fetch(`https://x${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
}

test("POST /api/groups creates a group and returns 201 GroupState", async () => {
  const res = await post("/api/groups", {
    title: "Trip",
    baseCurrency: "USD",
    rounding: 100,
    memberNames: ["Alice", "Bob"],
  })
  expect(res.status).toBe(201)
  // biome-ignore lint/suspicious/noExplicitAny: response body shape asserted via expect(), not types
  const state = (await res.json()) as any
  expect(state.group.slug).toBeTruthy()
  expect(state.group.baseCurrency).toBe("USD")
  expect(state.group.rounding).toBe(100)
  // biome-ignore lint/suspicious/noExplicitAny: response body shape asserted via expect(), not types
  expect(state.members.map((m: any) => m.name)).toEqual(["Alice", "Bob"])
  expect(state.expenses).toEqual([])
})

test("POST /api/groups rejects invalid body with 400 + error shape", async () => {
  const res = await post("/api/groups", {
    title: "",
    baseCurrency: "US",
    rounding: 3,
    memberNames: [],
  })
  expect(res.status).toBe(400)
  // biome-ignore lint/suspicious/noExplicitAny: response body shape asserted via expect(), not types
  const body = (await res.json()) as any
  expect(body.error.code).toBe("bad_request")
  expect(typeof body.error.message).toBe("string")
})

test("GET /api/groups/:slug returns state; 404 for unknown", async () => {
  const created = (await (
    await post("/api/groups", {
      title: "Trip2",
      baseCurrency: "EUR",
      rounding: 1,
      memberNames: ["X"],
    })
  )
    // biome-ignore lint/suspicious/noExplicitAny: response body shape asserted via expect(), not types
    .json()) as any
  const res = await SELF.fetch(`https://x/api/groups/${created.group.slug}`)
  expect(res.status).toBe(200)
  // biome-ignore lint/suspicious/noExplicitAny: response body shape asserted via expect(), not types
  const state = (await res.json()) as any
  expect(state.group.title).toBe("Trip2")

  const missing = await SELF.fetch("https://x/api/groups/nope")
  expect(missing.status).toBe(404)
  // biome-ignore lint/suspicious/noExplicitAny: response body shape asserted via expect(), not types
  expect(((await missing.json()) as any).error.code).toBe("not_found")
})
