// ISO 4217 minor-unit exponents for the currencies we expect on trips.
// Anything not listed falls back to 2, the overwhelmingly common case.
const DECIMALS: Record<string, number> = {
  JPY: 0,
  KRW: 0,
  VND: 0,
  USD: 2,
  EUR: 2,
  GBP: 2,
  AUD: 2,
  CAD: 2,
  CHF: 2,
  CNY: 2,
  HKD: 2,
  SGD: 2,
  THB: 2,
  TWD: 2,
  KWD: 3,
  BHD: 3,
}

export function decimalsFor(currency: string): number {
  return DECIMALS[currency] ?? 2
}

export function minorPerUnit(currency: string): number {
  return 10 ** decimalsFor(currency)
}
