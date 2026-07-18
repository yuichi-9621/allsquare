import { render, screen } from "@testing-library/react"
import { test } from "vitest"
import type { Member, Transfer } from "../lib/types"
import { SettleRow } from "./SettleRow"

const members: Member[] = [
  { id: "m1", name: "Alice", sortOrder: 0 },
  { id: "m2", name: "Bob", sortOrder: 1 },
]

test("renders the transfer as 'from -> to' plus the amount", () => {
  const transfer: Transfer = { from: "m2", to: "m1", amountMinor: 15150 }
  render(<SettleRow transfer={transfer} members={members} baseCurrency="JPY" />)
  screen.getByText("Bob → Alice")
  screen.getByText("¥15,150")
})

test("falls back to '?' for an unknown member id", () => {
  const transfer: Transfer = { from: "m9", to: "m1", amountMinor: 100 }
  render(<SettleRow transfer={transfer} members={members} baseCurrency="USD" />)
  screen.getByText("? → Alice")
})
