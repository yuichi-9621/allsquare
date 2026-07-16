import { decimalsFor } from "./currency.js"

// Round half-up. The scaled value can carry a few units of floating-point
// drift from the rate multiplication; snapping to 6 decimal places removes
// that drift (which is far below one minor unit for realistic money amounts)
// so an exact .5 boundary — e.g. 100.5 cents from 1 JPY at rate 1.005 —
// rounds up rather than down.
function roundHalfUp(x: number): number {
  const snapped = Number(x.toFixed(6))
  return Math.floor(snapped + 0.5)
}

export function convertMinor(amountMinor: number, from: string, to: string, rate: number): number {
  if (from === to) return amountMinor
  const fromMajor = amountMinor / 10 ** decimalsFor(from)
  const toMajor = fromMajor * rate
  return roundHalfUp(toMajor * 10 ** decimalsFor(to))
}
