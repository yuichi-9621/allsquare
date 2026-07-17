import type { Context } from "hono"

export const badRequest = (c: Context, message: string) =>
  c.json({ error: { code: "bad_request", message } }, 400)

export const notFound = (c: Context, message: string) =>
  c.json({ error: { code: "not_found", message } }, 404)

export const conflict = (c: Context, message: string) =>
  c.json({ error: { code: "conflict", message } }, 409)
