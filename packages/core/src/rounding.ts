import { minorPerUnit } from "./currency.js"
import type { Transfer } from "./settlement.js"

export type RoundingStep = 1 | 10 | 100 | 1000

// Deliberately lossy handover rounding: rounds each transfer to nearest step of major units
// for convenient cash handover. Does NOT preserve zero-sum property — that is intentional.
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
