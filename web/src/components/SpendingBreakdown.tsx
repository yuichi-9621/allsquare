import { Button } from "@allsquare/ui"
import { useState } from "react"
import { CATEGORIES } from "../lib/categories"
import { useT } from "../lib/i18n"
import { convertMinor } from "../lib/money"
import { isRepayment } from "../lib/shareCard"
import type { Expense, Member } from "../lib/types"
import { MoneyAmount } from "./MoneyAmount"

// Where the money went, by category: base-currency totals at each expense's
// FROZEN rate, repayments excluded, collapsed by default like Totals.
export function SpendingBreakdown({
  expenses,
  members,
  baseCurrency,
}: {
  expenses: Expense[]
  members: Member[]
  baseCurrency: string
}) {
  const t = useT()
  const [open, setOpen] = useState(false)

  const totals = new Map<string, number>()
  for (const e of expenses) {
    if (isRepayment(e, members)) continue
    const id = CATEGORIES.some((c) => c.id === e.category) ? (e.category as string) : "other"
    const inBase = convertMinor(e.amountMinor, e.currency, baseCurrency, e.fxRateToBase)
    totals.set(id, (totals.get(id) ?? 0) + inBase)
  }
  const rows = CATEGORIES.map((c) => ({ ...c, totalMinor: totals.get(c.id) ?? 0 }))
    .filter((r) => r.totalMinor > 0)
    .sort((a, b) => b.totalMinor - a.totalMinor)
  const max = rows[0]?.totalMinor ?? 0

  if (rows.length === 0) return null

  return (
    <section aria-label={t("spending")} className="flex flex-col gap-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="w-fit justify-start px-1 font-mono text-xs uppercase tracking-wider text-muted-foreground"
      >
        {t("spending")} {open ? "▾" : "▸"}
      </Button>
      {open ? (
        <ul className="flex flex-col gap-2">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-col gap-0.5">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span>
                  <span aria-hidden className="mr-1">
                    {r.emoji}
                  </span>
                  {t(r.labelKey)}
                </span>
                <MoneyAmount
                  amountMinor={r.totalMinor}
                  currency={baseCurrency}
                  className="text-sm"
                />
              </div>
              <div
                className="h-1.5 rounded-full bg-foil/40"
                style={{ width: `${Math.max(4, Math.round((r.totalMinor / max) * 100))}%` }}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
