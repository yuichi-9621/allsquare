import { convertMinor, formatMoney } from "./money"
import type { Expense, Member } from "./types"

// A Mark-paid repayment has an unmistakable shape: exact split, one share,
// for the full amount, to someone other than the payer, described exactly
// "<payer> paid <recipient>". Real expenses ("Ben's ticket") don't match.
export function isRepayment(expense: Expense, members: Member[]): boolean {
  // Authoritative flag (rows created after the kind migration).
  if (expense.kind === "repayment") return true
  if (expense.kind === "expense") return false
  // Legacy rows (no kind): fall back to the shape heuristic.
  if (expense.split.kind !== "exact") return false
  const shares = expense.split.shares
  if (shares.length !== 1) return false
  const share = shares[0]
  if (!share || share.amountMinor !== expense.amountMinor) return false
  if (share.memberId === expense.payerId) return false
  const nameOf = new Map(members.map((m) => [m.id, m.name]))
  return (
    expense.description ===
    `${nameOf.get(expense.payerId) ?? "?"} paid ${nameOf.get(share.memberId) ?? "?"}`
  )
}

export type TripSummary = {
  totalMinor: number
  expenseCount: number
  memberCount: number
  currencyCount: number
}

// Spending summary in base currency at each expense's FROZEN rate,
// excluding repayments (settling up is not trip spending).
export function tripSummary(
  expenses: Expense[],
  members: Member[],
  baseCurrency: string,
): TripSummary {
  let totalMinor = 0
  let expenseCount = 0
  const currencies = new Set<string>()
  for (const e of expenses) {
    if (isRepayment(e, members)) continue
    totalMinor += convertMinor(e.amountMinor, e.currency, baseCurrency, e.fxRateToBase)
    expenseCount += 1
    currencies.add(e.currency)
  }
  return {
    totalMinor,
    expenseCount,
    memberCount: members.length,
    currencyCount: currencies.size,
  }
}

// Sage-cover palette; mirrors themes/stamp.css (dark ink on a #7BA05B field).
const SAGE = "#7BA05B"
const INK = "#1C2810"
const FOREST = "#2E401C"
const MOSS = "#2F4519"

// Draws the 1200x630 "trip settled" card. Returns false when no 2d context
// is available (jsdom); callers bail quietly.
export function drawShareCard(
  canvas: HTMLCanvasElement,
  title: string,
  baseCurrency: string,
  summary: TripSummary,
): boolean {
  const ctx = canvas.getContext("2d")
  if (!ctx) return false

  ctx.fillStyle = SAGE
  ctx.fillRect(0, 0, 1200, 630)
  ctx.strokeStyle = INK
  ctx.lineWidth = 2
  ctx.strokeRect(24, 24, 1152, 582)

  ctx.fillStyle = FOREST
  ctx.font = "500 34px 'IBM Plex Mono', monospace"
  ctx.fillText("A L L S Q U A R E", 76, 130)

  // Trip title, truncated to fit inside the frame
  ctx.fillStyle = INK
  ctx.font = "600 88px 'Archivo Narrow', sans-serif"
  let shown = title
  while (shown.length > 3 && ctx.measureText(shown).width > 1040) {
    shown = `${shown.slice(0, -2).trimEnd()}…`
  }
  ctx.fillText(shown, 72, 270)

  ctx.fillStyle = MOSS
  ctx.font = "500 30px 'IBM Plex Mono', monospace"
  const people = `${summary.memberCount} ${summary.memberCount === 1 ? "PERSON" : "PEOPLE"}`
  const expensesLabel = `${summary.expenseCount} EXPENSE${summary.expenseCount === 1 ? "" : "S"}`
  ctx.fillText(`${formatMoney(summary.totalMinor, baseCurrency)} TOTAL · ${expensesLabel}`, 76, 360)
  const currenciesLabel = `${summary.currencyCount} ${summary.currencyCount === 1 ? "CURRENCY" : "CURRENCIES"}`
  ctx.fillText(`${people} · ${currenciesLabel}`, 76, 410)

  ctx.fillStyle = FOREST
  ctx.font = "500 26px 'IBM Plex Mono', monospace"
  ctx.fillText("ALL-SQR.COM", 76, 552)

  // The stamp, tilted bottom right
  ctx.save()
  ctx.translate(940, 500)
  ctx.rotate((-9 * Math.PI) / 180)
  ctx.strokeStyle = FOREST
  ctx.lineWidth = 6
  if (typeof ctx.roundRect === "function") {
    ctx.beginPath()
    ctx.roundRect(-190, -60, 380, 120, 16)
    ctx.stroke()
  } else {
    ctx.strokeRect(-190, -60, 380, 120)
  }
  ctx.fillStyle = FOREST
  ctx.font = "500 46px 'IBM Plex Mono', monospace"
  const stampText = "ALL SQUARE"
  const w = ctx.measureText(stampText).width
  ctx.fillText(stampText, -w / 2, 16)
  ctx.restore()

  return true
}
