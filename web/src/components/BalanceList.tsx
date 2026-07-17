import { formatMoney } from "../lib/money"
import type { Balance, Member } from "../lib/types"

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
    <ul aria-label="Balances">
      {balances.map((b) => {
        const name = nameOf.get(b.memberId) ?? "?"
        const tone = b.netMinor === 0 ? "settled" : b.netMinor > 0 ? "owed" : "owes"
        const label =
          b.netMinor === 0
            ? "is settled"
            : b.netMinor > 0
              ? `is owed ${formatMoney(b.netMinor, baseCurrency)}`
              : `owes ${formatMoney(-b.netMinor, baseCurrency)}`
        return (
          <li key={b.memberId} className={`balance balance--${tone}`}>
            {name} {label}
          </li>
        )
      })}
    </ul>
  )
}
