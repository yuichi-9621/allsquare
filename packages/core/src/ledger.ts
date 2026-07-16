import { convertMinor } from "./convert.js"
import { roundTransfers } from "./rounding.js"
import type { RoundingStep } from "./rounding.js"
import { minimizeTransfers } from "./settlement.js"
import type { Transfer } from "./settlement.js"
import { type Share, splitEqual, splitExact } from "./split.js"

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
        : splitExact(baseTotal, e.split.shares)
    add(e.payerId, baseTotal) // payer fronted the whole amount
    for (const s of shares) add(s.memberId, -s.amountMinor) // each owes their share
  }
  return net
}

export function settle(expenses: ExpenseInput[], opts: SettleOptions): Transfer[] {
  const balances = computeBalances(expenses, opts.baseCurrency)
  const transfers = minimizeTransfers(balances)
  return roundTransfers(transfers, opts.rounding, opts.baseCurrency)
}
