import { Button, Card, CardContent, CardHeader, CardTitle } from "@allsquare/ui"
import { convertMinor, splitEqualMinor } from "../lib/money"
import type { Expense, Member } from "../lib/types"
import { MoneyAmount } from "./MoneyAmount"

export function ExpenseCard({
  expense,
  members,
  baseCurrency,
  onEdit,
  onDelete,
}: {
  expense: Expense
  members: Member[]
  baseCurrency: string
  onEdit?: (expenseId: string) => void
  onDelete?: (expenseId: string) => void
}) {
  const nameOf = new Map(members.map((m) => [m.id, m.name]))
  // Derived base figure uses the expense's FROZEN rate, never a live one.
  const baseMinor = convertMinor(
    expense.amountMinor,
    expense.currency,
    baseCurrency,
    expense.fxRateToBase,
  )
  // Per-person breakdown, shown in the expense's own currency.
  const breakdown =
    expense.split.kind === "equal"
      ? (() => {
          const shares = splitEqualMinor(expense.amountMinor, expense.split.participantIds.length)
          return expense.split.participantIds.map((id, i) => ({ id, amountMinor: shares[i] ?? 0 }))
        })()
      : expense.split.shares.map((s) => ({ id: s.memberId, amountMinor: s.amountMinor }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>{expense.description}</CardTitle>
        <MoneyAmount
          amountMinor={expense.amountMinor}
          currency={expense.currency}
          baseCurrency={baseCurrency}
          baseValue={baseMinor}
          className="text-base"
        />
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{nameOf.get(expense.payerId) ?? "?"} paid</p>
        <ul
          aria-label={`Breakdown for ${expense.description}`}
          className="flex flex-col gap-1 border-l-2 border-foil/50 pl-3"
        >
          {breakdown.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-3 text-sm">
              <span>{nameOf.get(b.id) ?? "?"}</span>
              <MoneyAmount amountMinor={b.amountMinor} currency={expense.currency} />
            </li>
          ))}
        </ul>
        {onEdit || onDelete ? (
          <div className="flex gap-2 pt-1">
            {onEdit ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label={`Edit ${expense.description}`}
                onClick={() => onEdit(expense.id)}
              >
                Edit
              </Button>
            ) : null}
            {onDelete ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={`Delete ${expense.description}`}
                onClick={() => onDelete(expense.id)}
              >
                Delete
              </Button>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
