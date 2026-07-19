// Wire shapes — copied verbatim from api-contract.md. Do not rename or reshape.

export type Env = { DB: D1Database }

export type Rounding = 1 | 10 | 100 | 1000

export type Group = {
  slug: string
  title: string
  baseCurrency: string
  rounding: Rounding
  createdAt: string
}

export type Member = { id: string; name: string; sortOrder: number; paymentHandle: string | null }

export type SplitEqual = { kind: "equal"; participantIds: string[] }
export type SplitExact = {
  kind: "exact"
  shares: { memberId: string; amountMinor: number }[]
}

export type ExpenseKind = "expense" | "repayment"

export type Expense = {
  id: string
  payerId: string
  amountMinor: number
  currency: string
  fxRateToBase: number
  fxRateDate: string
  description: string
  kind: ExpenseKind
  category: string | null
  split: SplitEqual | SplitExact
  createdAt: string
}

export type GroupState = { group: Group; members: Member[]; expenses: Expense[] }

export type Balance = { memberId: string; netMinor: number }
export type Transfer = { from: string; to: string; amountMinor: number }
export type Settlement = { balances: Balance[]; transfers: Transfer[] }
