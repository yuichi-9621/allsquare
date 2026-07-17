export type FrozenRate = { rate: number; rateDate: string }
export type FetchLike = (input: string) => Promise<Response>

const MAX_CARRY_BACK_DAYS = 7
const FRANKFURTER = "https://api.frankfurter.dev/v1"

export class FxUnavailableError extends Error {
  constructor(from: string, to: string, date: string) {
    super(`no FX rate for ${from}->${to} within ${MAX_CARRY_BACK_DAYS} days of ${date}`)
    this.name = "FxUnavailableError"
  }
}

function shiftDate(isoDate: string, deltaDays: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + deltaDays)
  return d.toISOString().slice(0, 10)
}

// Resolve base-per-source (fxRateToBase) for `from`->`to` on `date`.
// Cache-first per candidate day; on miss fetch Frankfurter for that exact day;
// if that day has no published rate, carry forward (walk back) up to 7 days.
export async function resolveRate(
  db: D1Database,
  from: string,
  to: string,
  date: string,
  fetchImpl: FetchLike = fetch,
): Promise<FrozenRate> {
  if (from === to) return { rate: 1, rateDate: date }

  for (let i = 0; i < MAX_CARRY_BACK_DAYS; i++) {
    const candidate = shiftDate(date, -i)

    const cached = await db
      .prepare("SELECT rate FROM fx_rates WHERE base = ? AND quote = ? AND date = ?")
      .bind(to, from, candidate)
      .first<{ rate: number }>()
    if (cached) return { rate: cached.rate, rateDate: candidate }

    // Frankfurter base = the currency we convert FROM; symbols = the currency we
    // convert TO. rates[to] is then base-per-source verbatim (no inversion).
    const res = await fetchImpl(`${FRANKFURTER}/${candidate}?base=${from}&symbols=${to}`)
    if (!res.ok) continue
    const body = (await res.json()) as { date?: string; rates?: Record<string, number> }
    const rate = body.rates?.[to]
    if (rate === undefined) continue

    // Frankfurter may itself return an earlier working day for a weekend query;
    // trust its `date` as the true effective/published date and cache under it.
    const published = body.date ?? candidate
    await db
      .prepare("INSERT OR REPLACE INTO fx_rates (base, quote, date, rate) VALUES (?, ?, ?, ?)")
      .bind(to, from, published, rate)
      .run()
    return { rate, rateDate: published }
  }
  throw new FxUnavailableError(from, to, date)
}
