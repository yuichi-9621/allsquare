export type Share = { memberId: string; amountMinor: number }

export class SplitSumError extends Error {
  constructor(total: number, actual: number) {
    super(`exact shares sum to ${actual}, expected ${total}`)
    this.name = "SplitSumError"
  }
}

export function splitEqual(totalMinor: number, memberIds: string[]): Share[] {
  if (memberIds.length === 0) {
    throw new RangeError("splitEqual requires at least one member")
  }
  const n = memberIds.length
  const base = Math.floor(totalMinor / n)
  const remainder = totalMinor - base * n
  return memberIds.map((memberId, i) => ({
    memberId,
    amountMinor: base + (i < remainder ? 1 : 0),
  }))
}

export function splitExact(totalMinor: number, shares: Share[]): Share[] {
  const actual = shares.reduce((a, s) => a + s.amountMinor, 0)
  if (actual !== totalMinor) throw new SplitSumError(totalMinor, actual)
  return shares
}
