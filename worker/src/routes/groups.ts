import { Hono } from "hono"
import { createGroup, getGroupState, renameGroup } from "../db.js"
import { badRequest, notFound } from "../errors.js"
import { createGroupSchema, groupPatchSchema } from "../schemas.js"
import type { Env } from "../types.js"

const groups = new Hono<{ Bindings: Env }>()

groups.post("/", async (c) => {
  const parsed = createGroupSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) return badRequest(c, parsed.error.message)
  const state = await createGroup(c.env.DB, parsed.data)
  return c.json(state, 201)
})

groups.get("/:slug", async (c) => {
  const state = await getGroupState(c.env.DB, c.req.param("slug"))
  if (!state) return notFound(c, "group not found")
  return c.json(state, 200)
})

groups.patch("/:slug", async (c) => {
  const parsed = groupPatchSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) return badRequest(c, parsed.error.message)
  const state = await renameGroup(c.env.DB, c.req.param("slug"), parsed.data.title)
  if (!state) return notFound(c, "group not found")
  return c.json(state, 200)
})

export default groups
