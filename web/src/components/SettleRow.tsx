import type { Member, Transfer } from "../lib/types"
import { MoneyAmount } from "./MoneyAmount"

export function SettleRow({
  transfer,
  members,
  baseCurrency,
}: {
  transfer: Transfer
  members: Member[]
  baseCurrency: string
}) {
  const nameOf = new Map(members.map((m) => [m.id, m.name]))
  return (
    <div className="flex items-center justify-between gap-3">
      <span>
        {nameOf.get(transfer.from) ?? "?"} → {nameOf.get(transfer.to) ?? "?"}
      </span>
      <MoneyAmount amountMinor={transfer.amountMinor} currency={baseCurrency} />
    </div>
  )
}
