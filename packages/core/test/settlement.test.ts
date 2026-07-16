import { expect, test } from "vitest"
import { UnbalancedError, minimizeTransfers } from "../src/settlement.js"

function netAfter(balances: Map<string, number>): Map<string, number> {
  const net = new Map<string, number>()
  for (const [id, v] of balances) net.set(id, v)
  for (const t of minimizeTransfers(balances)) {
    net.set(t.from, (net.get(t.from) ?? 0) + t.amountMinor)
    net.set(t.to, (net.get(t.to) ?? 0) - t.amountMinor)
  }
  return net
}

test("throws when balances do not sum to zero", () => {
  const b = new Map([
    ["a", 100],
    ["b", -50],
  ])
  expect(() => minimizeTransfers(b)).toThrow(UnbalancedError)
})

test("simple two-party settle", () => {
  const b = new Map([
    ["a", -300],
    ["b", 300],
  ])
  expect(minimizeTransfers(b)).toEqual([{ from: "a", to: "b", amountMinor: 300 }])
})

test("collapses many payments to n-1 transfers max", () => {
  // a paid a lot, b and c owe; classic 3-way
  const b = new Map([
    ["a", 600],
    ["b", -400],
    ["c", -200],
  ])
  const transfers = minimizeTransfers(b)
  expect(transfers.length).toBeLessThanOrEqual(2)
  // everyone nets to zero after settling
  for (const v of netAfter(b).values()) expect(v).toBe(0)
})

test("ignores zero-net members", () => {
  const b = new Map([
    ["a", -100],
    ["b", 0],
    ["c", 100],
  ])
  const transfers = minimizeTransfers(b)
  expect(transfers.every((t) => t.from !== "b" && t.to !== "b")).toBe(true)
})

test("deterministic output for equal-sized parties", () => {
  const b1 = new Map([
    ["a", -100],
    ["b", -100],
    ["c", 200],
  ])
  const b2 = new Map([
    ["b", -100],
    ["a", -100],
    ["c", 200],
  ])
  expect(minimizeTransfers(b1)).toEqual(minimizeTransfers(b2))
})

test("random balanced ledgers always fully settle", () => {
  const cases: Map<string, number>[] = [
    new Map([
      ["a", 50],
      ["b", 50],
      ["c", -30],
      ["d", -70],
    ]),
    new Map([
      ["a", 1],
      ["b", -1],
    ]),
    new Map([
      ["a", 333],
      ["b", 333],
      ["c", 334],
      ["d", -1000],
    ]),
  ]
  for (const b of cases) {
    for (const v of netAfter(b).values()) expect(v).toBe(0)
  }
})
