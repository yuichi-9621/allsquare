// ISO 4217 minor-unit exponents for the currencies we expect on trips.
// Anything not listed falls back to 2, the overwhelmingly common case.
const DECIMALS: Record<string, number> = Object.create(null)
DECIMALS.JPY = 0
DECIMALS.KRW = 0
DECIMALS.VND = 0
DECIMALS.USD = 2
DECIMALS.EUR = 2
DECIMALS.GBP = 2
DECIMALS.AUD = 2
DECIMALS.CAD = 2
DECIMALS.CHF = 2
DECIMALS.CNY = 2
DECIMALS.HKD = 2
DECIMALS.SGD = 2
DECIMALS.THB = 2
DECIMALS.TWD = 2
DECIMALS.KWD = 3
DECIMALS.BHD = 3

export function decimalsFor(currency: string): number {
  return DECIMALS[currency] ?? 2
}

export function minorPerUnit(currency: string): number {
  return 10 ** decimalsFor(currency)
}
