import { convertMinor, formatMoney, formatWithBase, splitEqualMinor } from "../lib/money"
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
        // Per-person breakdown, shown in the expense's own currency.
        const breakdown =
          e.split.kind === "equal"
            ? (() => {
                const shares = splitEqualMinor(e.amountMinor, e.split.participantIds.length)
                return e.split.participantIds.map((id, i) => ({ id, amountMinor: shares[i] ?? 0 }))
              })()
            : e.split.shares.map((s) => ({ id: s.memberId, amountMinor: s.amountMinor }))
        return (
          <li key={e.id} className="expense">
            <div className="expense-head">
              <span className="expense-desc">{e.description}</span>
              <span className="expense-total">
                {formatWithBase(
                  { amountMinor: e.amountMinor, currency: e.currency },
                  baseMinor,
                  baseCurrency,
                )}
              </span>
            </div>
            <p className="expense-payer">{nameOf.get(e.payerId) ?? "?"} paid</p>
            <ul className="expense-breakdown" aria-label={`Breakdown for ${e.description}`}>
              {breakdown.map((b) => (
                <li key={b.id}>
                  <span>{nameOf.get(b.id) ?? "?"}</span>
                  <span>{formatMoney(b.amountMinor, e.currency)}</span>
                </li>
              ))}
            </ul>
            {onEdit || onDelete ? (
              <div className="expense-actions">
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
              </div>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
