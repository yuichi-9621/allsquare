export type Transfer = { from: string; to: string; amountMinor: number }

export class UnbalancedError extends Error {
  constructor(sum: number) {
    super(`balances must sum to 0, got ${sum}`)
    this.name = "UnbalancedError"
  }
}

type Party = { id: string; amt: number }

// Sort by amount desc, then id asc — makes output deterministic regardless of
// Map insertion order.
function byAmountThenId(a: Party, b: Party): number {
  return b.amt - a.amt || (a.id < b.id ? -1 : 1)
}

export function minimizeTransfers(balances: Map<string, number>): Transfer[] {
  let sum = 0
  const creditors: Party[] = []
  const debtors: Party[] = []
  for (const [id, net] of balances) {
    sum += net
    if (net > 0) creditors.push({ id, amt: net })
    else if (net < 0) debtors.push({ id, amt: -net })
  }
  if (sum !== 0) throw new UnbalancedError(sum)

  creditors.sort(byAmountThenId)
  debtors.sort(byAmountThenId)

  const transfers: Transfer[] = []
  let i = 0
  let j = 0
  while (i < debtors.length && j < creditors.length) {
    // biome-ignore lint/style/noNonNullAssertion: guarded by loop condition, required for noUncheckedIndexedAccess
    const debtor = debtors[i]!
    // biome-ignore lint/style/noNonNullAssertion: guarded by loop condition, required for noUncheckedIndexedAccess
    const creditor = creditors[j]!
    const pay = Math.min(debtor.amt, creditor.amt)
    transfers.push({ from: debtor.id, to: creditor.id, amountMinor: pay })
    debtor.amt -= pay
    creditor.amt -= pay
    if (debtor.amt === 0) i++
    if (creditor.amt === 0) j++
  }
  return transfers
}
