import { Hono } from "hono"
import type { z } from "zod"
import {
  type WriteExpenseInput,
  getExpenseRow,
  getGroupRow,
  insertExpense,
  memberIds,
  softDeleteExpense,
  updateExpense,
} from "../db.js"
import { badRequest, notFound } from "../errors.js"
import { resolveRate } from "../fx.js"
import { expenseBodySchema } from "../schemas.js"
import type { Env } from "../types.js"

const expenses = new Hono<{ Bindings: Env }>()

const today = () => new Date().toISOString().slice(0, 10)
type ExpenseBody = z.infer<typeof expenseBodySchema>
type Frozen = { fxRateToBase: number; fxRateDate: string }

type Prepared =
  | {
      ok: true
      splitType: "equal" | "exact"
      shareRows: { memberId: string; amountMinor: number }[]
    }
  | { ok: false; message: string }

// Validate members + (for exact splits) that shares sum to the expense total.
async function prepareShares(
  db: D1Database,
  groupId: string,
  body: ExpenseBody,
): Promise<Prepared> {
  const ids = await memberIds(db, groupId)
  if (!ids.has(body.payerId))
    return { ok: false, message: `payerId ${body.payerId} is not a member` }

  if (body.split.kind === "equal") {
    for (const id of body.split.participantIds) {
      if (!ids.has(id)) return { ok: false, message: `participant ${id} is not a member` }
    }
    if (new Set(body.split.participantIds).size !== body.split.participantIds.length) {
      return { ok: false, message: "duplicate participant id in split" }
    }
    return {
      ok: true,
      splitType: "equal",
      shareRows: body.split.participantIds.map((memberId) => ({ memberId, amountMinor: 0 })),
    }
  }

  // Exact shares are in the expense's own currency and must sum to the expense
  // total (amountMinor). Their base values are derived (with rounding
  // reconciliation) by @allsquare/core at settlement — never here.
  let sum = 0
  for (const s of body.split.shares) {
    if (!ids.has(s.memberId))
      return { ok: false, message: `share member ${s.memberId} is not a member` }
    sum += s.amountMinor
  }
  if (new Set(body.split.shares.map((s) => s.memberId)).size !== body.split.shares.length) {
    return { ok: false, message: "duplicate member id in exact split" }
  }
  if (sum !== body.amountMinor) {
    return {
      ok: false,
      message: `exact shares sum to ${sum}, expected the expense total ${body.amountMinor}`,
    }
  }
  return {
    ok: true,
    splitType: "exact",
    shareRows: body.split.shares.map((s) => ({ memberId: s.memberId, amountMinor: s.amountMinor })),
  }
}

expenses.post("/:slug/expenses", async (c) => {
  const group = await getGroupRow(c.env.DB, c.req.param("slug"))
  if (!group) return notFound(c, "group not found")
  const parsed = expenseBodySchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) return badRequest(c, parsed.error.message)
  const body = parsed.data

  const r = await resolveRate(c.env.DB, body.currency, group.base_currency, today())
  const frozen: Frozen = { fxRateToBase: r.rate, fxRateDate: r.rateDate }

  const prepared = await prepareShares(c.env.DB, group.id, body)
  if (!prepared.ok) return badRequest(c, prepared.message)

  const input: WriteExpenseInput = {
    groupId: group.id,
    payerId: body.payerId,
    amountMinor: body.amountMinor,
    currency: body.currency,
    fxRateToBase: frozen.fxRateToBase,
    fxRateDate: frozen.fxRateDate,
    description: body.description,
    splitType: prepared.splitType,
    shareRows: prepared.shareRows,
  }
  return c.json(await insertExpense(c.env.DB, input), 201)
})

expenses.patch("/:slug/expenses/:id", async (c) => {
  const group = await getGroupRow(c.env.DB, c.req.param("slug"))
  if (!group) return notFound(c, "group not found")
  const existing = await getExpenseRow(c.env.DB, group.id, c.req.param("id"))
  if (!existing) return notFound(c, "expense not found")
  const parsed = expenseBodySchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) return badRequest(c, parsed.error.message)
  const body = parsed.data

  // Re-freeze the FX rate only if the currency changed; otherwise keep the original.
  let frozen: Frozen
  if (body.currency === existing.currency) {
    frozen = { fxRateToBase: existing.fx_rate_to_base, fxRateDate: existing.fx_rate_date }
  } else {
    const r = await resolveRate(c.env.DB, body.currency, group.base_currency, today())
    frozen = { fxRateToBase: r.rate, fxRateDate: r.rateDate }
  }

  const prepared = await prepareShares(c.env.DB, group.id, body)
  if (!prepared.ok) return badRequest(c, prepared.message)

  const input: WriteExpenseInput = {
    groupId: group.id,
    payerId: body.payerId,
    amountMinor: body.amountMinor,
    currency: body.currency,
    fxRateToBase: frozen.fxRateToBase,
    fxRateDate: frozen.fxRateDate,
    description: body.description,
    splitType: prepared.splitType,
    shareRows: prepared.shareRows,
  }
  return c.json(await updateExpense(c.env.DB, existing.id, input), 200)
})

expenses.delete("/:slug/expenses/:id", async (c) => {
  const group = await getGroupRow(c.env.DB, c.req.param("slug"))
  if (!group) return notFound(c, "group not found")
  const deleted = await softDeleteExpense(c.env.DB, group.id, c.req.param("id"))
  if (!deleted) return notFound(c, "expense not found")
  return c.body(null, 204)
})

export default expenses
