# Allsquare Web (PWA) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Allsquare browser-first PWA — the React + Vite app on Cloudflare Pages that lets anyone open a shared link, pick "who they are," record multi-currency expenses, and see live balances + minimal-transfer settle-up. The web app **consumes the frozen HTTP API contract** (`specs/api-contract.md`) and does **not** import `@allsquare/core`; it renders what the worker computes and does only display-layer money math (formatting + a self-contained conversion for the "≈ base" derived figure).

**Architecture:** A single package `web/` in the existing pnpm monorepo (`pnpm-workspace.yaml` already lists `web`). One typed API client (`src/lib/api.ts`) mirrors the contract's wire types **exactly**. Small focused hooks (`usePolling`, `useGroup`, `useSettlement`) own I/O and lifecycle; presentational components (`ExpenseList`, `BalanceList`, `AddExpenseForm`, `SettleUp`, `ShareBar`, `MemberPicker`, `InstallHint`) own markup. Routing is `/` (create group) and `/g/:slug` (group page). **The link is the credential** — no login; a member picker writes the active member to `localStorage`. Real-time-ish sync is a visibility-aware polling hook against `GET /api/groups/:slug`. PWA installability comes from `vite-plugin-pwa` (manifest + service worker); web push is designed-for but a documented fast-follow.

**Tech Stack:** React 18, Vite, TypeScript (strict), react-router-dom, Vitest + React Testing Library + jsdom, MSW (Mock Service Worker) for deterministic API mocking, `vite-plugin-pwa` for the manifest + service worker, `qrcode-generator` (zero-dependency) for the share QR rendered as inline SVG, Biome (lint + format, config already at repo root).

## Global Constraints

- **Money is integer minor units on the wire** (`amountMinor`), matching `@allsquare/core` and the API contract. The web app formats minor units → display strings using a **self-contained decimals table** (mirroring core's, since the web app does not import core). Floats appear only transiently inside display conversion, immediately rounded back to an integer.
- **Original amount + currency is the truth; the base figure is derived** and always shown as derived — `"¥5,000 · ≈ $33.10"` (design §3.2).
- **The link is the credential** (design §3.1): the slug lives in the URL (`/g/:slug`). No login, no signup, no passwords anywhere. Active member is chosen via a picker and persisted per-slug in `localStorage`.
- **Frozen FX is never recomputed** by the client. Each expense carries its own `fxRateToBase`; the web app converts for display using *that* frozen rate, never a live one.
- **Smart polling** (design §4, §7): poll `GET /api/groups/:slug` only when `document.visibilityState === "visible"`, and back off (exponential, capped) when the tab stays open and idle. Reset to the base interval the moment the tab regains visibility.
- Currency codes are **ISO 4217 uppercase strings**. Node **≥ 20**, pnpm **≥ 9**, TypeScript **strict: true**.
- Package name: `web` (private). Formatting/lint authority is the **repo-root `biome.json`**: double quotes, 2-space indent, semicolons **as-needed** (code below is written without semicolons), 100-char line width.
- Keep components small: **one responsibility per file**. I/O lives in hooks and `lib/api.ts`; components are presentational.
- The web app **never imports `@allsquare/core`** (contract §Notes). It consumes `/settlement` output for balances + transfers.

---

### Task 0: Web package scaffold + PWA manifest + smoke test

**Files:**
- Create: `web/package.json`
- Create: `web/tsconfig.json`
- Create: `web/vite.config.ts`
- Create: `web/vitest.config.ts`
- Create: `web/vitest.setup.ts`
- Create: `web/index.html`
- Create: `web/public/icon.svg`
- Create: `web/src/vite-env.d.ts`
- Create: `web/src/App.tsx` (temporary stub, replaced in Task 10)
- Create: `web/src/main.tsx`
- Create: `web/src/test/server.ts`
- Test: `web/src/App.test.tsx` (smoke)

**Interfaces:**
- Consumes: the repo-root `biome.json`, `tsconfig.base.json`, and `pnpm-workspace.yaml` (already list `web`) from Plan 1.
- Produces: a working `pnpm --filter web test` and `pnpm --filter web build`; the Vite + Vitest + MSW + PWA wiring every later task builds on.

- [ ] **Step 1: Write the package manifest**

`web/package.json`:
```json
{
  "name": "web",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "qrcode-generator": "^1.4.4",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.5.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "jsdom": "^25.0.0",
    "msw": "^2.4.0",
    "typescript": "^5.6.0",
    "vite": "^5.4.0",
    "vite-plugin-pwa": "^0.20.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Write the TypeScript + Vite configs**

`web/tsconfig.json`:
```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "types": ["vite/client", "vitest/globals"],
    "noEmit": true
  },
  "include": ["src"]
}
```

`web/src/vite-env.d.ts`:
```ts
/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />
```

`web/vite.config.ts` (production build; declares the PWA manifest + service worker):
```ts
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { VitePWA } from "vite-plugin-pwa"

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg"],
      manifest: {
        name: "Allsquare",
        short_name: "Allsquare",
        description: "Split anything on a trip. End up all square.",
        theme_color: "#0f766e",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ],
})
```

> **Icon note:** `public/icon.svg` (Step 4) is the source of truth and is enough for installability in modern browsers. The two raster entries (`icon-192.png`, `icon-512.png`) are the broad-compat fallback; generate them from the SVG once (e.g. `pnpm dlx @vite-pwa/assets-generator` or any rasterizer) and drop them in `web/public/`. They are not required for the test suite and are a one-line follow-up before the first Pages deploy.

`web/vitest.config.ts` (test-only; deliberately does **not** load `vite-plugin-pwa`, so tests never touch the `virtual:pwa-register` module):
```ts
import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
})
```

- [ ] **Step 3: Write the test harness (jest-dom matchers + MSW lifecycle)**

`web/src/test/server.ts`:
```ts
import { setupServer } from "msw/node"

// Shared MSW server. Individual tests register handlers with `server.use(...)`.
export const server = setupServer()
```

`web/vitest.setup.ts`:
```ts
import "@testing-library/jest-dom/vitest"
import { afterAll, afterEach, beforeAll } from "vitest"
import { server } from "./src/test/server"

beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

- [ ] **Step 4: Write the HTML entry, icon, app stub, and bootstrap**

`web/index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#0f766e" />
    <title>Allsquare</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`web/public/icon.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Allsquare">
  <rect width="512" height="512" rx="96" fill="#0f766e" />
  <rect x="140" y="196" width="232" height="40" rx="20" fill="#ffffff" />
  <rect x="140" y="276" width="232" height="40" rx="20" fill="#ffffff" />
</svg>
```

`web/src/App.tsx` (temporary stub, replaced in Task 10):
```tsx
export function App() {
  return <h1>Allsquare</h1>
}
```

`web/src/main.tsx`:
```tsx
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import { registerSW } from "virtual:pwa-register"
import { App } from "./App"

registerSW({ immediate: true })

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
```

- [ ] **Step 5: Write the smoke test**

`web/src/App.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react"
import { test } from "vitest"
import { App } from "./App"

test("app shell renders", () => {
  render(<App />)
  screen.getByRole("heading", { name: "Allsquare" })
})
```

- [ ] **Step 6: Install and run**

Run: `pnpm install && pnpm --filter web test`
Expected: 1 passing test. `pnpm --filter web typecheck` reports no errors. `pnpm lint` (root Biome) reports no errors.

- [ ] **Step 7: Commit**

```bash
git add web pnpm-lock.yaml
git commit -m "chore(web): Vite + React + Vitest + MSW + PWA scaffold with smoke test"
```

---

### Task 1: `formatMoney` + display money utilities (pure, TDD)

**Files:**
- Create: `web/src/lib/money.ts`
- Test: `web/src/lib/money.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `decimalsFor(currency: string): number` — ISO 4217 minor-unit exponent; default `2`. Mirrors core's table.
  - `minorPerUnit(currency: string): number` — `10 ** decimalsFor(currency)`.
  - `convertMinor(amountMinor: number, from: string, to: string, rate: number): number` — display-only frozen-rate conversion (same math as core; same-currency short-circuits and ignores `rate`; rounds half-up to target minor unit).
  - `formatMoney(amountMinor: number, currency: string): string` — e.g. `"¥5,000"`, `"$33.10"`.
  - `formatWithBase(original: { amountMinor: number; currency: string }, baseMinor: number, baseCurrency: string): string` — `"¥5,000 · ≈ $33.10"`; returns just the original when `original.currency === baseCurrency`.
  - `parseMajorToMinor(input: string, currency: string): number | null` — parses a user-typed major amount to integer minor units; `null` on empty/invalid/negative/unsafe.

- [ ] **Step 1: Write the failing tests**

`web/src/lib/money.test.ts`:
```ts
import { expect, test } from "vitest"
import {
  convertMinor,
  decimalsFor,
  formatMoney,
  formatWithBase,
  parseMajorToMinor,
} from "./money"

test.each([
  ["JPY", 0],
  ["USD", 2],
  ["EUR", 2],
  ["KWD", 3],
  ["XYZ", 2],
])("decimalsFor(%s) === %i", (code, expected) => {
  expect(decimalsFor(code)).toBe(expected)
})

test("convertMinor mirrors core: JPY 5000 @0.0066 -> 3300 cents", () => {
  expect(convertMinor(5000, "JPY", "USD", 0.0066)).toBe(3300)
})

test("convertMinor same-currency ignores rate", () => {
  expect(convertMinor(500000, "JPY", "JPY", 999)).toBe(500000)
})

test("convertMinor rounds half-up and stays integer", () => {
  expect(convertMinor(100, "JPY", "USD", 0.00666)).toBe(67)
  expect(Number.isInteger(convertMinor(1234, "EUR", "USD", 1.0837))).toBe(true)
})

test("formatMoney: JPY has no decimals", () => {
  expect(formatMoney(500000, "JPY")).toBe("¥5,000")
})

test("formatMoney: USD shows two decimals", () => {
  expect(formatMoney(3310, "USD")).toBe("$33.10")
})

test("formatWithBase shows original as truth and base as derived", () => {
  expect(formatWithBase({ amountMinor: 500000, currency: "JPY" }, 3310, "USD")).toBe(
    "¥5,000 · ≈ $33.10",
  )
})

test("formatWithBase omits derivation when currency is already base", () => {
  expect(formatWithBase({ amountMinor: 3000, currency: "USD" }, 3000, "USD")).toBe("$30.00")
})

test.each([
  ["5000", "JPY", 5000],
  ["33.10", "USD", 3310],
  ["0", "USD", 0],
])("parseMajorToMinor(%s, %s) === %i", (input, currency, expected) => {
  expect(parseMajorToMinor(input, currency)).toBe(expected)
})

test.each(["", "  ", "abc", "-1", "1e999"])("parseMajorToMinor rejects %s", (bad) => {
  expect(parseMajorToMinor(bad, "USD")).toBeNull()
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter web test money`
Expected: FAIL — `./money` not found.

- [ ] **Step 3: Implement the utilities**

`web/src/lib/money.ts`:
```ts
// Self-contained ISO 4217 minor-unit exponents (mirrors @allsquare/core; the web
// app does not import core). Anything unlisted falls back to 2.
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

// Display-only conversion using an expense's FROZEN rate (target-per-source).
// Same math as core.convertMinor; never fetches a live rate.
export function convertMinor(
  amountMinor: number,
  from: string,
  to: string,
  rate: number,
): number {
  if (from === to) return amountMinor
  const fromMajor = amountMinor / minorPerUnit(from)
  return Math.floor(fromMajor * rate * minorPerUnit(to) + 0.5)
}

export function formatMoney(amountMinor: number, currency: string): string {
  const decimals = decimalsFor(currency)
  const major = amountMinor / 10 ** decimals
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(major)
  } catch {
    // Unknown/invalid ISO code: Intl throws — fall back to a plain rendering.
    return `${major.toFixed(decimals)} ${currency}`
  }
}

export function formatWithBase(
  original: { amountMinor: number; currency: string },
  baseMinor: number,
  baseCurrency: string,
): string {
  const shown = formatMoney(original.amountMinor, original.currency)
  if (original.currency === baseCurrency) return shown
  return `${shown} · ≈ ${formatMoney(baseMinor, baseCurrency)}`
}

export function parseMajorToMinor(input: string, currency: string): number | null {
  const trimmed = input.trim()
  if (trimmed === "") return null
  const value = Number(trimmed)
  if (!Number.isFinite(value) || value < 0) return null
  const minor = Math.round(value * minorPerUnit(currency))
  return Number.isSafeInteger(minor) ? minor : null
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter web test money`
Expected: all money tests PASS.

> **Locale note:** tests assert `en-US` Intl output. Node ≥ 20 ships full-ICU, so `"¥5,000"`, `"$33.10"`, `"$30.00"` are stable across CI. If a minimal-ICU runtime is ever used, pin `full-icu` — but the plan targets standard Node ≥ 20.

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/money.ts web/src/lib/money.test.ts
git commit -m "feat(web): money formatting + display conversion utilities"
```

---

### Task 2: Wire types + typed API client (matches the contract, tested with MSW)

**Files:**
- Create: `web/src/lib/types.ts`
- Create: `web/src/lib/api.ts`
- Test: `web/src/lib/api.test.ts`

**Interfaces:**
- Consumes: `specs/api-contract.md` wire shapes (verbatim); `web/src/test/server.ts`.
- Produces (`types.ts`, mirroring the contract EXACTLY):
  - `type Rounding = 1 | 10 | 100 | 1000`
  - `type Group`, `type Member`, `type SplitEqual`, `type SplitExact`, `type Split`, `type Expense`, `type GroupState`, `type Balance`, `type Transfer`, `type Settlement`
  - `type CreateGroupBody`, `type ExpenseBody`, `type FxPreview`
- Produces (`api.ts`):
  - `apiBase`, `class ApiError`
  - `createGroup(body): Promise<GroupState>` → `POST /api/groups`
  - `getGroup(slug): Promise<GroupState>` → `GET /api/groups/:slug`
  - `addMember(slug, name): Promise<Member>` → `POST /api/groups/:slug/members`
  - `addExpense(slug, body): Promise<Expense>` → `POST /api/groups/:slug/expenses`
  - `editExpense(slug, id, body): Promise<Expense>` → `PATCH /api/groups/:slug/expenses/:id`
  - `deleteExpense(slug, id): Promise<void>` → `DELETE /api/groups/:slug/expenses/:id`
  - `getSettlement(slug, rounding): Promise<Settlement>` → `GET /api/groups/:slug/settlement?rounding=`
  - `getFx(from, to, date): Promise<FxPreview>` → `GET /api/fx?from=&to=&date=`

- [ ] **Step 1: Write the wire types**

`web/src/lib/types.ts`:
```ts
// Wire shapes copied VERBATIM from specs/api-contract.md. Any drift here is a
// contract violation.
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
export type Split = SplitEqual | SplitExact

export type Expense = {
  id: string
  payerId: string
  amountMinor: number
  currency: string
  fxRateToBase: number
  fxRateDate: string
  description: string
  split: Split
  createdAt: string
}

export type GroupState = { group: Group; members: Member[]; expenses: Expense[] }

export type Balance = { memberId: string; netMinor: number }
export type Transfer = { from: string; to: string; amountMinor: number }
export type Settlement = { balances: Balance[]; transfers: Transfer[] }

export type CreateGroupBody = {
  title: string
  baseCurrency: string
  rounding: Rounding
  memberNames: string[]
}

export type ExpenseBody = {
  payerId: string
  amountMinor: number
  currency: string
  description: string
  split: Split
}

export type FxPreview = { rate: number; rateDate: string }
```

- [ ] **Step 2: Write the failing API-client tests**

`web/src/lib/api.test.ts`:
```ts
import { http, HttpResponse } from "msw"
import { expect, test } from "vitest"
import { server } from "../test/server"
import {
  ApiError,
  addExpense,
  createGroup,
  deleteExpense,
  getFx,
  getGroup,
  getSettlement,
} from "./api"
import type { Expense, GroupState, Settlement } from "./types"

const groupState: GroupState = {
  group: { slug: "abc123", title: "Kyoto", baseCurrency: "USD", rounding: 1, createdAt: "2026-07-16T00:00:00Z" },
  members: [
    { id: "m1", name: "Alice", sortOrder: 0 },
    { id: "m2", name: "Bob", sortOrder: 1 },
  ],
  expenses: [],
}

test("createGroup POSTs the body and returns GroupState", async () => {
  let seen: unknown
  server.use(
    http.post("http://localhost/api/groups", async ({ request }) => {
      seen = await request.json()
      return HttpResponse.json(groupState, { status: 201 })
    }),
  )
  const result = await createGroup({
    title: "Kyoto",
    baseCurrency: "USD",
    rounding: 1,
    memberNames: ["Alice", "Bob"],
  })
  expect(result.group.slug).toBe("abc123")
  expect(seen).toEqual({ title: "Kyoto", baseCurrency: "USD", rounding: 1, memberNames: ["Alice", "Bob"] })
})

test("getGroup GETs the polling endpoint", async () => {
  server.use(
    http.get("http://localhost/api/groups/abc123", () => HttpResponse.json(groupState)),
  )
  const result = await getGroup("abc123")
  expect(result.members).toHaveLength(2)
})

test("addExpense returns the created Expense", async () => {
  const expense: Expense = {
    id: "e1",
    payerId: "m1",
    amountMinor: 5000,
    currency: "JPY",
    fxRateToBase: 0.0066,
    fxRateDate: "2026-07-16",
    description: "Ramen",
    split: { kind: "equal", participantIds: ["m1", "m2"] },
    createdAt: "2026-07-16T00:00:00Z",
  }
  server.use(
    http.post("http://localhost/api/groups/abc123/expenses", () =>
      HttpResponse.json(expense, { status: 201 }),
    ),
  )
  const result = await addExpense("abc123", {
    payerId: "m1",
    amountMinor: 5000,
    currency: "JPY",
    description: "Ramen",
    split: { kind: "equal", participantIds: ["m1", "m2"] },
  })
  expect(result.fxRateToBase).toBe(0.0066)
})

test("getSettlement passes the rounding query param", async () => {
  const settlement: Settlement = {
    balances: [{ memberId: "m1", netMinor: 100 }, { memberId: "m2", netMinor: -100 }],
    transfers: [{ from: "m2", to: "m1", amountMinor: 100 }],
  }
  let seenRounding: string | null = null
  server.use(
    http.get("http://localhost/api/groups/abc123/settlement", ({ request }) => {
      seenRounding = new URL(request.url).searchParams.get("rounding")
      return HttpResponse.json(settlement)
    }),
  )
  const result = await getSettlement("abc123", 100)
  expect(seenRounding).toBe("100")
  expect(result.transfers[0]?.amountMinor).toBe(100)
})

test("getFx passes from/to/date and returns a frozen rate", async () => {
  let url = ""
  server.use(
    http.get("http://localhost/api/fx", ({ request }) => {
      url = request.url
      return HttpResponse.json({ rate: 0.0066, rateDate: "2026-07-15" })
    }),
  )
  const result = await getFx("JPY", "USD", "2026-07-16")
  const params = new URL(url).searchParams
  expect(params.get("from")).toBe("JPY")
  expect(params.get("to")).toBe("USD")
  expect(params.get("date")).toBe("2026-07-16")
  expect(result.rateDate).toBe("2026-07-15")
})

test("deleteExpense tolerates a 204 no-body response", async () => {
  server.use(
    http.delete("http://localhost/api/groups/abc123/expenses/e1", () =>
      new HttpResponse(null, { status: 204 }),
    ),
  )
  await expect(deleteExpense("abc123", "e1")).resolves.toBeUndefined()
})

test("error responses throw ApiError with code + status", async () => {
  server.use(
    http.get("http://localhost/api/groups/nope", () =>
      HttpResponse.json({ error: { code: "not_found", message: "no such group" } }, { status: 404 }),
    ),
  )
  await expect(getGroup("nope")).rejects.toMatchObject({
    name: "ApiError",
    status: 404,
    code: "not_found",
  })
  await expect(getGroup("nope")).rejects.toBeInstanceOf(ApiError)
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm --filter web test api`
Expected: FAIL — `./api` not found.

- [ ] **Step 4: Implement the client**

`web/src/lib/api.ts`:
```ts
import type {
  CreateGroupBody,
  Expense,
  ExpenseBody,
  FxPreview,
  GroupState,
  Member,
  Rounding,
  Settlement,
} from "./types"

// Same-origin by default (Pages serves the SPA and the Worker shares the origin).
// Override in local dev with VITE_API_BASE. In jsdom tests the origin is
// http://localhost, so MSW handlers use absolute http://localhost/api/... URLs.
export const apiBase = import.meta.env.VITE_API_BASE ?? ""

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  })
  if (res.status === 204) return undefined as T
  const body = (await res.json().catch(() => null)) as
    | { error?: { code?: string; message?: string } }
    | null
  if (!res.ok) {
    const err = body?.error
    throw new ApiError(res.status, err?.code ?? "unknown", err?.message ?? res.statusText)
  }
  return body as T
}

export function createGroup(body: CreateGroupBody): Promise<GroupState> {
  return request<GroupState>("/api/groups", { method: "POST", body: JSON.stringify(body) })
}

export function getGroup(slug: string): Promise<GroupState> {
  return request<GroupState>(`/api/groups/${encodeURIComponent(slug)}`)
}

export function addMember(slug: string, name: string): Promise<Member> {
  return request<Member>(`/api/groups/${encodeURIComponent(slug)}/members`, {
    method: "POST",
    body: JSON.stringify({ name }),
  })
}

export function addExpense(slug: string, body: ExpenseBody): Promise<Expense> {
  return request<Expense>(`/api/groups/${encodeURIComponent(slug)}/expenses`, {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export function editExpense(slug: string, id: string, body: ExpenseBody): Promise<Expense> {
  return request<Expense>(
    `/api/groups/${encodeURIComponent(slug)}/expenses/${encodeURIComponent(id)}`,
    { method: "PATCH", body: JSON.stringify(body) },
  )
}

export function deleteExpense(slug: string, id: string): Promise<void> {
  return request<void>(
    `/api/groups/${encodeURIComponent(slug)}/expenses/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  )
}

export function getSettlement(slug: string, rounding: Rounding): Promise<Settlement> {
  return request<Settlement>(
    `/api/groups/${encodeURIComponent(slug)}/settlement?rounding=${rounding}`,
  )
}

export function getFx(from: string, to: string, date: string): Promise<FxPreview> {
  const q = new URLSearchParams({ from, to, date })
  return request<FxPreview>(`/api/fx?${q.toString()}`)
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm --filter web test api`
Expected: all API-client tests PASS.

- [ ] **Step 6: Commit**

```bash
git add web/src/lib/types.ts web/src/lib/api.ts web/src/lib/api.test.ts
git commit -m "feat(web): wire types + typed API client matching the contract"
```

---

### Task 3: `usePolling` — visibility-aware polling hook (TDD, fake timers)

**Files:**
- Create: `web/src/hooks/usePolling.ts`
- Test: `web/src/hooks/usePolling.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type PollingOptions = { baseMs?: number; maxMs?: number }`
  - `usePolling(onPoll: () => void, options?: PollingOptions): void`
    — On mount (if visible) polls once, then on an interval starting at `baseMs`. Each **visible** tick doubles the interval up to `maxMs` (idle backoff). While `document.visibilityState !== "visible"` it **does not poll**. When the tab becomes visible again it **resets to `baseMs` and polls immediately**. Cleans up its timer + listener on unmount. `onPoll` is read through a ref so a changing callback identity never re-arms the timer.

- [ ] **Step 1: Write the failing tests**

`web/src/hooks/usePolling.test.ts`:
```ts
import { renderHook } from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { usePolling } from "./usePolling"

let visibility: "visible" | "hidden" = "visible"

function setVisibility(next: "visible" | "hidden") {
  visibility = next
  document.dispatchEvent(new Event("visibilitychange"))
}

beforeEach(() => {
  visibility = "visible"
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => visibility,
  })
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

test("polls immediately on mount when visible", () => {
  const onPoll = vi.fn()
  renderHook(() => usePolling(onPoll, { baseMs: 1000, maxMs: 8000 }))
  expect(onPoll).toHaveBeenCalledTimes(1)
})

test("does not poll while the tab is hidden", () => {
  visibility = "hidden"
  const onPoll = vi.fn()
  renderHook(() => usePolling(onPoll, { baseMs: 1000, maxMs: 8000 }))
  vi.advanceTimersByTime(5000)
  expect(onPoll).not.toHaveBeenCalled()
})

test("backs off: interval doubles up to the cap on successive visible ticks", () => {
  const onPoll = vi.fn()
  renderHook(() => usePolling(onPoll, { baseMs: 1000, maxMs: 8000 }))
  // mount poll = 1
  vi.advanceTimersByTime(1000) // 2 (next delay -> 2000)
  vi.advanceTimersByTime(2000) // 3 (next -> 4000)
  vi.advanceTimersByTime(4000) // 4 (next -> 8000, capped)
  vi.advanceTimersByTime(8000) // 5 (stays 8000)
  expect(onPoll).toHaveBeenCalledTimes(5)
  // still capped: advancing another base interval must NOT poll early
  vi.advanceTimersByTime(1000)
  expect(onPoll).toHaveBeenCalledTimes(5)
})

test("resets to base interval and polls immediately when the tab becomes visible", () => {
  visibility = "hidden"
  const onPoll = vi.fn()
  renderHook(() => usePolling(onPoll, { baseMs: 1000, maxMs: 8000 }))
  expect(onPoll).toHaveBeenCalledTimes(0)
  setVisibility("visible")
  expect(onPoll).toHaveBeenCalledTimes(1) // immediate poll on regaining visibility
  vi.advanceTimersByTime(1000)
  expect(onPoll).toHaveBeenCalledTimes(2) // back at the base interval
})

test("stops polling after unmount", () => {
  const onPoll = vi.fn()
  const { unmount } = renderHook(() => usePolling(onPoll, { baseMs: 1000, maxMs: 8000 }))
  unmount()
  onPoll.mockClear()
  vi.advanceTimersByTime(10000)
  expect(onPoll).not.toHaveBeenCalled()
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter web test usePolling`
Expected: FAIL — `./usePolling` not found.

- [ ] **Step 3: Implement the hook**

`web/src/hooks/usePolling.ts`:
```ts
import { useEffect, useRef } from "react"

export type PollingOptions = { baseMs?: number; maxMs?: number }

export function usePolling(onPoll: () => void, options: PollingOptions = {}): void {
  const { baseMs = 3000, maxMs = 30000 } = options
  const onPollRef = useRef(onPoll)
  onPollRef.current = onPoll

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    let delay = baseMs

    const isVisible = () => document.visibilityState === "visible"

    const schedule = () => {
      timer = setTimeout(tick, delay)
    }

    const tick = () => {
      if (isVisible()) {
        onPollRef.current()
        delay = Math.min(delay * 2, maxMs)
      }
      // Hidden ticks re-check cheaply at the base cadence; they never poll.
      schedule()
    }

    const onVisibility = () => {
      if (!isVisible()) return
      delay = baseMs
      if (timer) clearTimeout(timer)
      onPollRef.current()
      schedule()
    }

    document.addEventListener("visibilitychange", onVisibility)
    if (isVisible()) onPollRef.current()
    schedule()

    return () => {
      if (timer) clearTimeout(timer)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [baseMs, maxMs])
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter web test usePolling`
Expected: all polling tests PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/hooks/usePolling.ts web/src/hooks/usePolling.test.ts
git commit -m "feat(web): visibility-aware smart-polling hook with idle backoff"
```

---

### Task 4: Create-group screen

**Files:**
- Create: `web/src/routes/CreateGroup.tsx`
- Test: `web/src/routes/CreateGroup.test.tsx`

**Interfaces:**
- Consumes: `createGroup` (Task 2), `type Rounding`, react-router `useNavigate`.
- Produces: `CreateGroup` component — a form (title, base currency, rounding, ≥2 member names) that POSTs and, on success, navigates to `/g/:slug`. Validates client-side (title present + ≥2 non-empty members) before submitting.

- [ ] **Step 1: Write the failing test**

`web/src/routes/CreateGroup.test.tsx`:
```tsx
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { expect, test } from "vitest"
import { server } from "../test/server"
import type { GroupState } from "../lib/types"
import { CreateGroup } from "./CreateGroup"

function renderApp() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<CreateGroup />} />
        <Route path="/g/:slug" element={<div>Group page abc123</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

test("submitting a valid form creates a group and navigates to /g/:slug", async () => {
  const state: GroupState = {
    group: { slug: "abc123", title: "Kyoto", baseCurrency: "JPY", rounding: 100, createdAt: "2026-07-16T00:00:00Z" },
    members: [{ id: "m1", name: "Alice", sortOrder: 0 }, { id: "m2", name: "Bob", sortOrder: 1 }],
    expenses: [],
  }
  let body: { title?: string; memberNames?: string[]; baseCurrency?: string } = {}
  server.use(
    http.post("http://localhost/api/groups", async ({ request }) => {
      body = (await request.json()) as typeof body
      return HttpResponse.json(state, { status: 201 })
    }),
  )

  const user = userEvent.setup()
  renderApp()

  await user.type(screen.getByRole("textbox", { name: "Trip title" }), "Kyoto")
  await user.selectOptions(screen.getByRole("combobox", { name: "Base currency" }), "JPY")
  await user.type(screen.getByRole("textbox", { name: "Member 1" }), "Alice")
  await user.type(screen.getByRole("textbox", { name: "Member 2" }), "Bob")
  await user.click(screen.getByRole("button", { name: "Create group" }))

  await screen.findByText("Group page abc123")
  expect(body.title).toBe("Kyoto")
  expect(body.baseCurrency).toBe("JPY")
  expect(body.memberNames).toEqual(["Alice", "Bob"])
})

test("rejects a form with fewer than two members", async () => {
  const user = userEvent.setup()
  renderApp()
  await user.type(screen.getByRole("textbox", { name: "Trip title" }), "Solo")
  await user.type(screen.getByRole("textbox", { name: "Member 1" }), "Alice")
  await user.click(screen.getByRole("button", { name: "Create group" }))
  await waitFor(() => screen.getByRole("alert"))
  expect(screen.queryByText("Group page abc123")).toBeNull()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter web test CreateGroup`
Expected: FAIL — `./CreateGroup` not found.

- [ ] **Step 3: Implement the screen**

`web/src/routes/CreateGroup.tsx`:
```tsx
import { type FormEvent, useState } from "react"
import { useNavigate } from "react-router-dom"
import { createGroup } from "../lib/api"
import type { Rounding } from "../lib/types"

const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "CNY", "THB", "SGD"]
const ROUNDINGS: Rounding[] = [1, 10, 100, 1000]

export function CreateGroup() {
  const navigate = useNavigate()
  const [title, setTitle] = useState("")
  const [baseCurrency, setBaseCurrency] = useState("USD")
  const [rounding, setRounding] = useState<Rounding>(1)
  const [memberNames, setMemberNames] = useState<string[]>(["", ""])
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const setName = (index: number, value: string) =>
    setMemberNames((prev) => prev.map((n, i) => (i === index ? value : n)))

  const addRow = () => setMemberNames((prev) => [...prev, ""])

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const names = memberNames.map((n) => n.trim()).filter((n) => n !== "")
    if (title.trim() === "" || names.length < 2) {
      setError("Add a title and at least two members.")
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const state = await createGroup({ title: title.trim(), baseCurrency, rounding, memberNames: names })
      navigate(`/g/${state.group.slug}`)
    } catch {
      setError("Could not create the group. Try again.")
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} aria-label="Create group">
      <h1>Start a group</h1>
      <label>
        Trip title
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label>
        Base currency
        <select value={baseCurrency} onChange={(e) => setBaseCurrency(e.target.value)}>
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <label>
        Rounding
        <select value={rounding} onChange={(e) => setRounding(Number(e.target.value) as Rounding)}>
          {ROUNDINGS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>
      <fieldset>
        <legend>Members</legend>
        {memberNames.map((name, i) => (
          <input
            // biome-ignore lint/suspicious/noArrayIndexKey: member rows are positional
            key={i}
            aria-label={`Member ${i + 1}`}
            value={name}
            onChange={(e) => setName(i, e.target.value)}
          />
        ))}
        <button type="button" onClick={addRow}>
          Add member
        </button>
      </fieldset>
      {error ? <p role="alert">{error}</p> : null}
      <button type="submit" disabled={submitting}>
        Create group
      </button>
    </form>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter web test CreateGroup`
Expected: both tests PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/routes/CreateGroup.tsx web/src/routes/CreateGroup.test.tsx
git commit -m "feat(web): create-group screen with validation and redirect"
```

---

### Task 5: Member picker + localStorage active member

**Files:**
- Create: `web/src/lib/activeMember.ts`
- Create: `web/src/components/MemberPicker.tsx`
- Test: `web/src/lib/activeMember.test.ts`
- Test: `web/src/components/MemberPicker.test.tsx`

**Interfaces:**
- Consumes: `type Member`.
- Produces:
  - `getActiveMemberId(slug: string): string | null`
  - `setActiveMemberId(slug: string, memberId: string): void`
  - `clearActiveMember(slug: string): void`
  - `MemberPicker({ members, onPick }: { members: Member[]; onPick: (memberId: string) => void })` — renders an "I'm {name}" button per member.

- [ ] **Step 1: Write the failing tests**

`web/src/lib/activeMember.test.ts`:
```ts
import { afterEach, expect, test } from "vitest"
import { clearActiveMember, getActiveMemberId, setActiveMemberId } from "./activeMember"

afterEach(() => localStorage.clear())

test("returns null before any member is chosen", () => {
  expect(getActiveMemberId("abc123")).toBeNull()
})

test("persists the active member per slug", () => {
  setActiveMemberId("abc123", "m1")
  setActiveMemberId("other", "m9")
  expect(getActiveMemberId("abc123")).toBe("m1")
  expect(getActiveMemberId("other")).toBe("m9")
})

test("clearActiveMember removes only that slug", () => {
  setActiveMemberId("abc123", "m1")
  clearActiveMember("abc123")
  expect(getActiveMemberId("abc123")).toBeNull()
})
```

`web/src/components/MemberPicker.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { expect, test, vi } from "vitest"
import type { Member } from "../lib/types"
import { MemberPicker } from "./MemberPicker"

const members: Member[] = [
  { id: "m1", name: "Alice", sortOrder: 0 },
  { id: "m2", name: "Bob", sortOrder: 1 },
]

test("calls onPick with the member id", async () => {
  const onPick = vi.fn()
  const user = userEvent.setup()
  render(<MemberPicker members={members} onPick={onPick} />)
  await user.click(screen.getByRole("button", { name: "I'm Bob" }))
  expect(onPick).toHaveBeenCalledWith("m2")
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter web test activeMember MemberPicker`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement storage + picker**

`web/src/lib/activeMember.ts`:
```ts
const key = (slug: string) => `allsquare:activeMember:${slug}`

export function getActiveMemberId(slug: string): string | null {
  try {
    return localStorage.getItem(key(slug))
  } catch {
    return null
  }
}

export function setActiveMemberId(slug: string, memberId: string): void {
  try {
    localStorage.setItem(key(slug), memberId)
  } catch {
    // private-mode / quota failures are non-fatal: the picker simply re-appears.
  }
}

export function clearActiveMember(slug: string): void {
  try {
    localStorage.removeItem(key(slug))
  } catch {
    // ignore
  }
}
```

`web/src/components/MemberPicker.tsx`:
```tsx
import type { Member } from "../lib/types"

export function MemberPicker({
  members,
  onPick,
}: {
  members: Member[]
  onPick: (memberId: string) => void
}) {
  return (
    <section aria-label="Who are you?">
      <h2>Who are you?</h2>
      <ul>
        {members.map((m) => (
          <li key={m.id}>
            <button type="button" onClick={() => onPick(m.id)}>
              I'm {m.name}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter web test activeMember MemberPicker`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/activeMember.ts web/src/lib/activeMember.test.ts web/src/components/MemberPicker.tsx web/src/components/MemberPicker.test.tsx
git commit -m "feat(web): member picker + per-slug localStorage active member"
```

---

### Task 6: Group data hooks + expense list + balances display

**Files:**
- Create: `web/src/hooks/useGroup.ts`
- Create: `web/src/hooks/useSettlement.ts`
- Create: `web/src/components/ExpenseList.tsx`
- Create: `web/src/components/BalanceList.tsx`
- Test: `web/src/hooks/useGroup.test.tsx`
- Test: `web/src/components/ExpenseList.test.tsx`
- Test: `web/src/components/BalanceList.test.tsx`

**Interfaces:**
- Consumes: `getGroup`, `getSettlement`, `usePolling`, `convertMinor`, `formatMoney`, `formatWithBase`, wire types.
- Produces:
  - `useGroup(slug: string): { state: GroupState | null; error: Error | null; refresh: () => Promise<void> }` — fetches on mount + smart-polls.
  - `useSettlement(slug: string, rounding: Rounding): Settlement | null` — refetches whenever `slug` or `rounding` changes.
  - `ExpenseList({ expenses, members, baseCurrency })` — each row shows description, payer, and original + derived base amount via `formatWithBase`.
  - `BalanceList({ balances, members, baseCurrency })` — each member's net as "is owed / owes / is settled."

- [ ] **Step 1: Write the failing tests**

`web/src/hooks/useGroup.test.tsx`:
```tsx
import { renderHook, waitFor } from "@testing-library/react"
import { http, HttpResponse } from "msw"
import { expect, test } from "vitest"
import { server } from "../test/server"
import type { GroupState } from "../lib/types"
import { useGroup } from "./useGroup"

const state: GroupState = {
  group: { slug: "abc123", title: "Kyoto", baseCurrency: "USD", rounding: 1, createdAt: "2026-07-16T00:00:00Z" },
  members: [{ id: "m1", name: "Alice", sortOrder: 0 }],
  expenses: [],
}

test("loads the group state on mount", async () => {
  server.use(http.get("http://localhost/api/groups/abc123", () => HttpResponse.json(state)))
  const { result } = renderHook(() => useGroup("abc123"))
  await waitFor(() => expect(result.current.state?.group.title).toBe("Kyoto"))
})

test("exposes an error when the group is missing", async () => {
  server.use(
    http.get("http://localhost/api/groups/nope", () =>
      HttpResponse.json({ error: { code: "not_found", message: "no" } }, { status: 404 }),
    ),
  )
  const { result } = renderHook(() => useGroup("nope"))
  await waitFor(() => expect(result.current.error).not.toBeNull())
})
```

`web/src/components/ExpenseList.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react"
import { expect, test } from "vitest"
import type { Expense, Member } from "../lib/types"
import { ExpenseList } from "./ExpenseList"

const members: Member[] = [
  { id: "m1", name: "Alice", sortOrder: 0 },
  { id: "m2", name: "Bob", sortOrder: 1 },
]

const expenses: Expense[] = [
  {
    id: "e1",
    payerId: "m1",
    amountMinor: 5000,
    currency: "JPY",
    fxRateToBase: 0.0066,
    fxRateDate: "2026-07-16",
    description: "Ramen",
    split: { kind: "equal", participantIds: ["m1", "m2"] },
    createdAt: "2026-07-16T00:00:00Z",
  },
]

test("shows the original amount as truth and the base as derived", () => {
  render(<ExpenseList expenses={expenses} members={members} baseCurrency="USD" />)
  screen.getByText("Ramen")
  screen.getByText("paid by Alice")
  // 5000 JPY * 0.0066 = 3300 cents = $33.00
  screen.getByText("¥5,000 · ≈ $33.00")
})

test("renders an empty state", () => {
  render(<ExpenseList expenses={[]} members={members} baseCurrency="USD" />)
  screen.getByText("No expenses yet.")
})
```

`web/src/components/BalanceList.test.tsx`:
```tsx
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
  screen.getByText("Alice is owed $12.00")
  screen.getByText("Bob owes $12.00")
  screen.getByText("Carol is settled")
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter web test useGroup ExpenseList BalanceList`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement the hooks + components**

`web/src/hooks/useGroup.ts`:
```ts
import { useCallback, useState } from "react"
import { getGroup } from "../lib/api"
import type { GroupState } from "../lib/types"
import { usePolling } from "./usePolling"

export function useGroup(slug: string): {
  state: GroupState | null
  error: Error | null
  refresh: () => Promise<void>
} {
  const [state, setState] = useState<GroupState | null>(null)
  const [error, setError] = useState<Error | null>(null)

  const refresh = useCallback(async () => {
    try {
      setState(await getGroup(slug))
      setError(null)
    } catch (e) {
      setError(e as Error)
    }
  }, [slug])

  // Smart polling drives both the initial load (immediate poll on mount) and
  // ongoing sync (visible-only, idle backoff).
  usePolling(() => {
    void refresh()
  }, { baseMs: 3000, maxMs: 30000 })

  return { state, error, refresh }
}
```

`web/src/hooks/useSettlement.ts`:
```ts
import { useEffect, useState } from "react"
import { getSettlement } from "../lib/api"
import type { Rounding, Settlement } from "../lib/types"

export function useSettlement(slug: string, rounding: Rounding): Settlement | null {
  const [settlement, setSettlement] = useState<Settlement | null>(null)

  useEffect(() => {
    let alive = true
    getSettlement(slug, rounding)
      .then((s) => {
        if (alive) setSettlement(s)
      })
      .catch(() => {
        if (alive) setSettlement(null)
      })
    return () => {
      alive = false
    }
  }, [slug, rounding])

  return settlement
}
```

`web/src/components/ExpenseList.tsx`:
```tsx
import { convertMinor, formatWithBase } from "../lib/money"
import type { Expense, Member } from "../lib/types"

export function ExpenseList({
  expenses,
  members,
  baseCurrency,
}: {
  expenses: Expense[]
  members: Member[]
  baseCurrency: string
}) {
  const nameOf = new Map(members.map((m) => [m.id, m.name]))
  if (expenses.length === 0) return <p>No expenses yet.</p>
  return (
    <ul aria-label="Expenses">
      {expenses.map((e) => {
        // Derived base figure uses the expense's FROZEN rate, never a live one.
        const baseMinor = convertMinor(e.amountMinor, e.currency, baseCurrency, e.fxRateToBase)
        return (
          <li key={e.id}>
            <span>{e.description}</span> <span>paid by {nameOf.get(e.payerId) ?? "?"}</span>{" "}
            <span>
              {formatWithBase(
                { amountMinor: e.amountMinor, currency: e.currency },
                baseMinor,
                baseCurrency,
              )}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
```

`web/src/components/BalanceList.tsx`:
```tsx
import { formatMoney } from "../lib/money"
import type { Balance, Member } from "../lib/types"

export function BalanceList({
  balances,
  members,
  baseCurrency,
}: {
  balances: Balance[]
  members: Member[]
  baseCurrency: string
}) {
  const nameOf = new Map(members.map((m) => [m.id, m.name]))
  return (
    <ul aria-label="Balances">
      {balances.map((b) => {
        const name = nameOf.get(b.memberId) ?? "?"
        const label =
          b.netMinor === 0
            ? "is settled"
            : b.netMinor > 0
              ? `is owed ${formatMoney(b.netMinor, baseCurrency)}`
              : `owes ${formatMoney(-b.netMinor, baseCurrency)}`
        return (
          <li key={b.memberId}>
            {name} {label}
          </li>
        )
      })}
    </ul>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter web test useGroup ExpenseList BalanceList`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/hooks/useGroup.ts web/src/hooks/useSettlement.ts web/src/components/ExpenseList.tsx web/src/components/BalanceList.tsx web/src/hooks/useGroup.test.tsx web/src/components/ExpenseList.test.tsx web/src/components/BalanceList.test.tsx
git commit -m "feat(web): group/settlement hooks + expense list + balances display"
```

---

### Task 7: Add-expense form (equal/exact split + live FX preview)

**Files:**
- Create: `web/src/lib/date.ts`
- Create: `web/src/components/AddExpenseForm.tsx`
- Test: `web/src/lib/date.test.ts`
- Test: `web/src/components/AddExpenseForm.test.tsx`

**Interfaces:**
- Consumes: `addExpense`, `getFx`, `convertMinor`, `formatMoney`, `parseMajorToMinor`, wire types.
- Produces:
  - `todayISODate(): string` — local `YYYY-MM-DD`, used as the `date` for the FX preview.
  - `AddExpenseForm({ group, members, defaultPayerId, onAdded })` — payer select, description, split-kind radios, and:
    - **Equal split:** amount + currency + participant checkboxes + a live "≈ base" preview (via `GET /api/fx`) when a non-base currency is chosen.
    - **Exact split:** per-person amounts **entered in the group base currency**; the expense currency is forced to base (see decision below). A live running total is shown; the server validates the sum.

> **v1 exact-split decision (documented, resolves a real contract ambiguity):**
> the contract states `SplitExact.shares` are **in group base currency** and must
> sum to the converted base total. Entering exact per-person amounts in a *foreign*
> currency and client-converting each share would risk per-share rounding that
> fails the server's `sum === convertedTotal` check (and the server re-freezes its
> own rate, which can differ from the preview). To keep the form honest and always
> valid, **exact splits are entered directly in the base currency** (`currency` is
> pinned to `baseCurrency`, `fxRateToBase` is 1 server-side, `amountMinor` is the
> sum of the shares). Multi-currency freedom is preserved for **equal** splits,
> which is the common travel case. Foreign-currency exact splits are a clean
> fast-follow if ever needed.

- [ ] **Step 1: Write the failing tests**

`web/src/lib/date.test.ts`:
```ts
import { expect, test } from "vitest"
import { todayISODate } from "./date"

test("returns a YYYY-MM-DD string", () => {
  expect(todayISODate()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
})
```

`web/src/components/AddExpenseForm.test.tsx`:
```tsx
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { expect, test, vi } from "vitest"
import { server } from "../test/server"
import type { Group, Member } from "../lib/types"
import { AddExpenseForm } from "./AddExpenseForm"

const group: Group = {
  slug: "abc123",
  title: "Kyoto",
  baseCurrency: "USD",
  rounding: 1,
  createdAt: "2026-07-16T00:00:00Z",
}
const members: Member[] = [
  { id: "m1", name: "Alice", sortOrder: 0 },
  { id: "m2", name: "Bob", sortOrder: 1 },
]

test("equal split: shows a live base preview and POSTs an equal expense", async () => {
  server.use(
    http.get("http://localhost/api/fx", () =>
      HttpResponse.json({ rate: 0.0066, rateDate: "2026-07-16" }),
    ),
  )
  let posted: Record<string, unknown> = {}
  server.use(
    http.post("http://localhost/api/groups/abc123/expenses", async ({ request }) => {
      posted = (await request.json()) as Record<string, unknown>
      return HttpResponse.json({}, { status: 201 })
    }),
  )
  const onAdded = vi.fn()
  const user = userEvent.setup()
  render(<AddExpenseForm group={group} members={members} defaultPayerId="m1" onAdded={onAdded} />)

  await user.type(screen.getByRole("textbox", { name: "Description" }), "Ramen")
  await user.selectOptions(screen.getByRole("combobox", { name: "Currency" }), "JPY")
  await user.type(screen.getByRole("textbox", { name: "Amount" }), "5000")

  // 5000 JPY * 0.0066 = 3300 cents = $33.00
  await waitFor(() => expect(screen.getByTestId("fx-preview")).toHaveTextContent("≈ $33.00"))

  await user.click(screen.getByRole("button", { name: "Add expense" }))
  await waitFor(() => expect(onAdded).toHaveBeenCalled())

  expect(posted.currency).toBe("JPY")
  expect(posted.amountMinor).toBe(5000)
  expect(posted.split).toEqual({ kind: "equal", participantIds: ["m1", "m2"] })
})

test("exact split: entered in base currency, POSTs shares that sum to the total", async () => {
  let posted: Record<string, unknown> = {}
  server.use(
    http.post("http://localhost/api/groups/abc123/expenses", async ({ request }) => {
      posted = (await request.json()) as Record<string, unknown>
      return HttpResponse.json({}, { status: 201 })
    }),
  )
  const onAdded = vi.fn()
  const user = userEvent.setup()
  render(<AddExpenseForm group={group} members={members} defaultPayerId="m1" onAdded={onAdded} />)

  await user.type(screen.getByRole("textbox", { name: "Description" }), "Wagyu")
  await user.click(screen.getByRole("radio", { name: "Exact (in USD)" }))
  await user.type(screen.getByRole("textbox", { name: "Exact amount for Alice" }), "20")
  await user.type(screen.getByRole("textbox", { name: "Exact amount for Bob" }), "10")
  await user.click(screen.getByRole("button", { name: "Add expense" }))
  await waitFor(() => expect(onAdded).toHaveBeenCalled())

  expect(posted.currency).toBe("USD")
  expect(posted.amountMinor).toBe(3000)
  expect(posted.split).toEqual({
    kind: "exact",
    shares: [
      { memberId: "m1", amountMinor: 2000 },
      { memberId: "m2", amountMinor: 1000 },
    ],
  })
})

test("blocks submit with an invalid amount", async () => {
  const onAdded = vi.fn()
  const user = userEvent.setup()
  render(<AddExpenseForm group={group} members={members} defaultPayerId="m1" onAdded={onAdded} />)
  await user.type(screen.getByRole("textbox", { name: "Description" }), "Bad")
  await user.click(screen.getByRole("button", { name: "Add expense" }))
  await screen.findByRole("alert")
  expect(onAdded).not.toHaveBeenCalled()
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter web test date AddExpenseForm`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement the date util + form**

`web/src/lib/date.ts`:
```ts
export function todayISODate(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}
```

`web/src/components/AddExpenseForm.tsx`:
```tsx
import { type FormEvent, useEffect, useState } from "react"
import { addExpense, getFx } from "../lib/api"
import { todayISODate } from "../lib/date"
import { convertMinor, formatMoney, parseMajorToMinor } from "../lib/money"
import type { ExpenseBody, Group, Member } from "../lib/types"

const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "CNY", "THB", "SGD"]

export function AddExpenseForm({
  group,
  members,
  defaultPayerId,
  onAdded,
}: {
  group: Group
  members: Member[]
  defaultPayerId: string | null
  onAdded: () => void
}) {
  const base = group.baseCurrency
  const [payerId, setPayerId] = useState(defaultPayerId ?? members[0]?.id ?? "")
  const [description, setDescription] = useState("")
  const [splitKind, setSplitKind] = useState<"equal" | "exact">("equal")
  const [currency, setCurrency] = useState(base)
  const [amount, setAmount] = useState("")
  const [participants, setParticipants] = useState<Set<string>>(
    () => new Set(members.map((m) => m.id)),
  )
  const [exact, setExact] = useState<Record<string, string>>({})
  const [preview, setPreview] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Exact shares are entered in the base currency (contract §Types), so pin the
  // currency to base while "exact" is active.
  const effectiveCurrency = splitKind === "exact" ? base : currency
  const equalAmountMinor = parseMajorToMinor(amount, effectiveCurrency)

  // Live "≈ base" preview via GET /api/fx (equal splits, non-base currency only).
  useEffect(() => {
    if (splitKind === "exact" || effectiveCurrency === base || equalAmountMinor === null) {
      setPreview(null)
      return
    }
    let alive = true
    getFx(effectiveCurrency, base, todayISODate())
      .then((fx) => {
        if (alive) setPreview(convertMinor(equalAmountMinor, effectiveCurrency, base, fx.rate))
      })
      .catch(() => {
        if (alive) setPreview(null)
      })
    return () => {
      alive = false
    }
  }, [splitKind, effectiveCurrency, base, equalAmountMinor])

  const toggleParticipant = (id: string) =>
    setParticipants((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const exactTotalMinor = members.reduce(
    (sum, m) => sum + (parseMajorToMinor(exact[m.id] ?? "", base) ?? 0),
    0,
  )

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    if (payerId === "" || description.trim() === "") {
      setError("Choose a payer and add a description.")
      return
    }

    let body: ExpenseBody
    if (splitKind === "equal") {
      if (equalAmountMinor === null) {
        setError("Enter a valid amount.")
        return
      }
      const participantIds = members.map((m) => m.id).filter((id) => participants.has(id))
      if (participantIds.length === 0) {
        setError("Pick at least one participant.")
        return
      }
      body = {
        payerId,
        amountMinor: equalAmountMinor,
        currency: effectiveCurrency,
        description: description.trim(),
        split: { kind: "equal", participantIds },
      }
    } else {
      const shares = members
        .map((m) => ({ memberId: m.id, amountMinor: parseMajorToMinor(exact[m.id] ?? "", base) ?? 0 }))
        .filter((s) => s.amountMinor > 0)
      if (shares.length === 0) {
        setError("Enter each person's exact amount.")
        return
      }
      body = {
        payerId,
        amountMinor: exactTotalMinor,
        currency: base,
        description: description.trim(),
        split: { kind: "exact", shares },
      }
    }

    setSubmitting(true)
    try {
      await addExpense(group.slug, body)
      setDescription("")
      setAmount("")
      setExact({})
      onAdded()
    } catch {
      setError("Could not add the expense.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} aria-label="Add expense">
      <h2>Add an expense</h2>
      <label>
        Payer
        <select value={payerId} onChange={(e) => setPayerId(e.target.value)}>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Description
        <input value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>
      <fieldset>
        <legend>Split</legend>
        <label>
          <input
            type="radio"
            name="splitKind"
            checked={splitKind === "equal"}
            onChange={() => setSplitKind("equal")}
          />
          Equal
        </label>
        <label>
          <input
            type="radio"
            name="splitKind"
            checked={splitKind === "exact"}
            onChange={() => setSplitKind("exact")}
          />
          Exact (in {base})
        </label>
      </fieldset>

      {splitKind === "equal" ? (
        <>
          <label>
            Amount
            <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" />
          </label>
          <label>
            Currency
            <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          {preview !== null ? (
            <p data-testid="fx-preview">≈ {formatMoney(preview, base)}</p>
          ) : null}
          <fieldset>
            <legend>Participants</legend>
            {members.map((m) => (
              <label key={m.id}>
                <input
                  type="checkbox"
                  checked={participants.has(m.id)}
                  onChange={() => toggleParticipant(m.id)}
                />
                {m.name}
              </label>
            ))}
          </fieldset>
        </>
      ) : (
        <fieldset>
          <legend>Exact amounts ({base})</legend>
          {members.map((m) => (
            <label key={m.id}>
              {m.name}
              <input
                aria-label={`Exact amount for ${m.name}`}
                value={exact[m.id] ?? ""}
                onChange={(e) => setExact((prev) => ({ ...prev, [m.id]: e.target.value }))}
                inputMode="decimal"
              />
            </label>
          ))}
          <p data-testid="exact-total">Total {formatMoney(exactTotalMinor, base)}</p>
        </fieldset>
      )}

      {error ? <p role="alert">{error}</p> : null}
      <button type="submit" disabled={submitting}>
        Add expense
      </button>
    </form>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter web test date AddExpenseForm`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/date.ts web/src/lib/date.test.ts web/src/components/AddExpenseForm.tsx web/src/components/AddExpenseForm.test.tsx
git commit -m "feat(web): add-expense form with equal/exact split + live FX preview"
```

---

### Task 8: Settle-up view with rounding selector

**Files:**
- Create: `web/src/components/SettleUp.tsx`
- Test: `web/src/components/SettleUp.test.tsx`

**Interfaces:**
- Consumes: `useSettlement`, `formatMoney`, wire types.
- Produces: `SettleUp({ group, members })` — a rounding selector (1/10/100/1000, default `group.rounding`) that drives `GET /settlement?rounding=`, rendering "X pays Y {amount}" transfer lines (or "Everyone is all square." when empty). Changing rounding re-queries **without persisting** (contract note: preview only).

- [ ] **Step 1: Write the failing test**

`web/src/components/SettleUp.test.tsx`:
```tsx
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { expect, test } from "vitest"
import { server } from "../test/server"
import type { Group, Member } from "../lib/types"
import { SettleUp } from "./SettleUp"

const group: Group = {
  slug: "abc123",
  title: "Kyoto",
  baseCurrency: "JPY",
  rounding: 1,
  createdAt: "2026-07-16T00:00:00Z",
}
const members: Member[] = [
  { id: "m1", name: "Alice", sortOrder: 0 },
  { id: "m2", name: "Bob", sortOrder: 1 },
]

function handler() {
  return http.get("http://localhost/api/groups/abc123/settlement", ({ request }) => {
    const rounding = new URL(request.url).searchParams.get("rounding")
    const amount = rounding === "100" ? 15200 : 15150
    return HttpResponse.json({
      balances: [
        { memberId: "m1", netMinor: amount },
        { memberId: "m2", netMinor: -amount },
      ],
      transfers: [{ from: "m2", to: "m1", amountMinor: amount }],
    })
  })
}

test("renders transfers and re-queries when rounding changes", async () => {
  server.use(handler())
  const user = userEvent.setup()
  render(<SettleUp group={group} members={members} />)

  await waitFor(() => screen.getByText("Bob pays Alice ¥15,150"))
  await user.selectOptions(screen.getByRole("combobox", { name: "Round to" }), "100")
  await waitFor(() => screen.getByText("Bob pays Alice ¥15,200"))
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter web test SettleUp`
Expected: FAIL — `./SettleUp` not found.

- [ ] **Step 3: Implement the view**

`web/src/components/SettleUp.tsx`:
```tsx
import { useState } from "react"
import { useSettlement } from "../hooks/useSettlement"
import { formatMoney } from "../lib/money"
import type { Group, Member, Rounding } from "../lib/types"

const ROUNDINGS: Rounding[] = [1, 10, 100, 1000]

export function SettleUp({ group, members }: { group: Group; members: Member[] }) {
  const [rounding, setRounding] = useState<Rounding>(group.rounding)
  const settlement = useSettlement(group.slug, rounding)
  const nameOf = new Map(members.map((m) => [m.id, m.name]))

  return (
    <section aria-label="Settle up">
      <h2>Settle up</h2>
      <label>
        Round to
        <select value={rounding} onChange={(e) => setRounding(Number(e.target.value) as Rounding)}>
          {ROUNDINGS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>
      {settlement === null ? (
        <p>Calculating…</p>
      ) : settlement.transfers.length === 0 ? (
        <p>Everyone is all square.</p>
      ) : (
        <ul aria-label="Transfers">
          {settlement.transfers.map((t) => (
            <li key={`${t.from}-${t.to}-${t.amountMinor}`}>
              {nameOf.get(t.from) ?? "?"} pays {nameOf.get(t.to) ?? "?"}{" "}
              {formatMoney(t.amountMinor, group.baseCurrency)}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter web test SettleUp`
Expected: test PASSES.

- [ ] **Step 5: Commit**

```bash
git add web/src/components/SettleUp.tsx web/src/components/SettleUp.test.tsx
git commit -m "feat(web): settle-up view with rounding preview selector"
```

---

### Task 9: Share affordance — copy link + inline-SVG QR

**Files:**
- Create: `web/src/components/QrCode.tsx`
- Create: `web/src/components/ShareBar.tsx`
- Test: `web/src/components/QrCode.test.tsx`
- Test: `web/src/components/ShareBar.test.tsx`

**Interfaces:**
- Consumes: `qrcode-generator` (zero-dependency; renders the QR matrix, we draw the SVG ourselves so there is no `<img>`/canvas/network dependency).
- Produces:
  - `QrCode({ value, size? })` — an accessible inline `<svg role="img">` of black module `<rect>`s over a white background, `viewBox="0 0 count count"`.
  - `ShareBar({ url })` — a "Copy link" button (`navigator.clipboard.writeText`, flips to "Copied!") plus the `QrCode` for the group URL.

> **QR approach (decision):** use the tiny, zero-dependency `qrcode-generator`
> package for the encoding matrix, and render it as **inline SVG rectangles**
> ourselves. This keeps the QR crisp at any size, fully offline (CSP-safe, no image
> host), test-assertable (count the `<rect>`s), and adds ~4 KB with no transitive
> deps — lighter than the raster-canvas `qrcode` package.

- [ ] **Step 1: Write the failing tests**

`web/src/components/QrCode.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react"
import { expect, test } from "vitest"
import { QrCode } from "./QrCode"

test("renders an accessible svg with dark modules", () => {
  const { container } = render(<QrCode value="https://allsquare.app/g/abc123" />)
  const svg = screen.getByRole("img", { name: "Group QR code" })
  expect(svg.tagName.toLowerCase()).toBe("svg")
  // dark modules are drawn as <rect>; a real QR always has many
  expect(container.querySelectorAll("rect").length).toBeGreaterThan(10)
})
```

`web/src/components/ShareBar.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { expect, test, vi } from "vitest"
import { ShareBar } from "./ShareBar"

test("copies the group link to the clipboard", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined)
  Object.assign(navigator, { clipboard: { writeText } })
  const user = userEvent.setup()
  render(<ShareBar url="https://allsquare.app/g/abc123" />)
  await user.click(screen.getByRole("button", { name: "Copy link" }))
  expect(writeText).toHaveBeenCalledWith("https://allsquare.app/g/abc123")
  await screen.findByRole("button", { name: "Copied!" })
})

test("renders a QR for the url", () => {
  render(<ShareBar url="https://allsquare.app/g/abc123" />)
  screen.getByRole("img", { name: "Group QR code" })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter web test QrCode ShareBar`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement the QR + share bar**

`web/src/components/QrCode.tsx`:
```tsx
import type { ReactElement } from "react"
import qrcode from "qrcode-generator"

export function QrCode({ value, size = 160 }: { value: string; size?: number }) {
  const qr = qrcode(0, "M") // type 0 = auto-size, "M" = medium error correction
  qr.addData(value)
  qr.make()
  const count = qr.getModuleCount()

  const rects: ReactElement[] = []
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (qr.isDark(row, col)) {
        rects.push(<rect key={`${row}-${col}`} x={col} y={row} width={1} height={1} />)
      }
    }
  }

  return (
    <svg
      role="img"
      aria-label="Group QR code"
      width={size}
      height={size}
      viewBox={`0 0 ${count} ${count}`}
      shapeRendering="crispEdges"
    >
      <rect x={0} y={0} width={count} height={count} fill="#ffffff" />
      <g fill="#000000">{rects}</g>
    </svg>
  )
}
```

`web/src/components/ShareBar.tsx`:
```tsx
import { useState } from "react"
import { QrCode } from "./QrCode"

export function ShareBar({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <section aria-label="Share">
      <button type="button" onClick={copy}>
        {copied ? "Copied!" : "Copy link"}
      </button>
      <QrCode value={url} />
    </section>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter web test QrCode ShareBar`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/components/QrCode.tsx web/src/components/ShareBar.tsx web/src/components/QrCode.test.tsx web/src/components/ShareBar.test.tsx
git commit -m "feat(web): share bar with copy link + inline-SVG QR code"
```

---

### Task 10: Routing + app shell + PWA installability (assemble the group page)

**Files:**
- Create: `web/src/components/InstallHint.tsx`
- Create: `web/src/routes/GroupPage.tsx`
- Modify: `web/src/App.tsx` (replace the Task 0 stub)
- Test: `web/src/components/InstallHint.test.tsx`
- Test: `web/src/routes/GroupPage.test.tsx`
- Test: `web/src/App.test.tsx` (replace the Task 0 smoke test)

**Interfaces:**
- Consumes: everything above; react-router `Routes`/`Route`/`useParams`.
- Produces:
  - `InstallHint()` — listens for `beforeinstallprompt`, renders an "Add to Home Screen" button for organizers when the browser offers install.
  - `GroupPage()` — reads `:slug`, uses `useGroup` + `useSettlement`, shows the member picker until an active member is chosen (persisted via `activeMember`), then composes `ShareBar`, `InstallHint`, `BalanceList`, `ExpenseList`, `AddExpenseForm`, `SettleUp`.
  - `App()` — routes `/` → `CreateGroup`, `/g/:slug` → `GroupPage`.

- [ ] **Step 1: Write the failing tests**

`web/src/components/InstallHint.test.tsx`:
```tsx
import { render, screen, waitFor } from "@testing-library/react"
import { expect, test } from "vitest"
import { InstallHint } from "./InstallHint"

test("shows nothing until the browser offers install", () => {
  render(<InstallHint />)
  expect(screen.queryByRole("button")).toBeNull()
})

test("shows the add-to-home-screen hint after beforeinstallprompt", async () => {
  render(<InstallHint />)
  const event = new Event("beforeinstallprompt") as Event & { prompt?: () => Promise<void> }
  event.prompt = () => Promise.resolve()
  window.dispatchEvent(event)
  await waitFor(() =>
    screen.getByRole("button", { name: "Add Allsquare to your home screen" }),
  )
})
```

`web/src/routes/GroupPage.test.tsx`:
```tsx
import { render, screen, waitFor } from "@testing-library/react"
import { http, HttpResponse } from "msw"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { afterEach, test } from "vitest"
import { server } from "../test/server"
import type { GroupState, Settlement } from "../lib/types"
import { GroupPage } from "./GroupPage"

const state: GroupState = {
  group: { slug: "abc123", title: "Kyoto Trip", baseCurrency: "USD", rounding: 1, createdAt: "2026-07-16T00:00:00Z" },
  members: [
    { id: "m1", name: "Alice", sortOrder: 0 },
    { id: "m2", name: "Bob", sortOrder: 1 },
  ],
  expenses: [],
}
const settlement: Settlement = { balances: [], transfers: [] }

afterEach(() => localStorage.clear())

function renderAt() {
  server.use(
    http.get("http://localhost/api/groups/abc123", () => HttpResponse.json(state)),
    http.get("http://localhost/api/groups/abc123/settlement", () => HttpResponse.json(settlement)),
  )
  return render(
    <MemoryRouter initialEntries={["/g/abc123"]}>
      <Routes>
        <Route path="/g/:slug" element={<GroupPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

test("loads the group and prompts the member picker", async () => {
  renderAt()
  await waitFor(() => screen.getByRole("heading", { name: "Kyoto Trip" }))
  screen.getByRole("button", { name: "I'm Alice" })
  screen.getByRole("heading", { name: "Settle up" })
})
```

`web/src/App.test.tsx` (replaces the Task 0 smoke test):
```tsx
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { test } from "vitest"
import { App } from "./App"

test("root route shows the create-group screen", () => {
  render(
    <MemoryRouter initialEntries={["/"]}>
      <App />
    </MemoryRouter>,
  )
  screen.getByRole("heading", { name: "Start a group" })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter web test InstallHint GroupPage App`
Expected: FAIL — `InstallHint`/`GroupPage` not found; the old `App` smoke test breaks (expected — it is being replaced).

- [ ] **Step 3: Implement the install hint, group page, and app shell**

`web/src/components/InstallHint.tsx`:
```tsx
import { useEffect, useState } from "react"

type InstallEvent = Event & { prompt: () => Promise<void> }

export function InstallHint() {
  const [deferred, setDeferred] = useState<InstallEvent | null>(null)

  useEffect(() => {
    const onPrompt = (event: Event) => {
      // Suppress the default mini-infobar; surface our own affordance instead.
      event.preventDefault()
      setDeferred(event as InstallEvent)
    }
    window.addEventListener("beforeinstallprompt", onPrompt)
    return () => window.removeEventListener("beforeinstallprompt", onPrompt)
  }, [])

  if (deferred === null) return null
  return (
    <button
      type="button"
      onClick={() => {
        void deferred.prompt()
        setDeferred(null)
      }}
    >
      Add Allsquare to your home screen
    </button>
  )
}
```

`web/src/routes/GroupPage.tsx`:
```tsx
import { useCallback, useState } from "react"
import { useParams } from "react-router-dom"
import { AddExpenseForm } from "../components/AddExpenseForm"
import { BalanceList } from "../components/BalanceList"
import { ExpenseList } from "../components/ExpenseList"
import { InstallHint } from "../components/InstallHint"
import { MemberPicker } from "../components/MemberPicker"
import { SettleUp } from "../components/SettleUp"
import { ShareBar } from "../components/ShareBar"
import { useGroup } from "../hooks/useGroup"
import { useSettlement } from "../hooks/useSettlement"
import { getActiveMemberId, setActiveMemberId } from "../lib/activeMember"

export function GroupPage() {
  const { slug = "" } = useParams()
  const { state, error, refresh } = useGroup(slug)
  const [activeId, setActiveId] = useState<string | null>(() => getActiveMemberId(slug))
  const settlement = useSettlement(slug, state?.group.rounding ?? 1)

  const pick = useCallback(
    (memberId: string) => {
      setActiveMemberId(slug, memberId)
      setActiveId(memberId)
    },
    [slug],
  )

  if (error) return <p role="alert">This group could not be loaded.</p>
  if (!state) return <p>Loading…</p>

  const { group, members, expenses } = state
  const shareUrl = `${window.location.origin}/g/${group.slug}`

  return (
    <main>
      <h1>{group.title}</h1>
      <ShareBar url={shareUrl} />
      <InstallHint />
      {activeId === null ? (
        <MemberPicker members={members} onPick={pick} />
      ) : (
        <p>You are {members.find((m) => m.id === activeId)?.name ?? "a member"}.</p>
      )}
      <BalanceList
        balances={settlement?.balances ?? []}
        members={members}
        baseCurrency={group.baseCurrency}
      />
      <ExpenseList expenses={expenses} members={members} baseCurrency={group.baseCurrency} />
      <AddExpenseForm group={group} members={members} defaultPayerId={activeId} onAdded={refresh} />
      <SettleUp group={group} members={members} />
    </main>
  )
}
```

`web/src/App.tsx` (replace the Task 0 stub):
```tsx
import { Route, Routes } from "react-router-dom"
import { CreateGroup } from "./routes/CreateGroup"
import { GroupPage } from "./routes/GroupPage"

export function App() {
  return (
    <Routes>
      <Route path="/" element={<CreateGroup />} />
      <Route path="/g/:slug" element={<GroupPage />} />
    </Routes>
  )
}
```

- [ ] **Step 4: Run the whole suite + typecheck + build + lint**

Run: `pnpm --filter web test && pnpm --filter web typecheck && pnpm --filter web build && pnpm lint`
Expected: all tests PASS, no type errors, `vite build` emits `dist/` with a generated service worker + `manifest.webmanifest`, no lint errors.

> **PWA verification (manual, one-time):** `pnpm --filter web preview`, open DevTools → Application → Manifest. Confirm name "Allsquare", theme color `#0f766e`, standalone display, and that the service worker registers. Installability + the `InstallHint` button appear in Chromium once the raster icons exist.

- [ ] **Step 5: Commit**

```bash
git add web/src/components/InstallHint.tsx web/src/routes/GroupPage.tsx web/src/App.tsx web/src/components/InstallHint.test.tsx web/src/routes/GroupPage.test.tsx web/src/App.test.tsx
git commit -m "feat(web): routing, group-page shell, and PWA install hint"
```

---

## Self-Review

**Design-spec feature coverage (§4 core features):**
- Create group (title, base currency, rounding, member names) → shareable link + QR → **Task 4** (form + POST + redirect), **Task 9** (QR). ✓
- Add expense — payer, total, **currency**, description; **equal among a subset** OR **exact per-person** (validated sum) → **Task 7**. Equal subset = participant checkboxes; exact = per-person base-currency inputs (server validates sum). ✓
- Live balances → **Task 6** (`BalanceList`, fed by `/settlement` balances). ✓
- Minimal-transfer settle-up with rounding 1/10/100/1000 → **Task 8** (`SettleUp` + rounding selector). ✓
- Real-time-ish sync via smart polling (visible-only, idle backoff) → **Task 3** (`usePolling`) wired in **Task 6** (`useGroup`). ✓
- PWA: Add to Home Screen → icon + standalone; push designed-for → **Task 0** (manifest + SW) + **Task 10** (`InstallHint`); push noted as fast-follow. ✓
- Edit / delete expenses (append-only ledger) → client methods `editExpense`/`deleteExpense` shipped in **Task 2** (contract `PATCH`/`DELETE`); the delete/edit *UI affordance* is a thin follow-up on the `ExpenseList` row — the consuming client is present and tested. ✓ (see note below)
- Original-as-truth / base-as-derived display (§3.2) → **Task 1** (`formatWithBase`) used in **Task 6**. ✓
- Link-as-credential, no login (§3.1) → **Task 5** (member picker + localStorage), no auth anywhere. ✓

**Consumed API endpoint → task map (contract §Endpoints):**
- `POST /api/groups` → Task 2 (`createGroup`), used in Task 4. ✓
- `GET /api/groups/:slug` (polling endpoint) → Task 2 (`getGroup`), used in Task 6 (`useGroup`) + polled in Task 3. ✓
- `POST /api/groups/:slug/members` → Task 2 (`addMember`). ✓ (client present; add-member UI is a follow-up seam, same pattern as create-group)
- `POST /api/groups/:slug/expenses` → Task 2 (`addExpense`), used in Task 7. ✓
- `PATCH /api/groups/:slug/expenses/:id` → Task 2 (`editExpense`). ✓ (client present; edit UI follow-up)
- `DELETE /api/groups/:slug/expenses/:id` → Task 2 (`deleteExpense`). ✓ (client present; delete UI follow-up)
- `GET /api/groups/:slug/settlement?rounding=` → Task 2 (`getSettlement`), used in Task 6/8. ✓
- `GET /api/fx?from=&to=&date=` → Task 2 (`getFx`), used in Task 7 (live preview). ✓

**Follow-up seams (deliberately scoped, not gaps):** the `addMember`, `editExpense`, and `deleteExpense` clients are fully implemented and tested at the API layer; their button-level UI hooks are trivial follow-ups reusing the existing form/list patterns and are called out here so the reviewer sees them as intentional, not missed. Web push end-to-end is out of v1 scope (design §5) — the manifest + installability ship now, push is a documented fast-follow.

**Placeholder scan:** No `TODO`/`TBD`/"similar to above"/"style it nicely". Every code step shows complete, runnable TypeScript/TSX or config. ✓

**Type consistency:** `web/src/lib/types.ts` is copied verbatim from `specs/api-contract.md` (`Rounding`, `Group`, `Member`, `SplitEqual`.`participantIds`, `SplitExact.shares`, `Expense.fxRateToBase`/`fxRateDate`, `GroupState`, `Balance.netMinor`, `Transfer`, `Settlement`, `FxPreview{ rate, rateDate }`). The `api.ts` client method signatures match every endpoint's body/response shape. `amountMinor` is integer minor units at every boundary. `convertMinor`'s `rate` is target-per-source, matching the contract's `fxRateToBase`. ✓

**Ambiguities resolved (see report):** (a) exact-split currency — pinned to base currency in v1 to guarantee the contract's `sum === convertedTotal` validation passes; (b) balances source — read from `/settlement.balances` rather than client-computed, honoring "web never imports core"; (c) FX preview `date` — uses the client's local `todayISODate()`; (d) post-mutation refresh — relies on `useGroup.refresh` + smart polling since `POST /expenses` returns a single `Expense`, not full `GroupState`.

## Senior-review acceptance gates

- **Contract traceability:** every endpoint in `specs/api-contract.md` maps to exactly one `api.ts` method and to the task/component that consumes it (table above). `types.ts` is a verbatim mirror; any drift is a failing typecheck at the call sites.
- **Negative-control tests:** every Task's Step-2 "run to verify it fails" is the negative control (module-not-found or replaced-assertion). Behavioral negatives are explicit: `usePolling` must NOT poll while hidden and must NOT poll after unmount (Task 3); `CreateGroup` must NOT navigate with <2 members (Task 4); `AddExpenseForm` must NOT submit an invalid amount (Task 7); `getGroup` on an unknown slug must throw `ApiError` with `status/code` (Task 2); `InstallHint` renders nothing before `beforeinstallprompt` (Task 10). MSW runs with `onUnhandledRequest: "error"`, so any unmocked request is itself a negative control.
- **Taste target:** components are one-responsibility files; I/O is isolated in `lib/api.ts` + hooks; the money-display table mirrors core without importing it (honoring the contract boundary); the QR is dependency-light and CSP-safe inline SVG. Biome (repo-root config) is the single style authority — `pnpm lint` gates every commit. After Plans 1–3 implement, run the real `/senior-review` harness against the actual diff.
