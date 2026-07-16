import { decimalsFor } from "./currency.js"

// Round half-up on non-negative values (all money here is non-negative).
function roundHalfUp(x: number): number {
  return Math.floor(x + 0.5)
}

export function convertMinor(amountMinor: number, from: string, to: string, rate: number): number {
  if (from === to) return amountMinor
  const fromMajor = amountMinor / 10 ** decimalsFor(from)
  const toMajor = fromMajor * rate
  return roundHalfUp(toMajor * 10 ** decimalsFor(to))
}
