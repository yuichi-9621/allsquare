import { minorPerUnit } from "./currency.js"
import type { Transfer } from "./settlement.js"

export type RoundingStep = 1 | 10 | 100 | 1000

export function roundTransfers(
  transfers: Transfer[],
  step: RoundingStep,
  currency: string,
): Transfer[] {
  const stepMinor = step * minorPerUnit(currency)
  return transfers.map((tr) => {
    const rounded = Math.round(tr.amountMinor / stepMinor) * stepMinor
    return { ...tr, amountMinor: Math.max(0, rounded) }
  })
}
