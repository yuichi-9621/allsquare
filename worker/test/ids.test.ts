import { expect, test } from "vitest"
import { newId, newSlug } from "../src/ids.js"

test("newSlug is url-safe and unguessably long", () => {
  const s = newSlug()
  expect(s).toMatch(/^[A-Za-z0-9_-]+$/)
  expect(s.length).toBeGreaterThanOrEqual(20)
})

test("newSlug and newId are unique across many draws", () => {
  const slugs = new Set(Array.from({ length: 1000 }, () => newSlug()))
  expect(slugs.size).toBe(1000)
  const ids = new Set(Array.from({ length: 1000 }, () => newId()))
  expect(ids.size).toBe(1000)
})

test("newId is a UUID", () => {
  expect(newId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
})
