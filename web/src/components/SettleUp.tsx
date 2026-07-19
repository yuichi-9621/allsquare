import { Stamp } from "@allsquare/ui"
import type { Member, Transfer } from "../lib/types"
import { SettleRow } from "./SettleRow"

// Presentational: the rounding choice now lives in the trip menu, and the
// balances/transfers are fetched once by GroupPage. `transfers === null` = loading.
export function SettleUp({
  transfers,
  members,
  baseCurrency,
  onMarkPaid,
}: {
  transfers: Transfer[] | null
  members: Member[]
  baseCurrency: string
  onMarkPaid: (transfer: Transfer) => Promise<void>
}) {
  return (
    <section aria-label="Settle up">
      <div className="flex items-center gap-2">
        <h2>Settle up</h2>
        <Stamp state={transfers && transfers.length === 0 ? "square" : "pending"} />
      </div>
      {transfers === null ? (
        <p>Calculating…</p>
      ) : transfers.length === 0 ? (
        <p>Everyone is all square.</p>
      ) : (
        <div aria-label="Transfers" className="flex flex-col gap-2">
          {transfers.map((t) => (
            <SettleRow
              key={`${t.from}-${t.to}-${t.amountMinor}`}
              transfer={t}
              members={members}
              baseCurrency={baseCurrency}
              onMarkPaid={onMarkPaid}
            />
          ))}
        </div>
      )}
    </section>
  )
}
