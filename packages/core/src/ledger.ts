import { convertMinor } from "./convert.js"
import { minorPerUnit } from "./currency.js"
import { roundTransfers } from "./rounding.js"
import type { RoundingStep } from "./rounding.js"
import { minimizeTransfers } from "./settlement.js"
import type { Transfer } from "./settlement.js"
import { type Share, splitEqual, splitExact } from "./split.js"

// Convert exact shares (given in the expense's `currency`) into base-currency
// minor units using the frozen rate. Each share's base value is floored, then
// the rounding remainder is handed out by largest fractional part so the
// results sum EXACTLY to `baseTotal` — money is conserved to the cent.
// Base-currency shares need no conversion (validated to sum to the total).
function exactBaseShares(
  shares: Share[],
  currency: string,
  baseCurrency: string,
  rate: number,
  baseTotal: number,
): Share[] {
  if (currency === baseCurrency) return splitExact(baseTotal, shares)

  const mFrom = minorPerUnit(currency)
  const mTo = minorPerUnit(baseCurrency)
  const parts = shares.map((s) => {
    // snap sub-minor float drift (mirrors convert.roundHalfUp) before flooring
    const exact = Number(((s.amountMinor / mFrom) * rate * mTo).toFixed(6))
    const floor = Math.floor(exact)
    return { memberId: s.memberId, floor, frac: exact - floor }
  })
  const assigned = parts.reduce((a, p) => a + p.floor, 0)
  let remaining = baseTotal - assigned // cents still to hand out (0..shares.length)
  // Largest fractional remainder gets the extra cents first (fair and stable).
  for (const p of [...parts].sort((a, b) => b.frac - a.frac)) {
    if (remaining <= 0) break
    p.floor += 1
    remaining -= 1
  }
  return parts.map((p) => ({ memberId: p.memberId, amountMinor: p.floor }))
}

export type ExpenseInput = {
  payerId: string
  amountMinor: number
  currency: string
  fxRateToBase: number
  split: { kind: "equal"; memberIds: string[] } | { kind: "exact"; shares: Share[] }
}

export type SettleOptions = { baseCurrency: string; rounding: RoundingStep }

export function computeBalances(
  expenses: ExpenseInput[],
  baseCurrency: string,
): Map<string, number> {
  const net = new Map<string, number>()
  const add = (id: string, delta: number) => net.set(id, (net.get(id) ?? 0) + delta)

  for (const e of expenses) {
    const baseTotal = convertMinor(e.amountMinor, e.currency, baseCurrency, e.fxRateToBase)
    const shares =
      e.split.kind === "equal"
        ? splitEqual(baseTotal, e.split.memberIds)
        : // Exact shares are in the expense currency (validated to sum to the
          // expense total at the API boundary); derive their base values here.
          exactBaseShares(e.split.shares, e.currency, baseCurrency, e.fxRateToBase, baseTotal)
    add(e.payerId, baseTotal) // payer fronted the whole amount
    for (const s of shares) add(s.memberId, -s.amountMinor) // each owes their share
  }
  return net
}

export function settle(expenses: ExpenseInput[], opts: SettleOptions): Transfer[] {
  const balances = computeBalances(expenses, opts.baseCurrency)
  const transfers = minimizeTransfers(balances)
  // Handover rounding can shrink a small transfer to 0; drop those — a
  // "pays 0" line is noise, not an instruction.
  return roundTransfers(transfers, opts.rounding, opts.baseCurrency).filter(
    (t) => t.amountMinor > 0,
  )
}
