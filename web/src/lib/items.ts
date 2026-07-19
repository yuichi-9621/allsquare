import { splitEqualMinor } from "./money"
import type { ExpenseItem } from "./types"

// Compiles receipt items into the exact shares the settlement math already
// understands. Each item splits equally among its assignees with
// largest-remainder cent conservation (same policy as the equal split), and
// per-member amounts accumulate across items. sum(shares) === sum(items) by
// construction, which is the invariant the server enforces.
export function compileItems(items: ExpenseItem[]): { memberId: string; amountMinor: number }[] {
  const totals = new Map<string, number>()
  for (const item of items) {
    const shares = splitEqualMinor(item.amountMinor, item.memberIds.length)
    item.memberIds.forEach((memberId, i) => {
      totals.set(memberId, (totals.get(memberId) ?? 0) + (shares[i] ?? 0))
    })
  }
  return [...totals.entries()].map(([memberId, amountMinor]) => ({ memberId, amountMinor }))
}
