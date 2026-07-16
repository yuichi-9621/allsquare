import { SELF } from "cloudflare:test"
import { expect, test } from "vitest"

test("GET /health returns ok", async () => {
  const res = await SELF.fetch("https://example.com/health")
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual({ ok: true })
})

test("D1 binding exists with the migrated schema", async () => {
  const { env } = await import("cloudflare:test")
  const row = await env.DB.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='groups'",
  ).first<{ name: string }>()
  expect(row?.name).toBe("groups")
})
