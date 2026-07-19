import { Stamp } from "@allsquare/ui"
import { useT } from "../lib/i18n"
import type { Member, Transfer } from "../lib/types"
import { SettleRow } from "./SettleRow"

// Presentational: the rounding choice now lives in the trip menu, and the
// balances/transfers are fetched once by GroupPage. `transfers === null` = loading.
export function SettleUp({
  transfers,
  members,
  baseCurrency,
  note,
  onMarkPaid,
}: {
  transfers: Transfer[] | null
  members: Member[]
  baseCurrency: string
  note?: string | undefined
  onMarkPaid: (transfer: Transfer) => Promise<void>
}) {
  const t = useT()
  return (
    <section aria-label={t("settleUp")}>
      <div className="flex items-center gap-2">
        <h2>{t("settleUp")}</h2>
        <Stamp
          state={transfers && transfers.length === 0 ? "square" : "pending"}
          labels={{ square: t("allSquareStamp"), pending: t("notYetSquareStamp") }}
        />
      </div>
      {transfers === null ? (
        <p>{t("calculating")}</p>
      ) : transfers.length === 0 ? (
        <p>{t("allSquareMessage")}</p>
      ) : (
        <div aria-label="Transfers" className="flex flex-col gap-2">
          {transfers.map((t) => (
            <SettleRow
              key={`${t.from}-${t.to}-${t.amountMinor}`}
              transfer={t}
              members={members}
              baseCurrency={baseCurrency}
              note={note}
              onMarkPaid={onMarkPaid}
            />
          ))}
        </div>
      )}
    </section>
  )
}
