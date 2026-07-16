# Allsquare Worker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `worker/` package — a Cloudflare Workers + Hono + D1 HTTP API that implements every endpoint in the FROZEN API contract (`docs/superpowers/specs/api-contract.md`) exactly. It persists groups/members/expenses in D1, **freezes each expense's FX rate at entry time** (Frankfurter + carry-forward + D1 cache), and derives settlement live by delegating all money math to `@allsquare/core`.

**Architecture:** A Hono app (`src/index.ts`) mounts one router per resource (`routes/*.ts`). A thin DB layer (`src/db.ts`) is the only code that touches D1 and maps rows ⇄ wire types. `src/fx.ts` is the single FX authority: cache-first, Frankfurter-on-miss, carry-forward on non-publishing days. The worker **never** re-derives rates for stored expenses — it maps stored rows → `core.ExpenseInput` (passing the stored frozen `fxRateToBase`) and calls `core.settle` / `core.computeBalances`. All request bodies are validated with Zod; all errors use the contract's `{ error: { code, message } }` shape. Money is integer minor units everywhere; no floats for stored money.

**Tech Stack:** Cloudflare Workers, Hono (router), D1 (SQLite), Zod (validation), `@allsquare/core` (via `workspace:*`), Vitest with `@cloudflare/vitest-pool-workers` (tests run against a real simulated D1 binding), `wrangler` (dev + migrations). Node ≥ 20, pnpm ≥ 9, TypeScript strict.

## Global Constraints

- **Prerequisite:** Plan 1 (`@allsquare/core`) is complete. The repo root already has `package.json`, `pnpm-workspace.yaml` (listing `worker`), `tsconfig.base.json`, `biome.json`, and a working `packages/core`. This plan only creates files under `worker/`.
- Money is **integer minor units** (`number`, safe-integer range) in every request, response, DB column, and `core` call. **No floats for money.** The only float in the system is `fx_rate_to_base` (an exchange rate, never a monetary amount).
- Every endpoint, field name, and wire shape matches `api-contract.md` **exactly** — no renames, no shape changes. The contract is frozen; this plan implements it.
- Currency codes are **ISO 4217 uppercase 3-letter strings**. Timestamps are ISO 8601 UTC. `fxRateDate` is `YYYY-MM-DD`.
- A `slug` is an **unguessable URL-safe token**; member and expense ids are UUIDs. Both are generated server-side with Web Crypto (`crypto.getRandomValues` / `crypto.randomUUID`), which is global in Workers.
- An exchange **rate** is **target(base)-per-source(currency)** — identical to `core`'s `fxRateToBase`, so `core.convertMinor(amountMinor, currency, baseCurrency, rate)` is a direct multiply. This is the same convention Plan 1 fixed.
- The `expenses` ledger is **append-only via soft delete** (`deleted_at`); rows are never hard-deleted (preserves history + D1 Time Travel).
- Formatting/lint authority is **Biome** (root `biome.json` from Plan 1). Errors use the contract shape with correct HTTP status (400 / 404 / 409).

> **FX direction — resolved ambiguity (read before Task 2).** The task brief gave the Frankfurter URL as `?base={base}&symbols={quote}`, but `base`/`quote` are overloaded (group base currency vs. Frankfurter's quotation base). To keep the stored `fx_rate_to_base` **directly** usable by `core` (target-per-source) with **no inversion step** — the safest choice for the highest-risk feature — this plan calls Frankfurter with **`base` = the expense currency we convert FROM** and **`symbols` = the group base currency we convert TO**, then reads `rates[to]` verbatim as `fxRateToBase`. The `fx_rates` cache columns still follow design §8 (`base`, `quote`, `date`, `rate`) with `base` = group base currency (the TO), `quote` = expense currency (the FROM), `rate` = `fxRateToBase`, keyed by `(base, quote, date)`. Inversion is deliberately avoided because a silently-inverted rate is the most likely correctness trap in this subsystem.

---

### Task 0: Worker package scaffold + wrangler + D1 binding + migration + health check

**Files:**
- Create: `worker/package.json`
- Create: `worker/tsconfig.json`
- Create: `worker/wrangler.toml`
- Create: `worker/vitest.config.ts`
- Create: `worker/migrations/0001_init.sql`
- Create: `worker/src/types.ts` (wire types + `Env`)
- Create: `worker/src/index.ts` (health-only app; grown in later tasks)
- Create: `worker/test/env.d.ts`
- Create: `worker/test/apply-migrations.ts`
- Test: `worker/test/health.test.ts`

**Interfaces:**
- Consumes: `@allsquare/core` (declared as a dependency; first used in Task 6).
- Produces:
  - A deployable Hono worker with a `DB` D1 binding and a `GET /health` route.
  - The full contract wire types in `src/types.ts` (`Group`, `Member`, `Expense`, `GroupState`, `Balance`, `Transfer`, `Settlement`, `Rounding`, `SplitEqual`, `SplitExact`) plus `Env = { DB: D1Database }`.
  - The D1 schema (design §8) via `migrations/0001_init.sql`, applied to the test D1 by the Vitest setup file.
  - A working `pnpm --filter @allsquare/worker test` command.

- [ ] **Step 1: Write the package + tooling config**

`worker/package.json`:
```json
{
  "name": "@allsquare/worker",
  "version": "0.0.0",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "migrate:local": "wrangler d1 migrations apply allsquare --local",
    "migrate:remote": "wrangler d1 migrations apply allsquare --remote"
  },
  "dependencies": {
    "@allsquare/core": "workspace:*",
    "hono": "^4.6.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@cloudflare/vitest-pool-workers": "^0.5.0",
    "@cloudflare/workers-types": "^4.20241106.0",
    "vitest": "^2.1.0",
    "wrangler": "^3.90.0"
  }
}
```

`worker/tsconfig.json`:
```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "types": ["@cloudflare/workers-types"],
    "lib": ["ES2022"]
  },
  "include": ["src", "test"]
}
```

`worker/wrangler.toml`:
```toml
name = "allsquare-worker"
main = "src/index.ts"
compatibility_date = "2024-11-01"

# Provisioning note: run `pnpm --filter @allsquare/worker exec wrangler d1 create allsquare`
# once, then paste the returned database_id below (the local Vitest/miniflare D1 is
# simulated and ignores this id, so tests pass with the dummy value; a real id is only
# required before `wrangler deploy` / remote migrations).
[[d1_databases]]
binding = "DB"
database_name = "allsquare"
database_id = "00000000-0000-0000-0000-000000000000"
migrations_dir = "migrations"
```

- [ ] **Step 2: Write the D1 migration (design §8)**

`worker/migrations/0001_init.sql`:
```sql
-- Allsquare schema (design spec §8). Money is integer minor units.
-- The only float is fx_rate_to_base (an exchange rate, not a monetary amount).

CREATE TABLE groups (
  id            TEXT    PRIMARY KEY,
  slug          TEXT    NOT NULL UNIQUE,
  title         TEXT    NOT NULL,
  base_currency TEXT    NOT NULL,
  rounding      INTEGER NOT NULL,        -- 1 | 10 | 100 | 1000
  created_at    TEXT    NOT NULL
);

CREATE TABLE members (
  id         TEXT    PRIMARY KEY,
  group_id   TEXT    NOT NULL REFERENCES groups(id),
  name       TEXT    NOT NULL,
  sort_order INTEGER NOT NULL
);

CREATE TABLE expenses (
  id              TEXT    PRIMARY KEY,
  group_id        TEXT    NOT NULL REFERENCES groups(id),
  payer_member_id TEXT    NOT NULL REFERENCES members(id),
  amount_minor    INTEGER NOT NULL,      -- in `currency`, as entered
  currency        TEXT    NOT NULL,
  fx_rate_to_base REAL    NOT NULL,      -- FROZEN at entry; base-per-currency
  fx_rate_date    TEXT    NOT NULL,      -- YYYY-MM-DD (may be carried forward)
  description     TEXT    NOT NULL,
  split_type      TEXT    NOT NULL,      -- 'equal' | 'exact'
  created_at      TEXT    NOT NULL,
  deleted_at      TEXT                   -- soft delete; NULL = live
);

-- For 'exact' splits: one row per member with their exact share (base minor units).
-- For 'equal' splits: rows identify the participant subset; share_amount_minor is 0
-- (amounts are derived at compute time by @allsquare/core).
CREATE TABLE expense_shares (
  expense_id         TEXT    NOT NULL REFERENCES expenses(id),
  member_id          TEXT    NOT NULL REFERENCES members(id),
  share_amount_minor INTEGER NOT NULL
);

-- Frankfurter lookup cache. base = group base currency (convert TO),
-- quote = expense currency (convert FROM), rate = base-per-quote (= fxRateToBase),
-- date = the effective published date of the rate (design §8: keyed by quote+date).
CREATE TABLE fx_rates (
  base  TEXT NOT NULL,
  quote TEXT NOT NULL,
  date  TEXT NOT NULL,
  rate  REAL NOT NULL,
  PRIMARY KEY (base, quote, date)
);

CREATE INDEX idx_members_group ON members(group_id);
CREATE INDEX idx_expenses_group ON expenses(group_id);
CREATE INDEX idx_expense_shares_expense ON expense_shares(expense_id);
```

- [ ] **Step 3: Write the wire types + Env**

`worker/src/types.ts`:
```ts
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

export type Member = { id: string; name: string; sortOrder: number }

export type SplitEqual = { kind: "equal"; participantIds: string[] }
export type SplitExact = {
  kind: "exact"
  shares: { memberId: string; amountMinor: number }[]
}

export type Expense = {
  id: string
  payerId: string
  amountMinor: number
  currency: string
  fxRateToBase: number
  fxRateDate: string
  description: string
  split: SplitEqual | SplitExact
  createdAt: string
}

export type GroupState = { group: Group; members: Member[]; expenses: Expense[] }

export type Balance = { memberId: string; netMinor: number }
export type Transfer = { from: string; to: string; amountMinor: number }
export type Settlement = { balances: Balance[]; transfers: Transfer[] }
```

- [ ] **Step 4: Write the health-only app**

`worker/src/index.ts`:
```ts
import { Hono } from "hono"
import type { Env } from "./types.js"

const app = new Hono<{ Bindings: Env }>()

app.get("/health", (c) => c.json({ ok: true }))

export default app
```

- [ ] **Step 5: Write the Vitest → D1 test harness**

`worker/vitest.config.ts`:
```ts
import { fileURLToPath } from "node:url"
import { defineWorkersConfig, readD1Migrations } from "@cloudflare/vitest-pool-workers/config"

export default defineWorkersConfig(async () => {
  const migrationsDir = fileURLToPath(new URL("./migrations", import.meta.url))
  const migrations = await readD1Migrations(migrationsDir)
  return {
    test: {
      setupFiles: ["./test/apply-migrations.ts"],
      poolOptions: {
        workers: {
          singleWorker: true,
          isolatedStorage: true,
          wrangler: { configPath: "./wrangler.toml" },
          miniflare: {
            bindings: { TEST_MIGRATIONS: migrations },
          },
        },
      },
    },
  }
})
```

`worker/test/env.d.ts`:
```ts
declare module "cloudflare:test" {
  interface ProvidedEnv {
    DB: D1Database
    TEST_MIGRATIONS: import("@cloudflare/vitest-pool-workers/config").D1Migration[]
  }
}
```

`worker/test/apply-migrations.ts`:
```ts
import { applyD1Migrations, env } from "cloudflare:test"

// Runs once per test file, before its tests, establishing the schema baseline.
// isolatedStorage then rolls back each test's mutations, so tests stay independent.
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS)
```

- [ ] **Step 6: Write the failing health test**

`worker/test/health.test.ts`:
```ts
import { SELF } from "cloudflare:test"
import { expect, test } from "vitest"

test("GET /health returns ok", async () => {
  const res = await SELF.fetch("https://example.com/health")
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual({ ok: true })
})

test("D1 binding exists with the migrated schema", async () => {
  const { env } = await import("cloudflare:test")
  const row = await env.DB.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='groups'",
  ).first<{ name: string }>()
  expect(row?.name).toBe("groups")
})
```

- [ ] **Step 7: Install and run to confirm pass**

Run: `pnpm install && pnpm --filter @allsquare/worker test`
Expected: 2 passing tests. (`pnpm install` links `@allsquare/core` via `workspace:*` and installs Hono/Zod/Wrangler/vitest-pool-workers.)

- [ ] **Step 8: Commit**

```bash
git add worker/package.json worker/tsconfig.json worker/wrangler.toml worker/vitest.config.ts worker/migrations/0001_init.sql worker/src/types.ts worker/src/index.ts worker/test/env.d.ts worker/test/apply-migrations.ts worker/test/health.test.ts
git commit -m "chore(worker): scaffold worker package, D1 schema, health check"
```

---

### Task 1: DB helper layer + slug/id generation

**Files:**
- Create: `worker/src/ids.ts`
- Create: `worker/src/db.ts`
- Test: `worker/test/ids.test.ts`
- Test: `worker/test/db.test.ts`

**Interfaces:**
- Consumes: `Env`, wire types from `types.ts`.
- Produces:
  - `newSlug(): string` — 22-char URL-safe token from 16 random bytes.
  - `newId(): string` — `crypto.randomUUID()`.
  - `createGroup(db, input): Promise<GroupState>`
  - `getGroupRow(db, slug): Promise<GroupRow | null>`
  - `getGroupState(db, slug): Promise<GroupState | null>`
  - `addMember(db, groupId, name): Promise<Member>`
  - `memberIds(db, groupId): Promise<Set<string>>`
  - Row→wire mappers and share readers reused by later tasks.

- [ ] **Step 1: Write the failing tests**

`worker/test/ids.test.ts`:
```ts
import { expect, test } from "vitest"
import { newId, newSlug } from "../src/ids.js"

test("newSlug is url-safe and unguessably long", () => {
  const s = newSlug()
  expect(s).toMatch(/^[A-Za-z0-9_-]+$/)
  expect(s.length).toBeGreaterThanOrEqual(20)
})

test("newSlug and newId are unique across many draws", () => {
  const slugs = new Set(Array.from({ length: 1000 }, () => newSlug()))
  expect(slugs.size).toBe(1000)
  const ids = new Set(Array.from({ length: 1000 }, () => newId()))
  expect(ids.size).toBe(1000)
})

test("newId is a UUID", () => {
  expect(newId()).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
  )
})
```

`worker/test/db.test.ts`:
```ts
import { env } from "cloudflare:test"
import { expect, test } from "vitest"
import { addMember, createGroup, getGroupRow, getGroupState, memberIds } from "../src/db.js"

test("createGroup persists group + members and returns state", async () => {
  const state = await createGroup(env.DB, {
    title: "Tokyo Trip",
    baseCurrency: "USD",
    rounding: 100,
    memberNames: ["Alice", "Bob"],
  })
  expect(state.group.slug).toMatch(/^[A-Za-z0-9_-]{20,}$/)
  expect(state.group.baseCurrency).toBe("USD")
  expect(state.group.rounding).toBe(100)
  expect(state.members.map((m) => m.name)).toEqual(["Alice", "Bob"])
  expect(state.members[0]!.sortOrder).toBe(0)
  expect(state.members[1]!.sortOrder).toBe(1)
  expect(state.expenses).toEqual([])

  const reread = await getGroupState(env.DB, state.group.slug)
  expect(reread?.group.title).toBe("Tokyo Trip")
  expect(reread?.members.length).toBe(2)
})

test("getGroupState returns null for unknown slug", async () => {
  expect(await getGroupState(env.DB, "does-not-exist")).toBeNull()
})

test("addMember appends with the next sort_order and is queryable", async () => {
  const state = await createGroup(env.DB, {
    title: "T",
    baseCurrency: "EUR",
    rounding: 1,
    memberNames: ["Al"],
  })
  const group = await getGroupRow(env.DB, state.group.slug)
  const m = await addMember(env.DB, group!.id, "Zoe")
  expect(m.sortOrder).toBe(1)
  const ids = await memberIds(env.DB, group!.id)
  expect(ids.has(m.id)).toBe(true)
  expect(ids.size).toBe(2)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @allsquare/worker test ids db`
Expected: FAIL — `ids.js` / `db.js` not found.

- [ ] **Step 3: Implement id generation**

`worker/src/ids.ts`:
```ts
// URL-safe base64 (no padding) of `bytes`.
function toBase64Url(bytes: Uint8Array): string {
  let binary = ""
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

// 16 random bytes -> 22-char unguessable, URL-safe token (the group credential).
export function newSlug(): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(16)))
}

export function newId(): string {
  return crypto.randomUUID()
}
```

- [ ] **Step 4: Implement the DB layer**

`worker/src/db.ts`:
```ts
import { newId, newSlug } from "./ids.js"
import type { Expense, GroupState, Member, Rounding, SplitEqual, SplitExact } from "./types.js"

export type GroupRow = {
  id: string
  slug: string
  title: string
  base_currency: string
  rounding: number
  created_at: string
}
type MemberRow = { id: string; name: string; sort_order: number }
type ExpenseRow = {
  id: string
  payer_member_id: string
  amount_minor: number
  currency: string
  fx_rate_to_base: number
  fx_rate_date: string
  description: string
  split_type: "equal" | "exact"
  created_at: string
}
type ShareRow = { member_id: string; share_amount_minor: number }

const EXPENSE_COLS =
  "id, payer_member_id, amount_minor, currency, fx_rate_to_base, fx_rate_date, description, split_type, created_at"

function toMember(r: MemberRow): Member {
  return { id: r.id, name: r.name, sortOrder: r.sort_order }
}

async function getShares(db: D1Database, expenseId: string): Promise<ShareRow[]> {
  const { results } = await db
    .prepare(
      "SELECT member_id, share_amount_minor FROM expense_shares WHERE expense_id = ? ORDER BY rowid",
    )
    .bind(expenseId)
    .all<ShareRow>()
  return results
}

async function toExpense(db: D1Database, row: ExpenseRow): Promise<Expense> {
  const shares = await getShares(db, row.id)
  const split: SplitEqual | SplitExact =
    row.split_type === "equal"
      ? { kind: "equal", participantIds: shares.map((s) => s.member_id) }
      : {
          kind: "exact",
          shares: shares.map((s) => ({
            memberId: s.member_id,
            amountMinor: s.share_amount_minor,
          })),
        }
  return {
    id: row.id,
    payerId: row.payer_member_id,
    amountMinor: row.amount_minor,
    currency: row.currency,
    fxRateToBase: row.fx_rate_to_base,
    fxRateDate: row.fx_rate_date,
    description: row.description,
    split,
    createdAt: row.created_at,
  }
}

async function getMembers(db: D1Database, groupId: string): Promise<Member[]> {
  const { results } = await db
    .prepare("SELECT id, name, sort_order FROM members WHERE group_id = ? ORDER BY sort_order")
    .bind(groupId)
    .all<MemberRow>()
  return results.map(toMember)
}

async function getExpenses(db: D1Database, groupId: string): Promise<Expense[]> {
  const { results } = await db
    .prepare(
      `SELECT ${EXPENSE_COLS} FROM expenses WHERE group_id = ? AND deleted_at IS NULL ORDER BY created_at, id`,
    )
    .bind(groupId)
    .all<ExpenseRow>()
  const expenses: Expense[] = []
  for (const row of results) expenses.push(await toExpense(db, row))
  return expenses
}

export type CreateGroupInput = {
  title: string
  baseCurrency: string
  rounding: Rounding
  memberNames: string[]
}

export async function createGroup(db: D1Database, input: CreateGroupInput): Promise<GroupState> {
  const groupId = newId()
  const slug = newSlug()
  const createdAt = new Date().toISOString()

  const statements: D1PreparedStatement[] = [
    db
      .prepare(
        "INSERT INTO groups (id, slug, title, base_currency, rounding, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .bind(groupId, slug, input.title, input.baseCurrency, input.rounding, createdAt),
  ]
  const members: Member[] = input.memberNames.map((name, i) => {
    const id = newId()
    statements.push(
      db
        .prepare("INSERT INTO members (id, group_id, name, sort_order) VALUES (?, ?, ?, ?)")
        .bind(id, groupId, name, i),
    )
    return { id, name, sortOrder: i }
  })
  await db.batch(statements)

  return {
    group: {
      slug,
      title: input.title,
      baseCurrency: input.baseCurrency,
      rounding: input.rounding,
      createdAt,
    },
    members,
    expenses: [],
  }
}

export async function getGroupRow(db: D1Database, slug: string): Promise<GroupRow | null> {
  return await db.prepare("SELECT * FROM groups WHERE slug = ?").bind(slug).first<GroupRow>()
}

export async function getGroupState(db: D1Database, slug: string): Promise<GroupState | null> {
  const group = await getGroupRow(db, slug)
  if (!group) return null
  return {
    group: {
      slug: group.slug,
      title: group.title,
      baseCurrency: group.base_currency,
      rounding: group.rounding as Rounding,
      createdAt: group.created_at,
    },
    members: await getMembers(db, group.id),
    expenses: await getExpenses(db, group.id),
  }
}

export async function addMember(db: D1Database, groupId: string, name: string): Promise<Member> {
  const id = newId()
  const row = await db
    .prepare("SELECT COALESCE(MAX(sort_order), -1) AS max FROM members WHERE group_id = ?")
    .bind(groupId)
    .first<{ max: number }>()
  const sortOrder = (row?.max ?? -1) + 1
  await db
    .prepare("INSERT INTO members (id, group_id, name, sort_order) VALUES (?, ?, ?, ?)")
    .bind(id, groupId, name, sortOrder)
    .run()
  return { id, name, sortOrder }
}

export async function memberIds(db: D1Database, groupId: string): Promise<Set<string>> {
  const { results } = await db
    .prepare("SELECT id FROM members WHERE group_id = ?")
    .bind(groupId)
    .all<{ id: string }>()
  return new Set(results.map((r) => r.id))
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm --filter @allsquare/worker test ids db`
Expected: all id + db tests PASS.

- [ ] **Step 6: Commit**

```bash
git add worker/src/ids.ts worker/src/db.ts worker/test/ids.test.ts worker/test/db.test.ts
git commit -m "feat(worker): D1 helper layer + unguessable slug/id generation"
```

---

### Task 2: FX module — cache + Frankfurter fetch + carry-forward (mocked fetch)

**Files:**
- Create: `worker/src/fx.ts`
- Test: `worker/test/fx.test.ts`

**Interfaces:**
- Consumes: the `fx_rates` D1 table; an injectable `fetch`.
- Produces:
  - `type FrozenRate = { rate: number; rateDate: string }`
  - `type FetchLike = (input: string) => Promise<Response>`
  - `resolveRate(db, from, to, date, fetchImpl?): Promise<FrozenRate>` — same-currency short-circuits to `{ rate: 1, rateDate: date }`; else cache-first per candidate date, Frankfurter on miss, **carry-forward walk** back up to 7 days, caching the result under its effective published date. Returns `rate` = base-per-source (`fxRateToBase`) and `rateDate` = the actual published date (may precede `date`).
  - `class FxUnavailableError extends Error`

- [ ] **Step 1: Write the failing tests (mocked fetch — deterministic + offline)**

`worker/test/fx.test.ts`:
```ts
import { env } from "cloudflare:test"
import { beforeEach, expect, test, vi } from "vitest"
import { FxUnavailableError, resolveRate } from "../src/fx.js"

// Models Frankfurter: `date -> { symbol: rate }`. Missing days 404 (as ECB gaps do).
function mockFetch(byDate: Record<string, Record<string, number>>) {
  return vi.fn(async (url: string) => {
    const m = url.match(/\/v1\/(\d{4}-\d{2}-\d{2})\?base=([A-Z]{3})&symbols=([A-Z]{3})/)
    if (!m) return new Response("bad request", { status: 400 })
    const date = m[1]!
    const quote = m[3]!
    const day = byDate[date]
    if (!day || day[quote] === undefined) {
      return new Response(JSON.stringify({ message: "not found" }), { status: 404 })
    }
    return new Response(JSON.stringify({ base: m[2], date, rates: { [quote]: day[quote] } }), {
      status: 200,
      headers: { "content-type": "application/json" },
    })
  })
}

beforeEach(async () => {
  await env.DB.exec("DELETE FROM fx_rates")
})

test("same currency short-circuits to rate 1 and never fetches", async () => {
  const fetchImpl = mockFetch({})
  const r = await resolveRate(env.DB, "USD", "USD", "2026-07-16", fetchImpl)
  expect(r).toEqual({ rate: 1, rateDate: "2026-07-16" })
  expect(fetchImpl).not.toHaveBeenCalled()
})

test("fetches, returns rate + date, and caches (second call hits cache)", async () => {
  const fetchImpl = mockFetch({ "2026-07-16": { USD: 0.0066 } })
  const first = await resolveRate(env.DB, "JPY", "USD", "2026-07-16", fetchImpl)
  expect(first).toEqual({ rate: 0.0066, rateDate: "2026-07-16" })
  expect(fetchImpl).toHaveBeenCalledTimes(1)

  const second = await resolveRate(env.DB, "JPY", "USD", "2026-07-16", fetchImpl)
  expect(second).toEqual({ rate: 0.0066, rateDate: "2026-07-16" })
  expect(fetchImpl).toHaveBeenCalledTimes(1) // served from cache, no new fetch
})

test("carry-forward walks back to the last published day", async () => {
  // 2026-07-18 is a Saturday (404); 2026-07-17 Friday has a rate.
  const fetchImpl = mockFetch({ "2026-07-17": { USD: 0.0067 } })
  const r = await resolveRate(env.DB, "JPY", "USD", "2026-07-18", fetchImpl)
  expect(r).toEqual({ rate: 0.0067, rateDate: "2026-07-17" })
  expect(fetchImpl).toHaveBeenCalledTimes(2) // Saturday 404 + Friday 200

  // The walked-back rate is cached under Friday; re-requesting Saturday finds it there.
  const again = await resolveRate(env.DB, "JPY", "USD", "2026-07-18", fetchImpl)
  expect(again).toEqual({ rate: 0.0067, rateDate: "2026-07-17" })
  expect(fetchImpl).toHaveBeenCalledTimes(3) // Saturday 404 again, then Friday cache hit
})

test("throws FxUnavailableError when nothing published within the window", async () => {
  const fetchImpl = mockFetch({}) // every day 404s
  await expect(
    resolveRate(env.DB, "JPY", "USD", "2026-07-18", fetchImpl),
  ).rejects.toBeInstanceOf(FxUnavailableError)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @allsquare/worker test fx`
Expected: FAIL — `fx.js` not found.

- [ ] **Step 3: Implement the FX module**

`worker/src/fx.ts`:
```ts
export type FrozenRate = { rate: number; rateDate: string }
export type FetchLike = (input: string) => Promise<Response>

const MAX_CARRY_BACK_DAYS = 7
const FRANKFURTER = "https://api.frankfurter.dev/v1"

export class FxUnavailableError extends Error {
  constructor(from: string, to: string, date: string) {
    super(`no FX rate for ${from}->${to} within ${MAX_CARRY_BACK_DAYS} days of ${date}`)
    this.name = "FxUnavailableError"
  }
}

function shiftDate(isoDate: string, deltaDays: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + deltaDays)
  return d.toISOString().slice(0, 10)
}

// Resolve base-per-source (fxRateToBase) for `from`->`to` on `date`.
// Cache-first per candidate day; on miss fetch Frankfurter for that exact day;
// if that day has no published rate, carry forward (walk back) up to 7 days.
export async function resolveRate(
  db: D1Database,
  from: string,
  to: string,
  date: string,
  fetchImpl: FetchLike = fetch,
): Promise<FrozenRate> {
  if (from === to) return { rate: 1, rateDate: date }

  for (let i = 0; i < MAX_CARRY_BACK_DAYS; i++) {
    const candidate = shiftDate(date, -i)

    const cached = await db
      .prepare("SELECT rate FROM fx_rates WHERE base = ? AND quote = ? AND date = ?")
      .bind(to, from, candidate)
      .first<{ rate: number }>()
    if (cached) return { rate: cached.rate, rateDate: candidate }

    // Frankfurter base = the currency we convert FROM; symbols = the currency we
    // convert TO. rates[to] is then base-per-source verbatim (no inversion).
    const res = await fetchImpl(`${FRANKFURTER}/${candidate}?base=${from}&symbols=${to}`)
    if (!res.ok) continue
    const body = (await res.json()) as { date?: string; rates?: Record<string, number> }
    const rate = body.rates?.[to]
    if (rate === undefined) continue

    // Frankfurter may itself return an earlier working day for a weekend query;
    // trust its `date` as the true effective/published date and cache under it.
    const published = body.date ?? candidate
    await db
      .prepare("INSERT OR REPLACE INTO fx_rates (base, quote, date, rate) VALUES (?, ?, ?, ?)")
      .bind(to, from, published, rate)
      .run()
    return { rate, rateDate: published }
  }
  throw new FxUnavailableError(from, to, date)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @allsquare/worker test fx`
Expected: all FX tests PASS (fully offline via the injected mock).

- [ ] **Step 5: Commit**

```bash
git add worker/src/fx.ts worker/test/fx.test.ts
git commit -m "feat(worker): FX freeze module with D1 cache + Frankfurter carry-forward"
```

---

### Task 3: Groups routes (create + get state) + Zod schemas + error helpers

**Files:**
- Create: `worker/src/errors.ts`
- Create: `worker/src/schemas.ts`
- Create: `worker/src/routes/groups.ts`
- Modify: `worker/src/index.ts` (mount groups router)
- Test: `worker/test/groups.test.ts`

**Interfaces:**
- Consumes: `createGroup`, `getGroupState` (db.ts); `Env`.
- Produces:
  - `badRequest / notFound / conflict(c, message)` → contract error shape with 400/404/409.
  - Zod schemas: `createGroupSchema`, `addMemberSchema`, `expenseBodySchema`, `fxQuerySchema` (all validators for later tasks defined here once).
  - `POST /api/groups` → 201 `GroupState`; `GET /api/groups/:slug` → 200 `GroupState` / 404.

- [ ] **Step 1: Write the failing test**

`worker/test/groups.test.ts`:
```ts
import { SELF } from "cloudflare:test"
import { expect, test } from "vitest"

function post(path: string, body: unknown) {
  return SELF.fetch(`https://x${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
}

test("POST /api/groups creates a group and returns 201 GroupState", async () => {
  const res = await post("/api/groups", {
    title: "Trip",
    baseCurrency: "USD",
    rounding: 100,
    memberNames: ["Alice", "Bob"],
  })
  expect(res.status).toBe(201)
  const state = (await res.json()) as any
  expect(state.group.slug).toBeTruthy()
  expect(state.group.baseCurrency).toBe("USD")
  expect(state.group.rounding).toBe(100)
  expect(state.members.map((m: any) => m.name)).toEqual(["Alice", "Bob"])
  expect(state.expenses).toEqual([])
})

test("POST /api/groups rejects invalid body with 400 + error shape", async () => {
  const res = await post("/api/groups", {
    title: "",
    baseCurrency: "US",
    rounding: 3,
    memberNames: [],
  })
  expect(res.status).toBe(400)
  const body = (await res.json()) as any
  expect(body.error.code).toBe("bad_request")
  expect(typeof body.error.message).toBe("string")
})

test("GET /api/groups/:slug returns state; 404 for unknown", async () => {
  const created = (await (
    await post("/api/groups", {
      title: "Trip2",
      baseCurrency: "EUR",
      rounding: 1,
      memberNames: ["X"],
    })
  ).json()) as any
  const res = await SELF.fetch(`https://x/api/groups/${created.group.slug}`)
  expect(res.status).toBe(200)
  const state = (await res.json()) as any
  expect(state.group.title).toBe("Trip2")

  const missing = await SELF.fetch("https://x/api/groups/nope")
  expect(missing.status).toBe(404)
  expect(((await missing.json()) as any).error.code).toBe("not_found")
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @allsquare/worker test groups`
Expected: FAIL — `groups` router not mounted / files missing.

- [ ] **Step 3: Implement error helpers**

`worker/src/errors.ts`:
```ts
import type { Context } from "hono"

export const badRequest = (c: Context, message: string) =>
  c.json({ error: { code: "bad_request", message } }, 400)

export const notFound = (c: Context, message: string) =>
  c.json({ error: { code: "not_found", message } }, 404)

export const conflict = (c: Context, message: string) =>
  c.json({ error: { code: "conflict", message } }, 409)
```

- [ ] **Step 4: Implement Zod schemas**

`worker/src/schemas.ts`:
```ts
import { z } from "zod"

const currency = z.string().regex(/^[A-Z]{3}$/, "currency must be an ISO 4217 uppercase code")

export const roundingSchema = z.union([
  z.literal(1),
  z.literal(10),
  z.literal(100),
  z.literal(1000),
])

export const createGroupSchema = z.object({
  title: z.string().min(1),
  baseCurrency: currency,
  rounding: roundingSchema,
  memberNames: z.array(z.string().min(1)).min(1),
})

export const addMemberSchema = z.object({ name: z.string().min(1) })

const splitEqualSchema = z.object({
  kind: z.literal("equal"),
  participantIds: z.array(z.string().min(1)).min(1),
})
const splitExactSchema = z.object({
  kind: z.literal("exact"),
  shares: z
    .array(z.object({ memberId: z.string().min(1), amountMinor: z.number().int().nonnegative() }))
    .min(1),
})

export const expenseBodySchema = z.object({
  payerId: z.string().min(1),
  amountMinor: z.number().int().nonnegative(),
  currency,
  description: z.string(),
  split: z.discriminatedUnion("kind", [splitEqualSchema, splitExactSchema]),
})

export const fxQuerySchema = z.object({
  from: currency,
  to: currency,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})
```

- [ ] **Step 5: Implement the groups router**

`worker/src/routes/groups.ts`:
```ts
import { Hono } from "hono"
import { createGroup, getGroupState } from "../db.js"
import { badRequest, notFound } from "../errors.js"
import { createGroupSchema } from "../schemas.js"
import type { Env } from "../types.js"

const groups = new Hono<{ Bindings: Env }>()

groups.post("/", async (c) => {
  const parsed = createGroupSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) return badRequest(c, parsed.error.message)
  const state = await createGroup(c.env.DB, parsed.data)
  return c.json(state, 201)
})

groups.get("/:slug", async (c) => {
  const state = await getGroupState(c.env.DB, c.req.param("slug"))
  if (!state) return notFound(c, "group not found")
  return c.json(state, 200)
})

export default groups
```

- [ ] **Step 6: Mount the router**

`worker/src/index.ts` (replace):
```ts
import { Hono } from "hono"
import groups from "./routes/groups.js"
import type { Env } from "./types.js"

const app = new Hono<{ Bindings: Env }>()

app.get("/health", (c) => c.json({ ok: true }))

app.route("/api/groups", groups)

export default app
```

- [ ] **Step 7: Run test to verify it passes**

Run: `pnpm --filter @allsquare/worker test groups health`
Expected: groups + health tests PASS.

- [ ] **Step 8: Commit**

```bash
git add worker/src/errors.ts worker/src/schemas.ts worker/src/routes/groups.ts worker/src/index.ts worker/test/groups.test.ts
git commit -m "feat(worker): groups routes (create + state) with Zod validation"
```

---

### Task 4: Members route

**Files:**
- Create: `worker/src/routes/members.ts`
- Modify: `worker/src/index.ts` (mount members router)
- Test: `worker/test/members.test.ts`

**Interfaces:**
- Consumes: `getGroupRow`, `addMember` (db.ts); `addMemberSchema`.
- Produces: `POST /api/groups/:slug/members` → 201 `Member`; 404 if group unknown; 400 on invalid body.

- [ ] **Step 1: Write the failing test**

`worker/test/members.test.ts`:
```ts
import { SELF } from "cloudflare:test"
import { expect, test } from "vitest"

async function makeGroup() {
  const res = await SELF.fetch("https://x/api/groups", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: "T", baseCurrency: "USD", rounding: 1, memberNames: ["Alice"] }),
  })
  return (await res.json()) as any
}

test("POST /api/groups/:slug/members adds a member with next sortOrder", async () => {
  const g = await makeGroup()
  const res = await SELF.fetch(`https://x/api/groups/${g.group.slug}/members`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Bob" }),
  })
  expect(res.status).toBe(201)
  const member = (await res.json()) as any
  expect(member.name).toBe("Bob")
  expect(member.sortOrder).toBe(1)
  expect(typeof member.id).toBe("string")

  const state = (await (await SELF.fetch(`https://x/api/groups/${g.group.slug}`)).json()) as any
  expect(state.members.map((m: any) => m.name)).toEqual(["Alice", "Bob"])
})

test("adding a member to an unknown group is 404", async () => {
  const res = await SELF.fetch("https://x/api/groups/nope/members", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Bob" }),
  })
  expect(res.status).toBe(404)
})

test("invalid member body is 400", async () => {
  const g = await makeGroup()
  const res = await SELF.fetch(`https://x/api/groups/${g.group.slug}/members`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "" }),
  })
  expect(res.status).toBe(400)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @allsquare/worker test members`
Expected: FAIL — members router not mounted.

- [ ] **Step 3: Implement the members router**

`worker/src/routes/members.ts`:
```ts
import { Hono } from "hono"
import { addMember, getGroupRow } from "../db.js"
import { badRequest, notFound } from "../errors.js"
import { addMemberSchema } from "../schemas.js"
import type { Env } from "../types.js"

const members = new Hono<{ Bindings: Env }>()

members.post("/:slug/members", async (c) => {
  const group = await getGroupRow(c.env.DB, c.req.param("slug"))
  if (!group) return notFound(c, "group not found")
  const parsed = addMemberSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) return badRequest(c, parsed.error.message)
  const member = await addMember(c.env.DB, group.id, parsed.data.name)
  return c.json(member, 201)
})

export default members
```

- [ ] **Step 4: Mount the router**

`worker/src/index.ts` (replace):
```ts
import { Hono } from "hono"
import groups from "./routes/groups.js"
import members from "./routes/members.js"
import type { Env } from "./types.js"

const app = new Hono<{ Bindings: Env }>()

app.get("/health", (c) => c.json({ ok: true }))

app.route("/api/groups", groups)
app.route("/api/groups", members)

export default app
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @allsquare/worker test members groups`
Expected: members + groups tests PASS.

- [ ] **Step 6: Commit**

```bash
git add worker/src/routes/members.ts worker/src/index.ts worker/test/members.test.ts
git commit -m "feat(worker): add-member route"
```

---

### Task 5: Expenses routes (create with FX freeze, patch, soft delete) + exact-split validation

**Files:**
- Modify: `worker/src/db.ts` (expense write helpers)
- Create: `worker/src/routes/expenses.ts`
- Modify: `worker/src/index.ts` (mount expenses router)
- Test: `worker/test/expenses.test.ts`

**Interfaces:**
- Consumes: `getGroupRow`, `memberIds` (db.ts); `resolveRate` (fx.ts); `convertMinor` (`@allsquare/core`); `expenseBodySchema`.
- Produces (db.ts additions):
  - `getExpenseRow(db, groupId, id): Promise<ExpenseRow | null>` (non-deleted, group-scoped)
  - `insertExpense(db, input): Promise<Expense>`
  - `updateExpense(db, input): Promise<Expense>`
  - `softDeleteExpense(db, groupId, id): Promise<boolean>`
  - `expenseToWire(db, groupId, id): Promise<Expense | null>`
- Produces (routes): `POST /api/groups/:slug/expenses` (201 `Expense`; 400 on bad member id or exact-sum mismatch; 404 unknown group), `PATCH .../:id` (200; re-freeze FX only if currency changed; 404 if not in group), `DELETE .../:id` (204).

- [ ] **Step 1: Write the failing test**

`worker/test/expenses.test.ts`:
```ts
import { SELF, env } from "cloudflare:test"
import { expect, test } from "vitest"

const today = new Date().toISOString().slice(0, 10)

async function makeGroup() {
  const res = await SELF.fetch("https://x/api/groups", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      title: "Trip",
      baseCurrency: "USD",
      rounding: 1,
      memberNames: ["Alice", "Bob", "Carol"],
    }),
  })
  return (await res.json()) as any
}

// Seed the FX cache so resolveRate never touches the network in route tests.
async function seedRate(from: string, to: string, rate: number) {
  await env.DB.prepare(
    "INSERT OR REPLACE INTO fx_rates (base, quote, date, rate) VALUES (?, ?, ?, ?)",
  )
    .bind(to, from, today, rate)
    .run()
}

function postExpense(slug: string, body: unknown) {
  return SELF.fetch(`https://x/api/groups/${slug}/expenses`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
}

test("POST expense freezes the FX rate and stores the expense", async () => {
  const g = await makeGroup()
  await seedRate("JPY", "USD", 0.0066)
  const [alice, bob, carol] = g.members.map((m: any) => m.id)

  const res = await postExpense(g.group.slug, {
    payerId: alice,
    amountMinor: 5000,
    currency: "JPY",
    description: "Dinner",
    split: { kind: "equal", participantIds: [alice, bob, carol] },
  })
  expect(res.status).toBe(201)
  const e = (await res.json()) as any
  expect(e.fxRateToBase).toBe(0.0066)
  expect(e.fxRateDate).toBe(today)
  expect(e.amountMinor).toBe(5000)
  expect(e.currency).toBe("JPY")
  expect(e.split).toEqual({ kind: "equal", participantIds: [alice, bob, carol] })
})

test("exact split must sum to the converted base total", async () => {
  const g = await makeGroup()
  await seedRate("JPY", "USD", 0.0066)
  const [alice, bob] = g.members.map((m: any) => m.id)
  // 5000 JPY * 0.0066 = 33.00 USD = 3300 cents; shares must sum to 3300.
  const bad = await postExpense(g.group.slug, {
    payerId: alice,
    amountMinor: 5000,
    currency: "JPY",
    description: "Dinner",
    split: {
      kind: "exact",
      shares: [
        { memberId: alice, amountMinor: 1000 },
        { memberId: bob, amountMinor: 1000 },
      ],
    },
  })
  expect(bad.status).toBe(400)

  const good = await postExpense(g.group.slug, {
    payerId: alice,
    amountMinor: 5000,
    currency: "JPY",
    description: "Dinner",
    split: {
      kind: "exact",
      shares: [
        { memberId: alice, amountMinor: 1300 },
        { memberId: bob, amountMinor: 2000 },
      ],
    },
  })
  expect(good.status).toBe(201)
})

test("unknown payer id is rejected 400", async () => {
  const g = await makeGroup()
  await seedRate("JPY", "USD", 0.0066)
  const res = await postExpense(g.group.slug, {
    payerId: "ghost",
    amountMinor: 5000,
    currency: "JPY",
    description: "x",
    split: { kind: "equal", participantIds: g.members.map((m: any) => m.id) },
  })
  expect(res.status).toBe(400)
})

test("PATCH keeps original frozen rate when currency unchanged; DELETE soft-deletes", async () => {
  const g = await makeGroup()
  await seedRate("JPY", "USD", 0.0066)
  const [alice, bob, carol] = g.members.map((m: any) => m.id)
  const created = (await (
    await postExpense(g.group.slug, {
      payerId: alice,
      amountMinor: 5000,
      currency: "JPY",
      description: "Dinner",
      split: { kind: "equal", participantIds: [alice, bob, carol] },
    })
  ).json()) as any

  // No cache reseed: PATCH must reuse the stored 0.0066 because currency is unchanged.
  const patched = (await (
    await SELF.fetch(`https://x/api/groups/${g.group.slug}/expenses/${created.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        payerId: alice,
        amountMinor: 8000,
        currency: "JPY",
        description: "Dinner + drinks",
        split: { kind: "equal", participantIds: [alice, bob, carol] },
      }),
    })
  ).json()) as any
  expect(patched.fxRateToBase).toBe(0.0066)
  expect(patched.amountMinor).toBe(8000)
  expect(patched.description).toBe("Dinner + drinks")

  const del = await SELF.fetch(`https://x/api/groups/${g.group.slug}/expenses/${created.id}`, {
    method: "DELETE",
  })
  expect(del.status).toBe(204)

  const state = (await (await SELF.fetch(`https://x/api/groups/${g.group.slug}`)).json()) as any
  expect(state.expenses.length).toBe(0)

  const missing = await SELF.fetch(`https://x/api/groups/${g.group.slug}/expenses/${created.id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      payerId: alice,
      amountMinor: 100,
      currency: "USD",
      description: "x",
      split: { kind: "equal", participantIds: [alice] },
    }),
  })
  expect(missing.status).toBe(404)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @allsquare/worker test expenses`
Expected: FAIL — expenses router + db write helpers missing.

- [ ] **Step 3: Add expense write helpers to db.ts**

Append to `worker/src/db.ts`:
```ts
export type WriteExpenseInput = {
  groupId: string
  payerId: string
  amountMinor: number
  currency: string
  fxRateToBase: number
  fxRateDate: string
  description: string
  splitType: "equal" | "exact"
  shareRows: { memberId: string; amountMinor: number }[]
}

export async function getExpenseRow(
  db: D1Database,
  groupId: string,
  id: string,
): Promise<ExpenseRow | null> {
  return await db
    .prepare(
      `SELECT ${EXPENSE_COLS} FROM expenses WHERE id = ? AND group_id = ? AND deleted_at IS NULL`,
    )
    .bind(id, groupId)
    .first<ExpenseRow>()
}

export async function expenseToWire(
  db: D1Database,
  groupId: string,
  id: string,
): Promise<Expense | null> {
  const row = await getExpenseRow(db, groupId, id)
  return row ? await toExpense(db, row) : null
}

function shareStatements(
  db: D1Database,
  expenseId: string,
  shareRows: { memberId: string; amountMinor: number }[],
): D1PreparedStatement[] {
  return shareRows.map((s) =>
    db
      .prepare(
        "INSERT INTO expense_shares (expense_id, member_id, share_amount_minor) VALUES (?, ?, ?)",
      )
      .bind(expenseId, s.memberId, s.amountMinor),
  )
}

export async function insertExpense(db: D1Database, input: WriteExpenseInput): Promise<Expense> {
  const id = newId()
  const createdAt = new Date().toISOString()
  const statements: D1PreparedStatement[] = [
    db
      .prepare(
        "INSERT INTO expenses (id, group_id, payer_member_id, amount_minor, currency, fx_rate_to_base, fx_rate_date, description, split_type, created_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)",
      )
      .bind(
        id,
        input.groupId,
        input.payerId,
        input.amountMinor,
        input.currency,
        input.fxRateToBase,
        input.fxRateDate,
        input.description,
        input.splitType,
        createdAt,
      ),
    ...shareStatements(db, id, input.shareRows),
  ]
  await db.batch(statements)
  return (await expenseToWire(db, input.groupId, id))!
}

export async function updateExpense(
  db: D1Database,
  id: string,
  input: WriteExpenseInput,
): Promise<Expense> {
  const statements: D1PreparedStatement[] = [
    db
      .prepare(
        "UPDATE expenses SET payer_member_id = ?, amount_minor = ?, currency = ?, fx_rate_to_base = ?, fx_rate_date = ?, description = ?, split_type = ? WHERE id = ? AND group_id = ?",
      )
      .bind(
        input.payerId,
        input.amountMinor,
        input.currency,
        input.fxRateToBase,
        input.fxRateDate,
        input.description,
        input.splitType,
        id,
        input.groupId,
      ),
    db.prepare("DELETE FROM expense_shares WHERE expense_id = ?").bind(id),
    ...shareStatements(db, id, input.shareRows),
  ]
  await db.batch(statements)
  return (await expenseToWire(db, input.groupId, id))!
}

export async function softDeleteExpense(
  db: D1Database,
  groupId: string,
  id: string,
): Promise<boolean> {
  const res = await db
    .prepare(
      "UPDATE expenses SET deleted_at = ? WHERE id = ? AND group_id = ? AND deleted_at IS NULL",
    )
    .bind(new Date().toISOString(), id, groupId)
    .run()
  return (res.meta.changes ?? 0) > 0
}
```

- [ ] **Step 4: Implement the expenses router**

`worker/src/routes/expenses.ts`:
```ts
import { convertMinor } from "@allsquare/core"
import { Hono } from "hono"
import type { z } from "zod"
import {
  getExpenseRow,
  getGroupRow,
  insertExpense,
  memberIds,
  softDeleteExpense,
  updateExpense,
  type WriteExpenseInput,
} from "../db.js"
import { badRequest, notFound } from "../errors.js"
import { resolveRate } from "../fx.js"
import { expenseBodySchema } from "../schemas.js"
import type { Env } from "../types.js"

const expenses = new Hono<{ Bindings: Env }>()

const today = () => new Date().toISOString().slice(0, 10)
type ExpenseBody = z.infer<typeof expenseBodySchema>
type Frozen = { fxRateToBase: number; fxRateDate: string }

type Prepared =
  | { ok: true; splitType: "equal" | "exact"; shareRows: { memberId: string; amountMinor: number }[] }
  | { ok: false; message: string }

// Validate members + (for exact splits) that shares sum to the converted base total.
async function prepareShares(
  db: D1Database,
  groupId: string,
  baseCurrency: string,
  body: ExpenseBody,
  frozen: Frozen,
): Promise<Prepared> {
  const ids = await memberIds(db, groupId)
  if (!ids.has(body.payerId)) return { ok: false, message: `payerId ${body.payerId} is not a member` }

  if (body.split.kind === "equal") {
    for (const id of body.split.participantIds) {
      if (!ids.has(id)) return { ok: false, message: `participant ${id} is not a member` }
    }
    return {
      ok: true,
      splitType: "equal",
      shareRows: body.split.participantIds.map((memberId) => ({ memberId, amountMinor: 0 })),
    }
  }

  const baseTotal = convertMinor(body.amountMinor, body.currency, baseCurrency, frozen.fxRateToBase)
  let sum = 0
  for (const s of body.split.shares) {
    if (!ids.has(s.memberId)) return { ok: false, message: `share member ${s.memberId} is not a member` }
    sum += s.amountMinor
  }
  if (sum !== baseTotal) {
    return { ok: false, message: `exact shares sum to ${sum}, expected converted base total ${baseTotal}` }
  }
  return {
    ok: true,
    splitType: "exact",
    shareRows: body.split.shares.map((s) => ({ memberId: s.memberId, amountMinor: s.amountMinor })),
  }
}

expenses.post("/:slug/expenses", async (c) => {
  const group = await getGroupRow(c.env.DB, c.req.param("slug"))
  if (!group) return notFound(c, "group not found")
  const parsed = expenseBodySchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) return badRequest(c, parsed.error.message)
  const body = parsed.data

  const r = await resolveRate(c.env.DB, body.currency, group.base_currency, today())
  const frozen: Frozen = { fxRateToBase: r.rate, fxRateDate: r.rateDate }

  const prepared = await prepareShares(c.env.DB, group.id, group.base_currency, body, frozen)
  if (!prepared.ok) return badRequest(c, prepared.message)

  const input: WriteExpenseInput = {
    groupId: group.id,
    payerId: body.payerId,
    amountMinor: body.amountMinor,
    currency: body.currency,
    fxRateToBase: frozen.fxRateToBase,
    fxRateDate: frozen.fxRateDate,
    description: body.description,
    splitType: prepared.splitType,
    shareRows: prepared.shareRows,
  }
  return c.json(await insertExpense(c.env.DB, input), 201)
})

expenses.patch("/:slug/expenses/:id", async (c) => {
  const group = await getGroupRow(c.env.DB, c.req.param("slug"))
  if (!group) return notFound(c, "group not found")
  const existing = await getExpenseRow(c.env.DB, group.id, c.req.param("id"))
  if (!existing) return notFound(c, "expense not found")
  const parsed = expenseBodySchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) return badRequest(c, parsed.error.message)
  const body = parsed.data

  // Re-freeze the FX rate only if the currency changed; otherwise keep the original.
  let frozen: Frozen
  if (body.currency === existing.currency) {
    frozen = { fxRateToBase: existing.fx_rate_to_base, fxRateDate: existing.fx_rate_date }
  } else {
    const r = await resolveRate(c.env.DB, body.currency, group.base_currency, today())
    frozen = { fxRateToBase: r.rate, fxRateDate: r.rateDate }
  }

  const prepared = await prepareShares(c.env.DB, group.id, group.base_currency, body, frozen)
  if (!prepared.ok) return badRequest(c, prepared.message)

  const input: WriteExpenseInput = {
    groupId: group.id,
    payerId: body.payerId,
    amountMinor: body.amountMinor,
    currency: body.currency,
    fxRateToBase: frozen.fxRateToBase,
    fxRateDate: frozen.fxRateDate,
    description: body.description,
    splitType: prepared.splitType,
    shareRows: prepared.shareRows,
  }
  return c.json(await updateExpense(c.env.DB, existing.id, input), 200)
})

expenses.delete("/:slug/expenses/:id", async (c) => {
  const group = await getGroupRow(c.env.DB, c.req.param("slug"))
  if (!group) return notFound(c, "group not found")
  const deleted = await softDeleteExpense(c.env.DB, group.id, c.req.param("id"))
  if (!deleted) return notFound(c, "expense not found")
  return c.body(null, 204)
})

export default expenses
```

- [ ] **Step 5: Mount the router**

`worker/src/index.ts` (replace):
```ts
import { Hono } from "hono"
import expenses from "./routes/expenses.js"
import groups from "./routes/groups.js"
import members from "./routes/members.js"
import type { Env } from "./types.js"

const app = new Hono<{ Bindings: Env }>()

app.get("/health", (c) => c.json({ ok: true }))

app.route("/api/groups", groups)
app.route("/api/groups", members)
app.route("/api/groups", expenses)

export default app
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm --filter @allsquare/worker test expenses`
Expected: all expense tests PASS.

- [ ] **Step 7: Commit**

```bash
git add worker/src/db.ts worker/src/routes/expenses.ts worker/src/index.ts worker/test/expenses.test.ts
git commit -m "feat(worker): expenses routes with FX freeze + exact-split validation"
```

---

### Task 6: Settlement route (wires `@allsquare/core`)

**Files:**
- Create: `worker/src/routes/settlement.ts`
- Modify: `worker/src/index.ts` (mount settlement router)
- Test: `worker/test/settlement.test.ts`

**Interfaces:**
- Consumes: `getGroupState` (db.ts); `computeBalances`, `settle`, `ExpenseInput`, `RoundingStep` (`@allsquare/core`).
- Produces: `GET /api/groups/:slug/settlement?rounding=<1|10|100|1000>` → 200 `Settlement` (balances include every member, even zero-net; transfers from `core.settle` using the requested-or-default rounding); 404 if slug unknown. Maps stored expenses → `core.ExpenseInput` using the **stored frozen** `fxRateToBase` (never re-fetches rates).

- [ ] **Step 1: Write the failing test**

`worker/test/settlement.test.ts`:
```ts
import { SELF, env } from "cloudflare:test"
import { expect, test } from "vitest"

const today = new Date().toISOString().slice(0, 10)

async function seedRate(from: string, to: string, rate: number) {
  await env.DB.prepare(
    "INSERT OR REPLACE INTO fx_rates (base, quote, date, rate) VALUES (?, ?, ?, ?)",
  )
    .bind(to, from, today, rate)
    .run()
}

async function makeGroup(memberNames: string[], rounding = 1) {
  const res = await SELF.fetch("https://x/api/groups", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: "T", baseCurrency: "USD", rounding, memberNames }),
  })
  return (await res.json()) as any
}

function postExpense(slug: string, body: unknown) {
  return SELF.fetch(`https://x/api/groups/${slug}/expenses`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
}

test("settlement nets to zero, returns minimal transfers, uses frozen rate", async () => {
  await seedRate("JPY", "USD", 0.0066)
  const g = await makeGroup(["Alice", "Bob", "Carol"])
  const [alice, bob, carol] = g.members.map((m: any) => m.id)

  // Alice fronts 5000 JPY dinner (=> 3300 cents) split 3 ways.
  await postExpense(g.group.slug, {
    payerId: alice,
    amountMinor: 5000,
    currency: "JPY",
    description: "Dinner",
    split: { kind: "equal", participantIds: [alice, bob, carol] },
  })
  // Bob fronts 30.00 USD taxi split 3 ways.
  await postExpense(g.group.slug, {
    payerId: bob,
    amountMinor: 3000,
    currency: "USD",
    description: "Taxi",
    split: { kind: "equal", participantIds: [alice, bob, carol] },
  })

  const res = await SELF.fetch(`https://x/api/groups/${g.group.slug}/settlement`)
  expect(res.status).toBe(200)
  const s = (await res.json()) as any
  const sum = s.balances.reduce((a: number, b: any) => a + b.netMinor, 0)
  expect(sum).toBe(0)
  // Alice paid 3300, owes 1100 + 1000 = 2100 => net +1200.
  expect(s.balances.find((b: any) => b.memberId === alice).netMinor).toBe(1200)
  expect(s.balances.length).toBe(3)
  expect(s.transfers.length).toBeLessThanOrEqual(2)
})

test("rounding query param overrides the group default", async () => {
  const g = await makeGroup(["Alice", "Bob"], 1)
  const [alice, bob] = g.members.map((m: any) => m.id)
  await postExpense(g.group.slug, {
    payerId: alice,
    amountMinor: 1050,
    currency: "USD",
    description: "x",
    split: { kind: "equal", participantIds: [alice, bob] },
  })
  // Bob owes 525 cents. rounding=1 (whole dollar) => round to nearest 100 => 500.
  const res = await SELF.fetch(`https://x/api/groups/${g.group.slug}/settlement?rounding=1`)
  const s = (await res.json()) as any
  expect(s.transfers[0].amountMinor).toBe(500)
})

test("404 for unknown group settlement", async () => {
  const res = await SELF.fetch("https://x/api/groups/nope/settlement")
  expect(res.status).toBe(404)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @allsquare/worker test settlement`
Expected: FAIL — settlement router not mounted.

- [ ] **Step 3: Implement the settlement router**

`worker/src/routes/settlement.ts`:
```ts
import { computeBalances, settle } from "@allsquare/core"
import type { ExpenseInput, RoundingStep } from "@allsquare/core"
import { Hono } from "hono"
import { getGroupState } from "../db.js"
import { notFound } from "../errors.js"
import type { Balance, Env, Expense, Settlement } from "../types.js"

const settlement = new Hono<{ Bindings: Env }>()

const VALID_ROUNDING = new Set<number>([1, 10, 100, 1000])

// Map a stored wire Expense -> core.ExpenseInput. The wire `participantIds`
// becomes core's `memberIds`; the frozen fxRateToBase is passed through verbatim.
function toInput(e: Expense): ExpenseInput {
  return {
    payerId: e.payerId,
    amountMinor: e.amountMinor,
    currency: e.currency,
    fxRateToBase: e.fxRateToBase,
    split:
      e.split.kind === "equal"
        ? { kind: "equal", memberIds: e.split.participantIds }
        : { kind: "exact", shares: e.split.shares },
  }
}

settlement.get("/:slug/settlement", async (c) => {
  const state = await getGroupState(c.env.DB, c.req.param("slug"))
  if (!state) return notFound(c, "group not found")

  const q = Number(c.req.query("rounding"))
  const rounding = (VALID_ROUNDING.has(q) ? q : state.group.rounding) as RoundingStep

  const inputs = state.expenses.map(toInput)
  const netMap = computeBalances(inputs, state.group.baseCurrency)
  const transfers = settle(inputs, { baseCurrency: state.group.baseCurrency, rounding })

  const balances: Balance[] = state.members.map((m) => ({
    memberId: m.id,
    netMinor: netMap.get(m.id) ?? 0,
  }))

  const body: Settlement = { balances, transfers }
  return c.json(body, 200)
})

export default settlement
```

- [ ] **Step 4: Mount the router**

`worker/src/index.ts` (replace):
```ts
import { Hono } from "hono"
import expenses from "./routes/expenses.js"
import groups from "./routes/groups.js"
import members from "./routes/members.js"
import settlement from "./routes/settlement.js"
import type { Env } from "./types.js"

const app = new Hono<{ Bindings: Env }>()

app.get("/health", (c) => c.json({ ok: true }))

app.route("/api/groups", groups)
app.route("/api/groups", members)
app.route("/api/groups", expenses)
app.route("/api/groups", settlement)

export default app
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @allsquare/worker test settlement`
Expected: all settlement tests PASS.

- [ ] **Step 6: Commit**

```bash
git add worker/src/routes/settlement.ts worker/src/index.ts worker/test/settlement.test.ts
git commit -m "feat(worker): settlement route wiring @allsquare/core"
```

---

### Task 7: FX preview route + CORS + final app assembly

**Files:**
- Create: `worker/src/routes/fx.ts`
- Modify: `worker/src/index.ts` (add CORS middleware + mount fx route)
- Test: `worker/test/fx-route.test.ts`

**Interfaces:**
- Consumes: `resolveRate` (fx.ts); `fxQuerySchema`; `cors` (`hono/cors`).
- Produces: `GET /api/fx?from=<CUR>&to=<CUR>&date=<YYYY-MM-DD>` → 200 `{ rate, rateDate }` (400 on invalid query); permissive CORS on all responses (web app is a separate Cloudflare Pages origin).

- [ ] **Step 1: Write the failing test**

`worker/test/fx-route.test.ts`:
```ts
import { SELF, env } from "cloudflare:test"
import { expect, test } from "vitest"

async function seedRate(base: string, quote: string, date: string, rate: number) {
  await env.DB.prepare(
    "INSERT OR REPLACE INTO fx_rates (base, quote, date, rate) VALUES (?, ?, ?, ?)",
  )
    .bind(base, quote, date, rate)
    .run()
}

test("GET /api/fx returns the cached frozen rate + date", async () => {
  // base = to (USD), quote = from (JPY).
  await seedRate("USD", "JPY", "2026-07-16", 0.0066)
  const res = await SELF.fetch("https://x/api/fx?from=JPY&to=USD&date=2026-07-16")
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual({ rate: 0.0066, rateDate: "2026-07-16" })
})

test("same-currency preview returns rate 1 with no cache", async () => {
  const res = await SELF.fetch("https://x/api/fx?from=USD&to=USD&date=2026-07-16")
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual({ rate: 1, rateDate: "2026-07-16" })
})

test("invalid query is 400", async () => {
  const res = await SELF.fetch("https://x/api/fx?from=JP&to=USD&date=bad")
  expect(res.status).toBe(400)
})

test("CORS: preflight is answered and responses are cross-origin", async () => {
  const preflight = await SELF.fetch("https://x/api/fx?from=USD&to=USD&date=2026-07-16", {
    method: "OPTIONS",
    headers: {
      origin: "https://allsquare.pages.dev",
      "access-control-request-method": "GET",
    },
  })
  expect(preflight.headers.get("access-control-allow-origin")).toBe("*")

  const res = await SELF.fetch("https://x/api/fx?from=USD&to=USD&date=2026-07-16")
  expect(res.headers.get("access-control-allow-origin")).toBe("*")
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @allsquare/worker test fx-route`
Expected: FAIL — fx route not mounted / CORS absent.

- [ ] **Step 3: Implement the FX preview route**

`worker/src/routes/fx.ts`:
```ts
import { Hono } from "hono"
import { badRequest } from "../errors.js"
import { resolveRate } from "../fx.js"
import { fxQuerySchema } from "../schemas.js"
import type { Env } from "../types.js"

const fxRoute = new Hono<{ Bindings: Env }>()

fxRoute.get("/", async (c) => {
  const parsed = fxQuerySchema.safeParse({
    from: c.req.query("from"),
    to: c.req.query("to"),
    date: c.req.query("date"),
  })
  if (!parsed.success) return badRequest(c, parsed.error.message)
  const { from, to, date } = parsed.data
  const { rate, rateDate } = await resolveRate(c.env.DB, from, to, date)
  return c.json({ rate, rateDate }, 200)
})

export default fxRoute
```

- [ ] **Step 4: Final app assembly with CORS**

`worker/src/index.ts` (replace):
```ts
import { Hono } from "hono"
import { cors } from "hono/cors"
import expenses from "./routes/expenses.js"
import fxRoute from "./routes/fx.js"
import groups from "./routes/groups.js"
import members from "./routes/members.js"
import settlement from "./routes/settlement.js"
import type { Env } from "./types.js"

const app = new Hono<{ Bindings: Env }>()

// The web app is served from a different origin (Cloudflare Pages); allow all.
app.use("*", cors())

app.get("/health", (c) => c.json({ ok: true }))

app.route("/api/groups", groups)
app.route("/api/groups", members)
app.route("/api/groups", expenses)
app.route("/api/groups", settlement)
app.route("/api/fx", fxRoute)

export default app
```

- [ ] **Step 5: Run the full suite + typecheck + lint**

Run: `pnpm --filter @allsquare/worker test && pnpm --filter @allsquare/worker typecheck && pnpm lint`
Expected: every test PASSES (health, ids, db, fx, groups, members, expenses, settlement, fx-route), no type errors, no lint errors.

- [ ] **Step 6: Commit**

```bash
git add worker/src/routes/fx.ts worker/src/index.ts worker/test/fx-route.test.ts
git commit -m "feat(worker): FX preview route + permissive CORS + final app assembly"
```

---

## Self-Review

**API-contract endpoint coverage (every endpoint maps to a task + a passing test):**

| Endpoint | Task | Test |
|----------|------|------|
| `POST /api/groups` | 3 | `groups.test.ts` |
| `GET /api/groups/:slug` (polling endpoint) | 3 | `groups.test.ts` |
| `POST /api/groups/:slug/members` | 4 | `members.test.ts` |
| `POST /api/groups/:slug/expenses` (FX freeze) | 5 | `expenses.test.ts` |
| `PATCH /api/groups/:slug/expenses/:id` (re-freeze only on currency change) | 5 | `expenses.test.ts` |
| `DELETE /api/groups/:slug/expenses/:id` (soft delete) | 5 | `expenses.test.ts` |
| `GET /api/groups/:slug/settlement?rounding=` | 6 | `settlement.test.ts` |
| `GET /api/fx?from=&to=&date=` | 7 | `fx-route.test.ts` |

**Design-spec requirement coverage:**
- §3.1 link-is-credential (unguessable slug grants read+write) → Task 1 (`newSlug`, 16-byte token). ✓
- §3.2 per-expense frozen FX + Frankfurter + carry-forward + never recomputed → Task 2 (`fx.ts`) + Task 5 (freeze at create, keep on unchanged-currency patch) + Task 6 (settlement passes stored `fxRateToBase`). ✓
- §3.3 settlement derived, never stored → Task 6 (no balance columns; computed live from the append-only log via `core`). ✓
- §4 equal + exact splits; exact must sum to total → Task 5 (`prepareShares` validates against converted base total). ✓
- §4 rounding 1/10/100/1000 with per-request preview override → Task 6 (`?rounding=` overrides group default). ✓
- §4 edit/delete with append-only soft delete → Task 5 (`deleted_at`, row retained). ✓
- §8 data model (`groups`, `members`, `expenses` with `deleted_at`/`fx_rate_to_base`/`fx_rate_date`/`split_type`, `expense_shares`, `fx_rates`) → Task 0 (`0001_init.sql`). ✓
- §9 add-expense flow (cache → Frankfurter → carry-forward → store frozen rate+date) → Task 2 + Task 5. ✓
- Integer minor units, no floats for money → Global Constraints + Zod `.int()` on `amountMinor` + integer DB columns; only `fx_rate_to_base` is `REAL`. ✓
- CORS for a separate Pages origin → Task 7. ✓

**Placeholder scan:** No TBD/TODO in any code step; every step shows complete TypeScript / SQL / TOML / test code. The single non-literal is `wrangler.toml`'s `database_id` — a real provisioning value obtained via `wrangler d1 create` (documented inline); the simulated test D1 ignores it, so the suite runs green with the dummy id. Not a logic placeholder. ✓

**Type-consistency check:**
- Wire types in `src/types.ts` are copied field-for-field from `api-contract.md` (`participantIds` for equal, `shares:{memberId,amountMinor}[]` for exact, `netMinor`, `fxRateToBase`, `fxRateDate`, etc.). ✓
- The wire→core boundary is explicit and total: `settlement.ts#toInput` renames wire `participantIds` → core `memberIds` and passes `fxRateToBase` through unchanged; exact `shares` shape (`{memberId, amountMinor}`) is identical to core's `Share`, so it forwards directly. ✓
- `fxRateToBase`/cache `rate` semantics (base-per-source) match `core.convertMinor`'s `rate` argument, so freeze-time validation and settle-time recomputation of the exact-split base total are guaranteed identical (same integer inputs → same result), so `core.splitExact` never throws at settle time. ✓
- `RoundingStep` (core) ≡ `Rounding` (wire) ≡ `roundingSchema` (Zod) = `1 | 10 | 100 | 1000`. ✓

## Senior-review acceptance gates

- **Contract traceability:** the endpoint table above maps every frozen contract endpoint to the implementing task and its executing test; the requirement table maps every load-bearing design-spec clause to a task. A reviewer can walk the contract top-to-bottom and land on a passing test for each line.
- **Negative-control tests:** every Task's Step-2 "run to verify it fails" is the negative control (implementation absent → red). Beyond scaffolding, each route test asserts the failure paths the contract specifies: 400 on invalid body / non-member payer / exact-sum mismatch / bad FX query; 404 on unknown group or expense; and the FX suite proves carry-forward fires, the cache prevents re-fetch, same-currency short-circuits, and the window cap throws — the highest-risk behaviors are pinned by explicit assertions, not incidental coverage.
- **Determinism / offline guarantee:** `fx.ts` takes an injectable `fetch`; the FX unit tests use a mocked Frankfurter (shown in full) so they run offline and deterministically, and every route test seeds the `fx_rates` cache (or uses same-currency) so no test ever hits the network.
- **Taste target:** the worker keeps a clean seam — all D1 access is confined to `db.ts`, all FX policy to `fx.ts`, all validation to `schemas.ts`, all money math delegated to `@allsquare/core`; routers are thin. This mirrors Plan 1's "pure core, I/O at the edges" discipline, so the codebase-fit judge sees one consistent house style across both packages.
- After Plans 1–3 implement, run the real `/senior-review` harness against the actual worker diff (drive the endpoints end-to-end against a live `wrangler dev` + local D1, and settle a hand-computed cross-currency group as the §10 E2E gate).
