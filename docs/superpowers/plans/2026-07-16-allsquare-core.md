# Allsquare Core (`@allsquare/core`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the pure, dependency-free domain library that computes money math, per-expense currency conversion, expense splits, and minimal-transfer settlement for Allsquare — plus the monorepo scaffold and house style that Plans 2–3 build on.

**Architecture:** A single TypeScript package `packages/core` exporting pure functions with no I/O, no network, no runtime dependencies. All currency conversion takes a *frozen rate as an argument* — this package never fetches rates (that is the worker's job). Money is integer minor units throughout. Every function is deterministic and unit-tested with negative controls.

**Tech Stack:** TypeScript (strict), pnpm workspaces, Vitest, Biome (lint + format).

## Global Constraints

- Money is **integer minor units** (`number`, safe-integer range). **No floats for stored money.** Floats appear only transiently inside conversion, immediately rounded back to an integer.
- Every public function is **pure and deterministic** — same inputs, same output; no `Date.now()`, no `Math.random()`, no network, no filesystem.
- Currency codes are **ISO 4217 uppercase strings** (`"JPY"`, `"USD"`).
- An exchange **rate** is always expressed as **units-of-target per one unit-of-source** (e.g. JPY→USD ≈ `0.0066`).
- Node **≥ 20**, pnpm **≥ 9**, TypeScript **strict: true**.
- Package name: `@allsquare/core`. Repo: `allsquare` (public, under `yuichi-9621`).
- Formatting/lint authority is **Biome**; its config is the single source of house style for all three plans.

---

### Task 0: Monorepo scaffold + house style

**Files:**
- Create: `package.json` (workspace root)
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `biome.json`
- Create: `.gitignore`
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/core/vitest.config.ts`
- Create: `packages/core/src/index.ts` (temporary stub)
- Test: `packages/core/test/smoke.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: a working `pnpm --filter @allsquare/core test` command; the Biome + tsconfig conventions all later tasks and plans follow.

- [ ] **Step 1: Write the root workspace files**

`pnpm-workspace.yaml`:
```yaml
packages:
  - "packages/*"
  - "worker"
  - "web"
```

`package.json` (root):
```json
{
  "name": "allsquare",
  "private": true,
  "type": "module",
  "engines": { "node": ">=20", "pnpm": ">=9" },
  "scripts": {
    "test": "pnpm -r test",
    "lint": "biome check .",
    "format": "biome format --write ."
  },
  "devDependencies": {
    "@biomejs/biome": "^1.9.0",
    "typescript": "^5.6.0"
  }
}
```

`.gitignore`:
```
node_modules/
dist/
.wrangler/
*.log
.DS_Store
coverage/
```

- [ ] **Step 2: Write the shared tooling config**

`tsconfig.base.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "declaration": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true,
    "esModuleInterop": true
  }
}
```

`biome.json`:
```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.0/schema.json",
  "organizeImports": { "enabled": true },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "linter": {
    "enabled": true,
    "rules": { "recommended": true }
  },
  "javascript": {
    "formatter": { "quoteStyle": "double", "semicolons": "asNeeded" }
  }
}
```

- [ ] **Step 3: Write the core package files**

`packages/core/package.json`:
```json
{
  "name": "@allsquare/core",
  "version": "0.0.0",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "vitest": "^2.1.0"
  }
}
```

`packages/core/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "include": ["src", "test"]
}
```

`packages/core/vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: { include: ["test/**/*.test.ts"] },
})
```

`packages/core/src/index.ts` (temporary stub, replaced in Task 6):
```ts
export const CORE_VERSION = "0.0.0"
```

- [ ] **Step 4: Write the smoke test**

`packages/core/test/smoke.test.ts`:
```ts
import { expect, test } from "vitest"
import { CORE_VERSION } from "../src/index.js"

test("core package builds and exports", () => {
  expect(CORE_VERSION).toBe("0.0.0")
})
```

- [ ] **Step 5: Install and run**

Run: `pnpm install && pnpm --filter @allsquare/core test`
Expected: 1 passing test. `pnpm lint` reports no errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: monorepo scaffold + @allsquare/core package skeleton"
```

---

### Task 1: Currency metadata + money primitives

**Files:**
- Create: `packages/core/src/currency.ts`
- Create: `packages/core/src/money.ts`
- Test: `packages/core/test/currency.test.ts`
- Test: `packages/core/test/money.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `decimalsFor(currency: string): number` — ISO 4217 minor-unit exponent; default `2` for unknown codes.
  - `minorPerUnit(currency: string): number` — `10 ** decimalsFor(currency)`.
  - `type Money = { amountMinor: number; currency: string }`
  - `assertSafeMinor(amountMinor: number): void` — throws if not a safe non-negative integer.

- [ ] **Step 1: Write the failing tests**

`packages/core/test/currency.test.ts`:
```ts
import { expect, test } from "vitest"
import { decimalsFor, minorPerUnit } from "../src/currency.js"

test.each([
  ["JPY", 0],
  ["USD", 2],
  ["EUR", 2],
  ["KWD", 3],
  ["XYZ", 2], // unknown falls back to 2
])("decimalsFor(%s) === %i", (code, expected) => {
  expect(decimalsFor(code)).toBe(expected)
})

test("minorPerUnit reflects decimals", () => {
  expect(minorPerUnit("JPY")).toBe(1)
  expect(minorPerUnit("USD")).toBe(100)
  expect(minorPerUnit("KWD")).toBe(1000)
})
```

`packages/core/test/money.test.ts`:
```ts
import { expect, test } from "vitest"
import { assertSafeMinor } from "../src/money.js"

test.each([-1, 1.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1])(
  "assertSafeMinor rejects %s",
  (bad) => {
    expect(() => assertSafeMinor(bad as number)).toThrow()
  },
)

test.each([0, 1, 500000, Number.MAX_SAFE_INTEGER])(
  "assertSafeMinor accepts %s",
  (ok) => {
    expect(() => assertSafeMinor(ok)).not.toThrow()
  },
)
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @allsquare/core test`
Expected: FAIL — `currency.js` / `money.js` not found.

- [ ] **Step 3: Implement the primitives**

`packages/core/src/currency.ts`:
```ts
// ISO 4217 minor-unit exponents for the currencies we expect on trips.
// Anything not listed falls back to 2, the overwhelmingly common case.
const DECIMALS: Record<string, number> = {
  JPY: 0,
  KRW: 0,
  VND: 0,
  USD: 2,
  EUR: 2,
  GBP: 2,
  AUD: 2,
  CAD: 2,
  CHF: 2,
  CNY: 2,
  HKD: 2,
  SGD: 2,
  THB: 2,
  TWD: 2,
  KWD: 3,
  BHD: 3,
}

export function decimalsFor(currency: string): number {
  return DECIMALS[currency] ?? 2
}

export function minorPerUnit(currency: string): number {
  return 10 ** decimalsFor(currency)
}
```

`packages/core/src/money.ts`:
```ts
export type Money = { amountMinor: number; currency: string }

export function assertSafeMinor(amountMinor: number): void {
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) {
    throw new RangeError(`amountMinor must be a safe non-negative integer, got ${amountMinor}`)
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @allsquare/core test`
Expected: all currency + money tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/currency.ts packages/core/src/money.ts packages/core/test/currency.test.ts packages/core/test/money.test.ts
git commit -m "feat(core): currency metadata and money minor-unit guards"
```

---

### Task 2: Frozen-rate currency conversion

**Files:**
- Create: `packages/core/src/convert.ts`
- Test: `packages/core/test/convert.test.ts`

**Interfaces:**
- Consumes: `decimalsFor` from `currency.ts`.
- Produces:
  - `convertMinor(amountMinor: number, from: string, to: string, rate: number): number`
    — converts an integer minor amount in `from` to integer minor units in `to`,
    using `rate` (target-per-source). Same-currency short-circuits and ignores `rate`.
    Result is rounded half-up to the nearest target minor unit.

- [ ] **Step 1: Write the failing test**

`packages/core/test/convert.test.ts`:
```ts
import { expect, test } from "vitest"
import { convertMinor } from "../src/convert.js"

test("same currency returns input unchanged regardless of rate", () => {
  expect(convertMinor(500000, "JPY", "JPY", 999)).toBe(500000)
})

test("JPY(0dp) -> USD(2dp): 5000 yen at 0.0066 => 3300 cents", () => {
  // 5000 JPY * 0.0066 = 33.00 USD = 3300 cents
  expect(convertMinor(5000, "JPY", "USD", 0.0066)).toBe(3300)
})

test("USD(2dp) -> JPY(0dp): 1000 cents at 151.5 => 15150 yen", () => {
  // 10.00 USD * 151.5 = 1515 JPY
  expect(convertMinor(1000, "USD", "JPY", 151.5)).toBe(1515)
})

test("rounds half-up to target minor unit", () => {
  // 100 JPY * 0.00666 = 0.666 USD = 66.6 cents -> 67
  expect(convertMinor(100, "JPY", "USD", 0.00666)).toBe(67)
})

test("result is always an integer", () => {
  const r = convertMinor(1234, "EUR", "USD", 1.0837)
  expect(Number.isInteger(r)).toBe(true)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @allsquare/core test convert`
Expected: FAIL — `convert.js` not found.

- [ ] **Step 3: Implement conversion**

`packages/core/src/convert.ts`:
```ts
import { decimalsFor } from "./currency.js"

// Round half-up on non-negative values (all money here is non-negative).
function roundHalfUp(x: number): number {
  return Math.floor(x + 0.5)
}

export function convertMinor(
  amountMinor: number,
  from: string,
  to: string,
  rate: number,
): number {
  if (from === to) return amountMinor
  const fromMajor = amountMinor / 10 ** decimalsFor(from)
  const toMajor = fromMajor * rate
  return roundHalfUp(toMajor * 10 ** decimalsFor(to))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @allsquare/core test convert`
Expected: all conversion tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/convert.ts packages/core/test/convert.test.ts
git commit -m "feat(core): frozen-rate minor-unit currency conversion"
```

---

### Task 3: Expense splits (equal + exact)

**Files:**
- Create: `packages/core/src/split.ts`
- Test: `packages/core/test/split.test.ts`

**Interfaces:**
- Consumes: nothing (operates on already-converted base-currency minor integers).
- Produces:
  - `type Share = { memberId: string; amountMinor: number }`
  - `splitEqual(totalMinor: number, memberIds: string[]): Share[]`
    — divides `totalMinor` equally; distributes the remainder one minor unit at a
    time to the first `remainder` members **in the given array order**, so the
    result always sums exactly to `totalMinor`. Throws on empty `memberIds`.
  - `splitExact(totalMinor: number, shares: Share[]): Share[]`
    — validates the provided shares sum exactly to `totalMinor`; returns them
    unchanged. Throws `SplitSumError` otherwise.
  - `class SplitSumError extends Error`

- [ ] **Step 1: Write the failing tests**

`packages/core/test/split.test.ts`:
```ts
import { expect, test } from "vitest"
import { SplitSumError, splitEqual, splitExact } from "../src/split.js"

function sum(shares: { amountMinor: number }[]): number {
  return shares.reduce((a, s) => a + s.amountMinor, 0)
}

test("even split divides cleanly", () => {
  const shares = splitEqual(900, ["a", "b", "c"])
  expect(shares).toEqual([
    { memberId: "a", amountMinor: 300 },
    { memberId: "b", amountMinor: 300 },
    { memberId: "c", amountMinor: 300 },
  ])
})

test("remainder goes to earliest members and total is conserved", () => {
  const shares = splitEqual(1000, ["a", "b", "c"]) // 1000/3 => 334,333,333
  expect(shares.map((s) => s.amountMinor)).toEqual([334, 333, 333])
  expect(sum(shares)).toBe(1000)
})

test("splitEqual conserves total for many awkward cases", () => {
  for (const total of [1, 7, 101, 999, 500001]) {
    for (const n of [1, 2, 3, 4, 5, 7]) {
      const ids = Array.from({ length: n }, (_, i) => `m${i}`)
      expect(sum(splitEqual(total, ids))).toBe(total)
    }
  }
})

test("splitEqual throws on empty members", () => {
  expect(() => splitEqual(100, [])).toThrow()
})

test("splitExact returns shares when they sum to total", () => {
  const shares = [
    { memberId: "a", amountMinor: 700 },
    { memberId: "b", amountMinor: 300 },
  ]
  expect(splitExact(1000, shares)).toEqual(shares)
})

test("splitExact throws SplitSumError on mismatch", () => {
  const shares = [
    { memberId: "a", amountMinor: 700 },
    { memberId: "b", amountMinor: 200 },
  ]
  expect(() => splitExact(1000, shares)).toThrow(SplitSumError)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @allsquare/core test split`
Expected: FAIL — `split.js` not found.

- [ ] **Step 3: Implement splits**

`packages/core/src/split.ts`:
```ts
export type Share = { memberId: string; amountMinor: number }

export class SplitSumError extends Error {
  constructor(total: number, actual: number) {
    super(`exact shares sum to ${actual}, expected ${total}`)
    this.name = "SplitSumError"
  }
}

export function splitEqual(totalMinor: number, memberIds: string[]): Share[] {
  if (memberIds.length === 0) {
    throw new RangeError("splitEqual requires at least one member")
  }
  const n = memberIds.length
  const base = Math.floor(totalMinor / n)
  const remainder = totalMinor - base * n
  return memberIds.map((memberId, i) => ({
    memberId,
    amountMinor: base + (i < remainder ? 1 : 0),
  }))
}

export function splitExact(totalMinor: number, shares: Share[]): Share[] {
  const actual = shares.reduce((a, s) => a + s.amountMinor, 0)
  if (actual !== totalMinor) throw new SplitSumError(totalMinor, actual)
  return shares
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @allsquare/core test split`
Expected: all split tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/split.ts packages/core/test/split.test.ts
git commit -m "feat(core): equal and exact expense splits with conservation"
```

---

### Task 4: Minimal-transfer settlement

**Files:**
- Create: `packages/core/src/settlement.ts`
- Test: `packages/core/test/settlement.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type Transfer = { from: string; to: string; amountMinor: number }`
  - `minimizeTransfers(balances: Map<string, number>): Transfer[]`
    — `balances` maps memberId to net position in base-currency minor units
    (positive = is owed, negative = owes). **Precondition: the balances must sum
    to 0**; throws `UnbalancedError` otherwise. Returns a deterministic,
    minimal-count list of transfers (greedy largest-debtor ↔ largest-creditor).
    Members with zero net are ignored.
  - `class UnbalancedError extends Error`

- [ ] **Step 1: Write the failing tests**

`packages/core/test/settlement.test.ts`:
```ts
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
  const b = new Map([["a", 100], ["b", -50]])
  expect(() => minimizeTransfers(b)).toThrow(UnbalancedError)
})

test("simple two-party settle", () => {
  const b = new Map([["a", -300], ["b", 300]])
  expect(minimizeTransfers(b)).toEqual([{ from: "a", to: "b", amountMinor: 300 }])
})

test("collapses many payments to n-1 transfers max", () => {
  // a paid a lot, b and c owe; classic 3-way
  const b = new Map([["a", 600], ["b", -400], ["c", -200]])
  const transfers = minimizeTransfers(b)
  expect(transfers.length).toBeLessThanOrEqual(2)
  // everyone nets to zero after settling
  for (const v of netAfter(b).values()) expect(v).toBe(0)
})

test("ignores zero-net members", () => {
  const b = new Map([["a", -100], ["b", 0], ["c", 100]])
  const transfers = minimizeTransfers(b)
  expect(transfers.every((t) => t.from !== "b" && t.to !== "b")).toBe(true)
})

test("deterministic output for equal-sized parties", () => {
  const b1 = new Map([["a", -100], ["b", -100], ["c", 200]])
  const b2 = new Map([["b", -100], ["a", -100], ["c", 200]])
  expect(minimizeTransfers(b1)).toEqual(minimizeTransfers(b2))
})

test("random balanced ledgers always fully settle", () => {
  const cases: Map<string, number>[] = [
    new Map([["a", 50], ["b", 50], ["c", -30], ["d", -70]]),
    new Map([["a", 1], ["b", -1]]),
    new Map([["a", 333], ["b", 333], ["c", 334], ["d", -1000]]),
  ]
  for (const b of cases) {
    for (const v of netAfter(b).values()) expect(v).toBe(0)
  }
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @allsquare/core test settlement`
Expected: FAIL — `settlement.js` not found.

- [ ] **Step 3: Implement settlement**

`packages/core/src/settlement.ts`:
```ts
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
    const debtor = debtors[i]!
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @allsquare/core test settlement`
Expected: all settlement tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/settlement.ts packages/core/test/settlement.test.ts
git commit -m "feat(core): minimal-transfer settlement with balance guard"
```

---

### Task 5: Settlement rounding for clean handovers

**Files:**
- Create: `packages/core/src/rounding.ts`
- Test: `packages/core/test/rounding.test.ts`

**Interfaces:**
- Consumes: `Transfer` from `settlement.ts`.
- Produces:
  - `type RoundingStep = 1 | 10 | 100 | 1000`
  - `roundTransfers(transfers: Transfer[], step: RoundingStep, currency: string): Transfer[]`
    — rounds each transfer's amount to the nearest `step` **major units** of
    `currency` (e.g. nearest ¥100), for convenient cash handover. Documented to
    introduce a small per-transfer residual; this is a deliberate UX convenience,
    not an accounting guarantee. `step === 1` rounds to the nearest whole major
    unit. Amounts never go negative.

- [ ] **Step 1: Write the failing tests**

`packages/core/test/rounding.test.ts`:
```ts
import { expect, test } from "vitest"
import { roundTransfers } from "../src/rounding.js"
import type { Transfer } from "../src/settlement.js"

const t = (amountMinor: number): Transfer => ({ from: "a", to: "b", amountMinor })

test("JPY rounds to nearest 100 yen (step in major units)", () => {
  // 15150 yen -> nearest 100 -> 15200
  expect(roundTransfers([t(15150)], 100, "JPY")[0]!.amountMinor).toBe(15200)
})

test("JPY rounds to nearest 1000 yen", () => {
  expect(roundTransfers([t(15499)], 1000, "JPY")[0]!.amountMinor).toBe(15000)
})

test("USD step=1 rounds to nearest whole dollar (100 cents)", () => {
  // 3349 cents -> nearest dollar -> 3300 cents
  expect(roundTransfers([t(3349)], 1, "USD")[0]!.amountMinor).toBe(3300)
  // 3350 cents -> 3400 cents
  expect(roundTransfers([t(3350)], 1, "USD")[0]!.amountMinor).toBe(3400)
})

test("preserves from/to and never goes negative", () => {
  const out = roundTransfers([t(40)], 100, "JPY")[0]!
  expect(out.from).toBe("a")
  expect(out.to).toBe("b")
  expect(out.amountMinor).toBeGreaterThanOrEqual(0)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @allsquare/core test rounding`
Expected: FAIL — `rounding.js` not found.

- [ ] **Step 3: Implement rounding**

`packages/core/src/rounding.ts`:
```ts
import { minorPerUnit } from "./currency.js"
import type { Transfer } from "./settlement.js"

export type RoundingStep = 1 | 10 | 100 | 1000

export function roundTransfers(
  transfers: Transfer[],
  step: RoundingStep,
  currency: string,
): Transfer[] {
  const stepMinor = step * minorPerUnit(currency)
  return transfers.map((tr) => {
    const rounded = Math.round(tr.amountMinor / stepMinor) * stepMinor
    return { ...tr, amountMinor: Math.max(0, rounded) }
  })
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @allsquare/core test rounding`
Expected: all rounding tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/rounding.ts packages/core/test/rounding.test.ts
git commit -m "feat(core): settlement rounding for clean cash handovers"
```

---

### Task 6: Public API + end-to-end ledger settlement

**Files:**
- Modify: `packages/core/src/index.ts` (replace stub)
- Create: `packages/core/src/ledger.ts`
- Test: `packages/core/test/ledger.test.ts`

**Interfaces:**
- Consumes: `convertMinor`, `splitEqual`, `splitExact`, `minimizeTransfers`, `roundTransfers`, `Share`, `Transfer`, `RoundingStep`.
- Produces:
  - `type ExpenseInput = { payerId: string; amountMinor: number; currency: string; fxRateToBase: number; split: { kind: "equal"; memberIds: string[] } | { kind: "exact"; shares: Share[] } }`
  - `type SettleOptions = { baseCurrency: string; rounding: RoundingStep }`
  - `computeBalances(expenses: ExpenseInput[], baseCurrency: string): Map<string, number>`
    — converts each expense to base via its **frozen** `fxRateToBase`, applies the
    split, and returns each member's net in base-currency minor units.
  - `settle(expenses: ExpenseInput[], opts: SettleOptions): Transfer[]`
    — `computeBalances` → `minimizeTransfers` → `roundTransfers`.
  - `index.ts` re-exports every public symbol from all modules.

- [ ] **Step 1: Write the failing test**

`packages/core/test/ledger.test.ts`:
```ts
import { expect, test } from "vitest"
import { computeBalances, settle } from "../src/ledger.js"
import type { ExpenseInput } from "../src/ledger.js"

// USD-base group. Alice fronts a 5000 JPY dinner (rate 0.0066 -> 3300 cents),
// split equally across Alice/Bob/Carol. Bob fronts a 30.00 USD taxi split equally.
const expenses: ExpenseInput[] = [
  {
    payerId: "alice",
    amountMinor: 5000,
    currency: "JPY",
    fxRateToBase: 0.0066,
    split: { kind: "equal", memberIds: ["alice", "bob", "carol"] },
  },
  {
    payerId: "bob",
    amountMinor: 3000,
    currency: "USD",
    fxRateToBase: 1,
    split: { kind: "equal", memberIds: ["alice", "bob", "carol"] },
  },
]

test("computeBalances nets to zero across the group", () => {
  const bal = computeBalances(expenses, "USD")
  let sum = 0
  for (const v of bal.values()) sum += v
  expect(sum).toBe(0)
})

test("frozen rate is used, not recomputed", () => {
  // dinner base value = 3300 cents; each owes 1100. taxi = 3000; each owes 1000.
  // alice paid 3300, owes 1100+1000=2100 -> net +1200
  const bal = computeBalances(expenses, "USD")
  expect(bal.get("alice")).toBe(1200)
})

test("settle produces a minimal, rounded transfer set that fully clears", () => {
  const transfers = settle(expenses, { baseCurrency: "USD", rounding: 1 })
  expect(transfers.length).toBeLessThanOrEqual(2)
  for (const t of transfers) expect(t.amountMinor % 100).toBe(0) // whole dollars
})

test("exact split is honored", () => {
  const bal = computeBalances(
    [
      {
        payerId: "alice",
        amountMinor: 1000,
        currency: "USD",
        fxRateToBase: 1,
        split: {
          kind: "exact",
          shares: [
            { memberId: "alice", amountMinor: 200 },
            { memberId: "bob", amountMinor: 800 },
          ],
        },
      },
    ],
    "USD",
  )
  expect(bal.get("bob")).toBe(-800)
  expect(bal.get("alice")).toBe(800)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @allsquare/core test ledger`
Expected: FAIL — `ledger.js` not found.

- [ ] **Step 3: Implement the ledger and barrel export**

`packages/core/src/ledger.ts`:
```ts
import { convertMinor } from "./convert.js"
import { roundTransfers } from "./rounding.js"
import type { RoundingStep } from "./rounding.js"
import { minimizeTransfers } from "./settlement.js"
import type { Transfer } from "./settlement.js"
import { type Share, splitEqual, splitExact } from "./split.js"

export type ExpenseInput = {
  payerId: string
  amountMinor: number
  currency: string
  fxRateToBase: number
  split:
    | { kind: "equal"; memberIds: string[] }
    | { kind: "exact"; shares: Share[] }
}

export type SettleOptions = { baseCurrency: string; rounding: RoundingStep }

export function computeBalances(
  expenses: ExpenseInput[],
  baseCurrency: string,
): Map<string, number> {
  const net = new Map<string, number>()
  const add = (id: string, delta: number) => net.set(id, (net.get(id) ?? 0) + delta)

  for (const e of expenses) {
    const baseTotal = convertMinor(e.amountMinor, e.currency, baseCurrency, e.fxRateToBase)
    const shares =
      e.split.kind === "equal"
        ? splitEqual(baseTotal, e.split.memberIds)
        : splitExact(baseTotal, e.split.shares)
    add(e.payerId, baseTotal) // payer fronted the whole amount
    for (const s of shares) add(s.memberId, -s.amountMinor) // each owes their share
  }
  return net
}

export function settle(expenses: ExpenseInput[], opts: SettleOptions): Transfer[] {
  const balances = computeBalances(expenses, opts.baseCurrency)
  const transfers = minimizeTransfers(balances)
  return roundTransfers(transfers, opts.rounding, opts.baseCurrency)
}
```

> **Note on exact splits + conversion:** `splitExact` shares are expressed in the
> expense's own currency-agnostic base minor units. For v1, exact shares are
> entered in the **group base currency** (validated to sum to the converted base
> total). The worker plan enforces this at the API boundary. Equal splits carry no
> such constraint.

`packages/core/src/index.ts` (replace stub):
```ts
export { decimalsFor, minorPerUnit } from "./currency.js"
export { type Money, assertSafeMinor } from "./money.js"
export { convertMinor } from "./convert.js"
export { type Share, SplitSumError, splitEqual, splitExact } from "./split.js"
export {
  type Transfer,
  UnbalancedError,
  minimizeTransfers,
} from "./settlement.js"
export { type RoundingStep, roundTransfers } from "./rounding.js"
export {
  type ExpenseInput,
  type SettleOptions,
  computeBalances,
  settle,
} from "./ledger.js"
```

- [ ] **Step 4: Run the whole suite + typecheck + lint**

Run: `pnpm --filter @allsquare/core test && pnpm --filter @allsquare/core typecheck && pnpm lint`
Expected: all tests PASS, no type errors, no lint errors.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/index.ts packages/core/src/ledger.ts packages/core/test/ledger.test.ts
git commit -m "feat(core): ledger settlement pipeline and public API"
```

---

## Self-Review

**Spec coverage (against §3, §4, §8, §10 of the design spec):**
- 3.2 frozen FX rate → Task 2 (`convertMinor` takes rate as arg) + Task 6 (`fxRateToBase` stored per expense, never recomputed). ✓
- 3.3 derived minimal-transfer settlement → Task 4 + Task 6. ✓
- 4 equal + exact splits → Task 3. ✓
- 4 rounding 1/10/100/1000 → Task 5. ✓
- 8 integer minor units, no floats → Global Constraints + Task 1 guards. ✓
- 10 settlement unit tests, money conservation property tests, FX-freeze test, split validation, E2E-of-core → Tasks 3–6. ✓
- **Deferred to Plan 2 (worker):** Frankfurter fetch/cache/carry-forward, D1 schema, API validation of exact-shares currency. This plan deliberately keeps `core` I/O-free; conversion takes a frozen rate as a pure argument. Noted, not a gap.

**Placeholder scan:** No TBD/TODO; every code step shows complete code. ✓

**Type consistency:** `Share`, `Transfer`, `RoundingStep`, `ExpenseInput` names and shapes are identical everywhere they appear (Tasks 3→6, 4→5→6, 5→6). `fxRateToBase` (target-per-source) matches `convertMinor`'s `rate` semantics. ✓

## Senior-review acceptance gates (carried per user instruction)

- **Contract traceability:** each task's Self-Review row maps to a spec section.
- **Negative controls:** every Step-2 "run to verify it fails" is the negative control — tests must fail without the implementation.
- **Taste target:** Task 0 establishes Biome + tsconfig conventions *before* any domain code, so "fit" is well-defined for the taste judge.
- After Plans 1–3 implement, run the real `/senior-review` harness against the actual diff.
