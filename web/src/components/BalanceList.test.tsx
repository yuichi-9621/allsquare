import { render, screen } from "@testing-library/react"
import { test } from "vitest"
import type { Balance, Member } from "../lib/types"
import { BalanceList } from "./BalanceList"

const members: Member[] = [
  { id: "m1", name: "Alice", sortOrder: 0 },
  { id: "m2", name: "Bob", sortOrder: 1 },
  { id: "m3", name: "Carol", sortOrder: 2 },
]

const balances: Balance[] = [
  { memberId: "m1", netMinor: 1200 },
  { memberId: "m2", netMinor: -1200 },
  { memberId: "m3", netMinor: 0 },
]

test("labels owed / owing / settled members", () => {
  render(<BalanceList balances={balances} members={members} baseCurrency="USD" />)
  screen.getByText("Alice +$12.00")
  screen.getByText("Bob −$12.00")
  screen.getByText("Carol $0.00")
})
