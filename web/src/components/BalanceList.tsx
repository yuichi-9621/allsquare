import type { Balance, Member } from "../lib/types"
import { BalanceChip } from "./BalanceChip"

export function BalanceList({
  balances,
  members,
  baseCurrency,
}: {
  balances: Balance[]
  members: Member[]
  baseCurrency: string
}) {
  const nameOf = new Map(members.map((m) => [m.id, m.name]))
  return (
    <div aria-label="Balances" className="flex flex-wrap gap-2">
      {balances.map((b) => (
        <BalanceChip
          key={b.memberId}
          netMinor={b.netMinor}
          baseCurrency={baseCurrency}
          name={nameOf.get(b.memberId) ?? "?"}
        />
      ))}
    </div>
  )
}
