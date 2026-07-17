import { convertMinor, formatWithBase } from "../lib/money"
import type { Expense, Member } from "../lib/types"

export function ExpenseList({
  expenses,
  members,
  baseCurrency,
  onDelete,
}: {
  expenses: Expense[]
  members: Member[]
  baseCurrency: string
  onDelete?: (expenseId: string) => void
}) {
  const nameOf = new Map(members.map((m) => [m.id, m.name]))
  if (expenses.length === 0) return <p>No expenses yet.</p>
  return (
    <ul aria-label="Expenses">
      {expenses.map((e) => {
        // Derived base figure uses the expense's FROZEN rate, never a live one.
        const baseMinor = convertMinor(e.amountMinor, e.currency, baseCurrency, e.fxRateToBase)
        return (
          <li key={e.id}>
            <span>{e.description}</span> <span>paid by {nameOf.get(e.payerId) ?? "?"}</span>{" "}
            <span>
              {formatWithBase(
                { amountMinor: e.amountMinor, currency: e.currency },
                baseMinor,
                baseCurrency,
              )}
            </span>{" "}
            {onDelete ? (
              <button
                type="button"
                aria-label={`Delete ${e.description}`}
                onClick={() => onDelete(e.id)}
              >
                Delete
              </button>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
