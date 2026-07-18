import { formatMoney } from "../lib/money"
import type { Member, Transfer } from "../lib/types"

// Presentational: the rounding choice now lives in the trip menu, and the
// balances/transfers are fetched once by GroupPage. `transfers === null` = loading.
export function SettleUp({
  transfers,
  members,
  baseCurrency,
}: {
  transfers: Transfer[] | null
  members: Member[]
  baseCurrency: string
}) {
  const nameOf = new Map(members.map((m) => [m.id, m.name]))
  return (
    <section aria-label="Settle up">
      <h2>Settle up</h2>
      {transfers === null ? (
        <p>Calculating…</p>
      ) : transfers.length === 0 ? (
        <p>Everyone is all square.</p>
      ) : (
        <ul aria-label="Transfers">
          {transfers.map((t) => (
            <li key={`${t.from}-${t.to}-${t.amountMinor}`}>
              {nameOf.get(t.from) ?? "?"} pays {nameOf.get(t.to) ?? "?"}{" "}
              {formatMoney(t.amountMinor, baseCurrency)}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
