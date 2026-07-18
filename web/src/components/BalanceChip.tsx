import { Badge } from "@allsquare/ui"
import { formatMoney } from "../lib/money"

export function BalanceChip({
  netMinor,
  baseCurrency,
  name,
}: {
  netMinor: number
  baseCurrency: string
  name: string
}) {
  const variant = netMinor > 0 ? "success" : netMinor < 0 ? "danger" : "muted"
  const sign = netMinor > 0 ? "+" : netMinor < 0 ? "−" : ""
  const amount = formatMoney(Math.abs(netMinor), baseCurrency)
  return (
    <Badge variant={variant}>
      {name} {sign}
      {amount}
    </Badge>
  )
}
