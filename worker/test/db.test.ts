import { env } from "cloudflare:test"
import { expect, test } from "vitest"
import { addMember, createGroup, getGroupRow, getGroupState, memberIds } from "../src/db.js"

test("createGroup persists group + members and returns state", async () => {
  const state = await createGroup(env.DB, {
    title: "Tokyo Trip",
    baseCurrency: "USD",
    rounding: 100,
    memberNames: ["Alice", "Bob"],
  })
  expect(state.group.slug).toMatch(/^[A-Za-z0-9_-]{20,}$/)
  expect(state.group.baseCurrency).toBe("USD")
  expect(state.group.rounding).toBe(100)
  expect(state.members.map((m) => m.name)).toEqual(["Alice", "Bob"])
  // biome-ignore lint/style/noNonNullAssertion: test data guaranteed to be non-empty
  expect(state.members[0]!.sortOrder).toBe(0)
  // biome-ignore lint/style/noNonNullAssertion: test data guaranteed to be non-empty
  expect(state.members[1]!.sortOrder).toBe(1)
  expect(state.expenses).toEqual([])

  const reread = await getGroupState(env.DB, state.group.slug)
  expect(reread?.group.title).toBe("Tokyo Trip")
  expect(reread?.members.length).toBe(2)
})

test("getGroupState returns null for unknown slug", async () => {
  expect(await getGroupState(env.DB, "does-not-exist")).toBeNull()
})

test("addMember appends with the next sort_order and is queryable", async () => {
  const state = await createGroup(env.DB, {
    title: "T",
    baseCurrency: "EUR",
    rounding: 1,
    memberNames: ["Al"],
  })
  const group = await getGroupRow(env.DB, state.group.slug)
  // biome-ignore lint/style/noNonNullAssertion: group was just created, guaranteed to exist
  const m = await addMember(env.DB, group!.id, "Zoe")
  expect(m.sortOrder).toBe(1)
  // biome-ignore lint/style/noNonNullAssertion: group was just created, guaranteed to exist
  const ids = await memberIds(env.DB, group!.id)
  expect(ids.has(m.id)).toBe(true)
  expect(ids.size).toBe(2)

  // Re-read from D1 to confirm the atomic insert persisted sort_order = 1.
  const reread = await getGroupState(env.DB, state.group.slug)
  // biome-ignore lint/style/noNonNullAssertion: group was just created, guaranteed to exist
  const zoe = reread!.members.find((mm) => mm.id === m.id)
  // biome-ignore lint/style/noNonNullAssertion: zoe was just persisted above, guaranteed to exist
  expect(zoe!.sortOrder).toBe(1)
})
