import { SELF } from "cloudflare:test"
import { expect, test } from "vitest"

async function makeGroup() {
  const res = await SELF.fetch("https://x/api/groups", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: "T", baseCurrency: "USD", rounding: 1, memberNames: ["Alice"] }),
  })
  // biome-ignore lint/suspicious/noExplicitAny: response body shape asserted via expect(), not types
  return (await res.json()) as any
}

test("POST /api/groups/:slug/members adds a member with next sortOrder", async () => {
  const g = await makeGroup()
  const res = await SELF.fetch(`https://x/api/groups/${g.group.slug}/members`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Bob" }),
  })
  expect(res.status).toBe(201)
  // biome-ignore lint/suspicious/noExplicitAny: response body shape asserted via expect(), not types
  const member = (await res.json()) as any
  expect(member.name).toBe("Bob")
  expect(member.sortOrder).toBe(1)
  expect(typeof member.id).toBe("string")

  // biome-ignore lint/suspicious/noExplicitAny: response body shape asserted via expect(), not types
  const state = (await (await SELF.fetch(`https://x/api/groups/${g.group.slug}`)).json()) as any
  // biome-ignore lint/suspicious/noExplicitAny: response body shape asserted via expect(), not types
  expect(state.members.map((m: any) => m.name)).toEqual(["Alice", "Bob"])
})

test("adding a member to an unknown group is 404", async () => {
  const res = await SELF.fetch("https://x/api/groups/nope/members", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Bob" }),
  })
  expect(res.status).toBe(404)
})

test("invalid member body is 400", async () => {
  const g = await makeGroup()
  const res = await SELF.fetch(`https://x/api/groups/${g.group.slug}/members`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "" }),
  })
  expect(res.status).toBe(400)
})
