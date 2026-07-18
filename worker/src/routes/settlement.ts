import { computeBalances, settle } from "@allsquare/core"
import type { ExpenseInput, RoundingStep } from "@allsquare/core"
import { Hono } from "hono"
import { getGroupState } from "../db.js"
import { notFound } from "../errors.js"
import type { Balance, Env, Expense, Settlement } from "../types.js"

const settlement = new Hono<{ Bindings: Env }>()

const VALID_ROUNDING = new Set<number>([1, 10, 100, 1000])

// Map a stored wire Expense -> core.ExpenseInput. The wire `participantIds`
// becomes core's `memberIds`; the frozen fxRateToBase is passed through verbatim.
function toInput(e: Expense): ExpenseInput {
  return {
    payerId: e.payerId,
    amountMinor: e.amountMinor,
    currency: e.currency,
    fxRateToBase: e.fxRateToBase,
    split:
      e.split.kind === "equal"
        ? { kind: "equal", memberIds: e.split.participantIds }
        : { kind: "exact", shares: e.split.shares },
  }
}

settlement.get("/:slug/settlement", async (c) => {
  const state = await getGroupState(c.env.DB, c.req.param("slug"))
  if (!state) return notFound(c, "group not found")

  // Default to EXACT (to the cent). Cash-handover rounding is opt-in via a
  // valid ?rounding step; anything else (absent/invalid) stays exact.
  const q = Number(c.req.query("rounding"))
  const rounding = VALID_ROUNDING.has(q) ? (q as RoundingStep) : undefined

  const inputs = state.expenses.map(toInput)
  const netMap = computeBalances(inputs, state.group.baseCurrency)
  const transfers = settle(inputs, { baseCurrency: state.group.baseCurrency, rounding })

  const balances: Balance[] = state.members.map((m) => ({
    memberId: m.id,
    netMinor: netMap.get(m.id) ?? 0,
  }))

  const body: Settlement = { balances, transfers }
  return c.json(body, 200)
})

export default settlement
