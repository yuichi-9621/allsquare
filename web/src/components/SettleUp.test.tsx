import { render, screen } from "@testing-library/react"
import { test, vi } from "vitest"
import type { Member, Transfer } from "../lib/types"
import { SettleUp } from "./SettleUp"

const members: Member[] = [
  { id: "m1", name: "Alice", sortOrder: 0 },
  { id: "m2", name: "Bob", sortOrder: 1 },
]

test("renders each transfer line", () => {
  const transfers: Transfer[] = [{ from: "m2", to: "m1", amountMinor: 15150 }]
  render(
    <SettleUp transfers={transfers} members={members} baseCurrency="JPY" onMarkPaid={vi.fn()} />,
  )
  screen.getByText("Bob → Alice")
  screen.getByText("¥15,150")
})

test("shows all-square when there are no transfers", () => {
  render(<SettleUp transfers={[]} members={members} baseCurrency="USD" onMarkPaid={vi.fn()} />)
  screen.getByText("Everyone is all square.")
})

test("shows a loading state while transfers are null", () => {
  render(<SettleUp transfers={null} members={members} baseCurrency="USD" onMarkPaid={vi.fn()} />)
  screen.getByText("Calculating…")
})

test("stamps 'Not yet square' while there are pending transfers", () => {
  const transfers: Transfer[] = [{ from: "m2", to: "m1", amountMinor: 15150 }]
  render(
    <SettleUp transfers={transfers} members={members} baseCurrency="JPY" onMarkPaid={vi.fn()} />,
  )
  screen.getByText("Not yet square")
})

test("stamps 'All square' when there are no transfers", () => {
  render(<SettleUp transfers={[]} members={members} baseCurrency="USD" onMarkPaid={vi.fn()} />)
  screen.getByText("All square")
})
