import { useT } from "../lib/i18n"
import type { Expense, Member } from "../lib/types"
import { ExpenseCard } from "./ExpenseCard"

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
  const t = useT()
  if (expenses.length === 0)
    return (
      <p className="rounded-md border border-dashed border-border px-4 py-5 text-center font-mono text-sm tracking-wide text-muted-foreground">
        {t("noExpensesYet")}
      </p>
    )
  return (
    <div aria-label="Expenses" className="flex flex-col gap-3">
      {expenses.map((e) => (
        <ExpenseCard
          key={e.id}
          expense={e}
          members={members}
          baseCurrency={baseCurrency}
          {...(onEdit ? { onEdit } : {})}
          {...(onDelete ? { onDelete } : {})}
        />
      ))}
    </div>
  )
}
