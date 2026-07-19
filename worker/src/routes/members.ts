import { Hono } from "hono"
import { addMember, getGroupRow, setMemberPaymentHandle } from "../db.js"
import { badRequest, notFound } from "../errors.js"
import { addMemberSchema, memberPatchSchema } from "../schemas.js"
import type { Env } from "../types.js"

const members = new Hono<{ Bindings: Env }>()

members.post("/:slug/members", async (c) => {
  const group = await getGroupRow(c.env.DB, c.req.param("slug"))
  if (!group) return notFound(c, "group not found")
  const parsed = addMemberSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) return badRequest(c, parsed.error.message)
  const member = await addMember(c.env.DB, group.id, parsed.data.name)
  return c.json(member, 201)
})

members.patch("/:slug/members/:memberId", async (c) => {
  const group = await getGroupRow(c.env.DB, c.req.param("slug"))
  if (!group) return notFound(c, "group not found")
  const parsed = memberPatchSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) return badRequest(c, parsed.error.message)
  const handle = parsed.data.paymentHandle
  const member = await setMemberPaymentHandle(
    c.env.DB,
    group.id,
    c.req.param("memberId"),
    handle === "" ? null : handle,
  )
  if (!member) return notFound(c, "member not found")
  return c.json(member)
})

export default members
