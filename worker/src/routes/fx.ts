import { Hono } from "hono"
import { badRequest } from "../errors.js"
import { resolveRate } from "../fx.js"
import { fxQuerySchema } from "../schemas.js"
import type { Env } from "../types.js"

const fxRoute = new Hono<{ Bindings: Env }>()

fxRoute.get("/", async (c) => {
  const parsed = fxQuerySchema.safeParse({
    from: c.req.query("from"),
    to: c.req.query("to"),
    date: c.req.query("date"),
  })
  if (!parsed.success) return badRequest(c, parsed.error.message)
  const { from, to, date } = parsed.data
  const { rate, rateDate } = await resolveRate(c.env.DB, from, to, date)
  return c.json({ rate, rateDate }, 200)
})

export default fxRoute
