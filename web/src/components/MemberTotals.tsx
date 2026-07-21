import { Button } from "@allsquare/ui"
import { useState } from "react"
import { useT } from "../lib/i18n"
import { convertMinor } from "../lib/money"
import type { Balance, Expense, Member } from "../lib/types"
import { MemberAvatar } from "./MemberAvatar"
import { MoneyAmount } from "./MoneyAmount"

// Per-person totals, collapsed by default. "Paid" sums each member's expenses
// in base using every expense's FROZEN rate. "Share" is derived as paid minus
// the server's net balance, so it can never drift from the settlement math.
export function MemberTotals({
  expenses,
  members,
  balances,
  baseCurrency,
}: {
  expenses: Expense[]
  members: Member[]
  balances: Balance[]
  baseCurrency: string
}) {
  const t = useT()
  const [open, setOpen] = useState(false)

  const paidOf = new Map<string, number>()
  for (const e of expenses) {
    const inBase = convertMinor(e.amountMinor, e.currency, baseCurrency, e.fxRateToBase)
    paidOf.set(e.payerId, (paidOf.get(e.payerId) ?? 0) + inBase)
  }
  const netOf = new Map(balances.map((b) => [b.memberId, b.netMinor]))

  return (
    <section aria-label={t("totals")} className="flex flex-col gap-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="w-fit justify-start px-1 font-mono text-xs uppercase tracking-wider text-muted-foreground"
      >
        {t("totals")} {open ? "▾" : "▸"}
      </Button>
      {open ? (
        <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 gap-y-1.5">
          <span />
          <span className="font-mono text-[0.62rem] uppercase tracking-wider text-muted-foreground">
            {t("paidHeader")}
          </span>
          <span className="font-mono text-[0.62rem] uppercase tracking-wider text-muted-foreground">
            {t("shareHeader")}
          </span>
          {members.map((m) => {
            const paid = paidOf.get(m.id) ?? 0
            const share = paid - (netOf.get(m.id) ?? 0)
            return (
              <div key={m.id} className="contents">
                <span className="flex min-w-0 items-center gap-1.5 truncate text-sm">
                  <MemberAvatar
                    members={members}
                    memberId={m.id}
                    className="h-4 w-4 text-[0.55rem]"
                  />
                  {m.name}
                </span>
                <MoneyAmount
                  amountMinor={paid}
                  currency={baseCurrency}
                  className="text-sm text-foil"
                />
                <MoneyAmount
                  amountMinor={share}
                  currency={baseCurrency}
                  className="text-sm text-muted-foreground"
                />
              </div>
            )
          })}
        </div>
      ) : null}
    </section>
  )
}
