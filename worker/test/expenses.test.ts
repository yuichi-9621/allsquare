import { SELF, env } from "cloudflare:test"
import { expect, test } from "vitest"

const today = new Date().toISOString().slice(0, 10)

async function makeGroup() {
  const res = await SELF.fetch("https://x/api/groups", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      title: "Trip",
      baseCurrency: "USD",
      rounding: 1,
      memberNames: ["Alice", "Bob", "Carol"],
    }),
  })
  // biome-ignore lint/suspicious/noExplicitAny: response body shape asserted via expect(), not types
  return (await res.json()) as any
}

// Seed the FX cache so resolveRate never touches the network in route tests.
async function seedRate(from: string, to: string, rate: number) {
  await env.DB.prepare(
    "INSERT OR REPLACE INTO fx_rates (base, quote, date, rate) VALUES (?, ?, ?, ?)",
  )
    .bind(to, from, today, rate)
    .run()
}

function postExpense(slug: string, body: unknown) {
  return SELF.fetch(`https://x/api/groups/${slug}/expenses`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
}

test("POST expense freezes the FX rate and stores the expense", async () => {
  const g = await makeGroup()
  await seedRate("JPY", "USD", 0.0066)
  // biome-ignore lint/suspicious/noExplicitAny: response body shape asserted via expect(), not types
  const [alice, bob, carol] = g.members.map((m: any) => m.id)

  const res = await postExpense(g.group.slug, {
    payerId: alice,
    amountMinor: 5000,
    currency: "JPY",
    description: "Dinner",
    split: { kind: "equal", participantIds: [alice, bob, carol] },
  })
  expect(res.status).toBe(201)
  // biome-ignore lint/suspicious/noExplicitAny: response body shape asserted via expect(), not types
  const e = (await res.json()) as any
  expect(e.fxRateToBase).toBe(0.0066)
  expect(e.fxRateDate).toBe(today)
  expect(e.amountMinor).toBe(5000)
  expect(e.currency).toBe("JPY")
  expect(e.split).toEqual({ kind: "equal", participantIds: [alice, bob, carol] })
})

test("exact shares must sum to the expense total in its own currency", async () => {
  const g = await makeGroup()
  await seedRate("JPY", "USD", 0.0066)
  // biome-ignore lint/suspicious/noExplicitAny: response body shape asserted via expect(), not types
  const [alice, bob] = g.members.map((m: any) => m.id)
  // A ¥5000 dinner: exact shares are entered in JPY and must sum to 5000.
  const bad = await postExpense(g.group.slug, {
    payerId: alice,
    amountMinor: 5000,
    currency: "JPY",
    description: "Dinner",
    split: {
      kind: "exact",
      shares: [
        { memberId: alice, amountMinor: 1000 },
        { memberId: bob, amountMinor: 1000 }, // 2000 != 5000
      ],
    },
  })
  expect(bad.status).toBe(400)

  const good = await postExpense(g.group.slug, {
    payerId: alice,
    amountMinor: 5000,
    currency: "JPY",
    description: "Dinner",
    split: {
      kind: "exact",
      shares: [
        { memberId: alice, amountMinor: 3000 },
        { memberId: bob, amountMinor: 2000 }, // 5000 == 5000
      ],
    },
  })
  expect(good.status).toBe(201)
})

test("foreign-currency exact split converts each share at settlement", async () => {
  const g = await makeGroup()
  await seedRate("EUR", "USD", 1.115)
  // biome-ignore lint/suspicious/noExplicitAny: response body shape asserted via expect(), not types
  const [alice, bob] = g.members.map((m: any) => m.id)
  // €15.00 exact: Alice €10.00 (1000), Bob €5.00 (500). At 1.115: Alice $11.15
  // (1115), Bob $5.575 -> reconciled $5.58 (558); base total $16.73 (1673).
  const res = await postExpense(g.group.slug, {
    payerId: alice,
    amountMinor: 1500,
    currency: "EUR",
    description: "Tapas",
    split: {
      kind: "exact",
      shares: [
        { memberId: alice, amountMinor: 1000 },
        { memberId: bob, amountMinor: 500 },
      ],
    },
  })
  expect(res.status).toBe(201)

  const s = await SELF.fetch(`https://x/api/groups/${g.group.slug}/settlement?rounding=1`)
  // biome-ignore lint/suspicious/noExplicitAny: response body shape asserted via expect(), not types
  const body = (await s.json()) as any
  // biome-ignore lint/suspicious/noExplicitAny: response body shape asserted via expect(), not types
  const net = new Map(body.balances.map((b: any) => [b.memberId, b.netMinor]))
  expect(net.get(alice)).toBe(558) // paid 1673, owes her 1115
  expect(net.get(bob)).toBe(-558)
})

test("unknown payer id is rejected 400", async () => {
  const g = await makeGroup()
  await seedRate("JPY", "USD", 0.0066)
  const res = await postExpense(g.group.slug, {
    payerId: "ghost",
    amountMinor: 5000,
    currency: "JPY",
    description: "x",
    // biome-ignore lint/suspicious/noExplicitAny: response body shape asserted via expect(), not types
    split: { kind: "equal", participantIds: g.members.map((m: any) => m.id) },
  })
  expect(res.status).toBe(400)
})

test("PATCH keeps original frozen rate when currency unchanged; DELETE soft-deletes", async () => {
  const g = await makeGroup()
  await seedRate("JPY", "USD", 0.0066)
  // biome-ignore lint/suspicious/noExplicitAny: response body shape asserted via expect(), not types
  const [alice, bob, carol] = g.members.map((m: any) => m.id)
  const created = (await (
    await postExpense(g.group.slug, {
      payerId: alice,
      amountMinor: 5000,
      currency: "JPY",
      description: "Dinner",
      split: { kind: "equal", participantIds: [alice, bob, carol] },
    })
  )
    // biome-ignore lint/suspicious/noExplicitAny: response body shape asserted via expect(), not types
    .json()) as any

  // Mutate the cached rate after create. A correct PATCH with unchanged currency
  // reuses the FROZEN 0.0066; a buggy re-resolve would pick up this 0.0099 sentinel.
  await seedRate("JPY", "USD", 0.0099)

  // No cache reseed: PATCH must reuse the stored 0.0066 because currency is unchanged.
  const patched = (await (
    await SELF.fetch(`https://x/api/groups/${g.group.slug}/expenses/${created.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        payerId: alice,
        amountMinor: 8000,
        currency: "JPY",
        description: "Dinner + drinks",
        split: { kind: "equal", participantIds: [alice, bob, carol] },
      }),
    })
  )
    // biome-ignore lint/suspicious/noExplicitAny: response body shape asserted via expect(), not types
    .json()) as any
  expect(patched.fxRateToBase).toBe(0.0066)
  expect(patched.amountMinor).toBe(8000)
  expect(patched.description).toBe("Dinner + drinks")

  const del = await SELF.fetch(`https://x/api/groups/${g.group.slug}/expenses/${created.id}`, {
    method: "DELETE",
  })
  expect(del.status).toBe(204)

  // biome-ignore lint/suspicious/noExplicitAny: response body shape asserted via expect(), not types
  const state = (await (await SELF.fetch(`https://x/api/groups/${g.group.slug}`)).json()) as any
  expect(state.expenses.length).toBe(0)

  const missing = await SELF.fetch(`https://x/api/groups/${g.group.slug}/expenses/${created.id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      payerId: alice,
      amountMinor: 100,
      currency: "USD",
      description: "x",
      split: { kind: "equal", participantIds: [alice] },
    }),
  })
  expect(missing.status).toBe(404)
})

test("PATCH re-freezes the FX rate when the currency changes", async () => {
  const g = await makeGroup()
  await seedRate("JPY", "USD", 0.0066)
  // biome-ignore lint/suspicious/noExplicitAny: response body shape asserted via expect(), not types
  const [alice, bob, carol] = g.members.map((m: any) => m.id)
  const created = (await (
    await postExpense(g.group.slug, {
      payerId: alice,
      amountMinor: 5000,
      currency: "JPY",
      description: "Dinner",
      split: { kind: "equal", participantIds: [alice, bob, carol] },
    })
  )
    // biome-ignore lint/suspicious/noExplicitAny: response body shape asserted via expect(), not types
    .json()) as any
  expect(created.fxRateToBase).toBe(0.0066)

  // Change the currency to EUR (distinct seeded rate). The route MUST re-resolve,
  // not keep the old 0.0066.
  await seedRate("EUR", "USD", 1.1)
  const patched = (await (
    await SELF.fetch(`https://x/api/groups/${g.group.slug}/expenses/${created.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        payerId: alice,
        amountMinor: 1000,
        currency: "EUR",
        description: "Dinner in EUR",
        split: { kind: "equal", participantIds: [alice, bob, carol] },
      }),
    })
  )
    // biome-ignore lint/suspicious/noExplicitAny: response body shape asserted via expect(), not types
    .json()) as any
  expect(patched.currency).toBe("EUR")
  expect(patched.fxRateToBase).toBe(1.1)
})

test("rejects an amountMinor beyond the safe-integer range with 400", async () => {
  const g = await makeGroup()
  await seedRate("JPY", "USD", 0.0066)
  const alice = g.members[0].id
  const res = await postExpense(g.group.slug, {
    payerId: alice,
    amountMinor: Number.MAX_SAFE_INTEGER + 1, // 2**53 — an integer, but NOT a safe integer
    currency: "JPY",
    description: "overflow",
    split: { kind: "equal", participantIds: [alice] },
  })
  expect(res.status).toBe(400)
})

test("duplicate participant in an equal split is rejected 400", async () => {
  const g = await makeGroup()
  await seedRate("JPY", "USD", 0.0066)
  // biome-ignore lint/suspicious/noExplicitAny: response body shape asserted via expect(), not types
  const [alice, bob] = g.members.map((m: any) => m.id)
  const res = await postExpense(g.group.slug, {
    payerId: alice,
    amountMinor: 5000,
    currency: "JPY",
    description: "x",
    split: { kind: "equal", participantIds: [alice, alice, bob] },
  })
  expect(res.status).toBe(400)
})

test("duplicate member in an exact split is rejected 400 even when the sum matches", async () => {
  const g = await makeGroup()
  await seedRate("JPY", "USD", 0.0066)
  // biome-ignore lint/suspicious/noExplicitAny: response body shape asserted via expect(), not types
  const [alice] = g.members.map((m: any) => m.id)
  // 2500 + 2500 = 5000 matches the expense total, so the SUM check would pass —
  // this proves the dedup check fires independently of the sum check.
  const res = await postExpense(g.group.slug, {
    payerId: alice,
    amountMinor: 5000,
    currency: "JPY",
    description: "x",
    split: {
      kind: "exact",
      shares: [
        { memberId: alice, amountMinor: 2500 },
        { memberId: alice, amountMinor: 2500 },
      ],
    },
  })
  expect(res.status).toBe(400)
})

test("category and kind round-trip; repayments are forced to null category", async () => {
  const g = await makeGroup()
  const [a, b] = g.members
  const res = await SELF.fetch(`https://x/api/groups/${g.group.slug}/expenses`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      payerId: a.id,
      amountMinor: 3000,
      currency: "USD",
      description: "Ramen",
      category: "food",
      split: { kind: "equal", participantIds: [a.id, b.id] },
    }),
  })
  expect(res.status).toBe(201)
  // biome-ignore lint/suspicious/noExplicitAny: response body shape asserted via expect(), not types
  const created = (await res.json()) as any
  expect(created.category).toBe("food")
  expect(created.kind).toBe("expense")

  const rep = await SELF.fetch(`https://x/api/groups/${g.group.slug}/expenses`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      payerId: b.id,
      amountMinor: 1500,
      currency: "USD",
      description: "B paid A",
      kind: "repayment",
      category: "food",
      split: { kind: "exact", shares: [{ memberId: a.id, amountMinor: 1500 }] },
    }),
  })
  expect(rep.status).toBe(201)
  // biome-ignore lint/suspicious/noExplicitAny: response body shape asserted via expect(), not types
  const repayment = (await rep.json()) as any
  expect(repayment.kind).toBe("repayment")
  expect(repayment.category).toBeNull()
})

test("an invalid category is 400", async () => {
  const g = await makeGroup()
  const [a] = g.members
  const res = await SELF.fetch(`https://x/api/groups/${g.group.slug}/expenses`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      payerId: a.id,
      amountMinor: 3000,
      currency: "USD",
      description: "X",
      category: "yachts",
      split: { kind: "equal", participantIds: [a.id] },
    }),
  })
  expect(res.status).toBe(400)
})
