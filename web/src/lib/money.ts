// Self-contained ISO 4217 minor-unit exponents (mirrors @allsquare/core; the web
// app does not import core). Object.create(null) so lookups can't collide with
// Object.prototype members (e.g. "constructor"); anything unlisted falls back to 2.
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

// Round half-up, snapping away sub-minor-unit float drift first (mirrors core)
// so exact .5 boundaries round up rather than down.
function roundHalfUp(x: number): number {
  const snapped = Number(x.toFixed(6))
  return Math.floor(snapped + 0.5)
}

// Display-only conversion using an expense's FROZEN rate (target-per-source).
// Same math as core.convertMinor; never fetches a live rate.
export function convertMinor(amountMinor: number, from: string, to: string, rate: number): number {
  if (from === to) return amountMinor
  const fromMajor = amountMinor / minorPerUnit(from)
  return roundHalfUp(fromMajor * rate * minorPerUnit(to))
}

export function formatMoney(amountMinor: number, currency: string): string {
  const decimals = decimalsFor(currency)
  const major = amountMinor / 10 ** decimals
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(major)
  } catch {
    // Unknown/invalid ISO code: Intl throws — fall back to a plain rendering.
    return `${major.toFixed(decimals)} ${currency}`
  }
}

export function formatWithBase(
  original: { amountMinor: number; currency: string },
  baseMinor: number,
  baseCurrency: string,
): string {
  const shown = formatMoney(original.amountMinor, original.currency)
  if (original.currency === baseCurrency) return shown
  return `${shown} · ≈ ${formatMoney(baseMinor, baseCurrency)}`
}

export function parseMajorToMinor(input: string, currency: string): number | null {
  const trimmed = input.trim()
  if (trimmed === "") return null
  const value = Number(trimmed)
  if (!Number.isFinite(value) || value < 0) return null
  const minor = Math.round(value * minorPerUnit(currency))
  return Number.isSafeInteger(minor) ? minor : null
}
