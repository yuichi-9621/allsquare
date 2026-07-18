import { cn } from "@allsquare/ui"
import { formatMoney, formatWithBase } from "../lib/money"

export function MoneyAmount({
  amountMinor,
  currency,
  baseCurrency,
  baseValue,
  className,
}: {
  amountMinor: number
  currency: string
  baseCurrency?: string
  baseValue?: number
  className?: string
}) {
  const text =
    baseValue !== undefined && baseCurrency !== undefined && baseCurrency !== currency
      ? formatWithBase({ amountMinor, currency }, baseValue, baseCurrency)
      : formatMoney(amountMinor, currency)
  return <span className={cn("font-mono tabular-nums", className)}>{text}</span>
}
