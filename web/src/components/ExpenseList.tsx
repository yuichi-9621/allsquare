import { convertMinor, formatWithBase } from "../lib/money"
import type { Expense, Member } from "../lib/types"

export function ExpenseList({
  expenses,
  members,
  baseCurrency,
  onDelete,
  onEdit,
}: {
  expenses: Expense[]
  members: Member[]
  baseCurrency: string
  onDelete?: (expenseId: string) => void
  onEdit?: (expenseId: string) => void
}) {
  const nameOf = new Map(members.map((m) => [m.id, m.name]))
  if (expenses.length === 0) return <p className="empty">No expenses yet.</p>
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
            {onEdit ? (
              <button
                type="button"
                className="row-edit"
                aria-label={`Edit ${e.description}`}
                onClick={() => onEdit(e.id)}
              >
                Edit
              </button>
            ) : null}
            {onDelete ? (
              <button
                type="button"
                className="row-delete"
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
