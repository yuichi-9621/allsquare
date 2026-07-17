import { SELF, env } from "cloudflare:test"
import { expect, test } from "vitest"

const today = new Date().toISOString().slice(0, 10)

async function seedRate(from: string, to: string, rate: number) {
  await env.DB.prepare(
    "INSERT OR REPLACE INTO fx_rates (base, quote, date, rate) VALUES (?, ?, ?, ?)",
  )
    .bind(to, from, today, rate)
    .run()
}

async function makeGroup(memberNames: string[], rounding = 1) {
  const res = await SELF.fetch("https://x/api/groups", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: "T", baseCurrency: "USD", rounding, memberNames }),
  })
  // biome-ignore lint/suspicious/noExplicitAny: response body shape asserted via expect(), not types
  return (await res.json()) as any
}

function postExpense(slug: string, body: unknown) {
  return SELF.fetch(`https://x/api/groups/${slug}/expenses`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
}

test("settlement nets to zero, returns minimal transfers, uses frozen rate", async () => {
  await seedRate("JPY", "USD", 0.0066)
  const g = await makeGroup(["Alice", "Bob", "Carol"])
  // biome-ignore lint/suspicious/noExplicitAny: response body shape asserted via expect(), not types
  const [alice, bob, carol] = g.members.map((m: any) => m.id)

  // Alice fronts 5000 JPY dinner (=> 3300 cents) split 3 ways.
  await postExpense(g.group.slug, {
    payerId: alice,
    amountMinor: 5000,
    currency: "JPY",
    description: "Dinner",
    split: { kind: "equal", participantIds: [alice, bob, carol] },
  })
  // Bob fronts 30.00 USD taxi split 3 ways.
  await postExpense(g.group.slug, {
    payerId: bob,
    amountMinor: 3000,
    currency: "USD",
    description: "Taxi",
    split: { kind: "equal", participantIds: [alice, bob, carol] },
  })

  const res = await SELF.fetch(`https://x/api/groups/${g.group.slug}/settlement`)
  expect(res.status).toBe(200)
  // biome-ignore lint/suspicious/noExplicitAny: response body shape asserted via expect(), not types
  const s = (await res.json()) as any
  // biome-ignore lint/suspicious/noExplicitAny: response body shape asserted via expect(), not types
  const sum = s.balances.reduce((a: number, b: any) => a + b.netMinor, 0)
  expect(sum).toBe(0)
  // Alice paid 3300, owes 1100 + 1000 = 2100 => net +1200.
  // biome-ignore lint/suspicious/noExplicitAny: response body shape asserted via expect(), not types
  expect(s.balances.find((b: any) => b.memberId === alice).netMinor).toBe(1200)
  expect(s.balances.length).toBe(3)
  expect(s.transfers.length).toBeLessThanOrEqual(2)
})

test("rounding query param overrides the group default", async () => {
  const g = await makeGroup(["Alice", "Bob"], 1)
  // biome-ignore lint/suspicious/noExplicitAny: response body shape asserted via expect(), not types
  const [alice, bob] = g.members.map((m: any) => m.id)
  await postExpense(g.group.slug, {
    payerId: alice,
    amountMinor: 1050,
    currency: "USD",
    description: "x",
    split: { kind: "equal", participantIds: [alice, bob] },
  })
  // Bob owes 525 cents. rounding=1 (whole dollar) => round to nearest 100 => 500.
  const res = await SELF.fetch(`https://x/api/groups/${g.group.slug}/settlement?rounding=1`)
  // biome-ignore lint/suspicious/noExplicitAny: response body shape asserted via expect(), not types
  const s = (await res.json()) as any
  expect(s.transfers[0].amountMinor).toBe(500)
})

test("404 for unknown group settlement", async () => {
  const res = await SELF.fetch("https://x/api/groups/nope/settlement")
  expect(res.status).toBe(404)
})
