export type Money = { amountMinor: number; currency: string }

export function assertSafeMinor(amountMinor: number): void {
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) {
    throw new RangeError(`amountMinor must be a safe non-negative integer, got ${amountMinor}`)
  }
}
