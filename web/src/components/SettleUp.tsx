import { useState } from "react"
import { useSettlement } from "../hooks/useSettlement"
import { formatMoney } from "../lib/money"
import type { Group, Member, Rounding } from "../lib/types"

const ROUNDINGS: Rounding[] = [1, 10, 100, 1000]

export function SettleUp({ group, members }: { group: Group; members: Member[] }) {
  const [rounding, setRounding] = useState<Rounding>(group.rounding)
  const settlement = useSettlement(group.slug, rounding)
  const nameOf = new Map(members.map((m) => [m.id, m.name]))

  return (
    <section aria-label="Settle up">
      <h2>Settle up</h2>
      <label>
        Round to
        <select value={rounding} onChange={(e) => setRounding(Number(e.target.value) as Rounding)}>
          {ROUNDINGS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>
      {settlement === null ? (
        <p>Calculating…</p>
      ) : settlement.transfers.length === 0 ? (
        <p>Everyone is all square.</p>
      ) : (
        <ul aria-label="Transfers">
          {settlement.transfers.map((t) => (
            <li key={`${t.from}-${t.to}-${t.amountMinor}`}>
              {nameOf.get(t.from) ?? "?"} pays {nameOf.get(t.to) ?? "?"}{" "}
              {formatMoney(t.amountMinor, group.baseCurrency)}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
