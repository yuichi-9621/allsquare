import { Button, Card, CardContent, CardHeader, CardTitle, Stamp } from "@allsquare/ui"
import { categoryOf } from "../lib/categories"
import { useT } from "../lib/i18n"
import { convertMinor, splitEqualMinor } from "../lib/money"
import type { Expense, Member } from "../lib/types"
import { MemberAvatar } from "./MemberAvatar"
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
  const t = useT()
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

  // Repayments (created by Mark paid) store their description as literal
  // English data ("X paid Y") so the ledger stays locale-independent; the
  // UI renders that row's title from the kind flag + payer/recipient ids
  // instead, so it follows the active locale.
  const isRepayment = expense.kind === "repayment"
  const repaymentShareId =
    isRepayment && expense.split.kind === "exact" ? expense.split.shares[0]?.memberId : undefined
  const fromName = nameOf.get(expense.payerId) ?? "?"
  const toName = repaymentShareId ? (nameOf.get(repaymentShareId) ?? "?") : "?"
  // A settlement is a full-size card like any expense, marked by a rotated
  // rubber "Settlement" stamp (the app's stamp motif) and a transfer arrow
  // "A → B" title (with a full-sentence aria label for screen readers). No
  // per-person breakdown — a repayment is just A paying B in full.
  const title =
    isRepayment && repaymentShareId
      ? t("settlementTitle", { from: fromName, to: toName })
      : expense.description

  return (
    <Card>
      <CardHeader>
        <CardTitle
          {...(isRepayment && repaymentShareId
            ? { "aria-label": t("repaymentTitle", { from: fromName, to: toName }) }
            : {})}
        >
          {isRepayment ? (
            <Stamp
              state="square"
              labels={{ square: t("settlementBadge") }}
              className="mr-2 align-middle"
            />
          ) : (
            <span aria-hidden className="mr-1.5">
              {categoryOf(expense.category)?.emoji}
            </span>
          )}
          {title}
        </CardTitle>
        <MoneyAmount
          amountMinor={expense.amountMinor}
          currency={expense.currency}
          baseCurrency={baseCurrency}
          baseValue={baseMinor}
          className="text-base"
        />
      </CardHeader>
      <CardContent>
        {isRepayment ? null : (
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MemberAvatar members={members} memberId={expense.payerId} />
            <span>
              <span className="font-semibold text-foreground">{fromName}</span>
              {t("expensePaidSuffix")}
            </span>
          </p>
        )}
        {isRepayment ? null : expense.items?.length ? (
          <ul
            aria-label={`Items for ${expense.description}`}
            className="flex flex-col gap-1 border-l-2 border-foil/50 pl-3"
          >
            {expense.items.map((item) => (
              <li key={item.name} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate">{item.name}</span>
                  <span className="flex shrink-0 items-center gap-0.5">
                    {item.memberIds.map((id) => (
                      <MemberAvatar
                        key={id}
                        members={members}
                        memberId={id}
                        className="h-4 w-4 text-[0.55rem]"
                      />
                    ))}
                  </span>
                </span>
                <MoneyAmount amountMinor={item.amountMinor} currency={expense.currency} />
              </li>
            ))}
          </ul>
        ) : (
          <ul
            aria-label={`Breakdown for ${expense.description}`}
            className="flex flex-col gap-1 border-l-2 border-foil/50 pl-3"
          >
            {breakdown.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-1.5">
                  <MemberAvatar
                    members={members}
                    memberId={b.id}
                    className="h-4 w-4 text-[0.55rem]"
                  />
                  {nameOf.get(b.id) ?? "?"}
                </span>
                <MoneyAmount amountMinor={b.amountMinor} currency={expense.currency} />
              </li>
            ))}
          </ul>
        )}
        {onEdit || onDelete ? (
          <div className="flex gap-2 pt-1">
            {onEdit ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label={t("editAria", { description: expense.description })}
                onClick={() => onEdit(expense.id)}
              >
                {t("edit")}
              </Button>
            ) : null}
            {onDelete ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={t("deleteAria", { description: expense.description })}
                onClick={() => onDelete(expense.id)}
              >
                {t("delete")}
              </Button>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
