# Allsquare UI Revamp — Component Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `@allsquare/ui` — a token-driven, Storybook-cataloged component
library on shadcn/ui + Tailwind + Radix — and cut the entire `web` app over to it
under the "Stamp" identity, deleting the hand-written CSS.

**Architecture:** New source-consumed workspace package `packages/ui` owns the
Tailwind preset, semantic tokens (two-surface model), self-hosted fonts, primitives,
and Storybook. `web` gains Tailwind/PostCSS, consumes `@allsquare/ui`, and grows a
thin layer of money-domain components. `worker`/`core`/API/money-logic are untouched.

**Tech Stack:** React 18, Vite, Tailwind CSS v3, Radix UI, class-variance-authority,
clsx, tailwind-merge, lucide-react, Storybook 8 (Vite), Vitest + RTL + MSW, Biome.

## Global Constraints

- **Presentation layer only.** No changes to `worker`, `packages/core`, the API
  contract, D1, FX, or money math. Behavior of every screen is preserved.
- **Offline/CSP:** self-hosted `woff2` fonts only; no CDN; no runtime network for UI.
- **Dark-only ship** ("forest cover"); tokens structured for future themes but no
  light theme built (YAGNI).
- **Palette (source of truth), hex → HSL triplet** (rendered color MUST equal the hex):
  - Black Forest `#283618` = `88 39% 15%` — app cover bg / ink on paper
  - Cornsilk `#FEFAE0` = `52 92% 94%` — paper / text on cover
  - Copper `#BC6C25` = `28 67% 44%` — primary / owe / ring
  - Light Caramel `#DDA15E` = `32 65% 62%` — foil accent
  - Olive Leaf `#606C38` = `74 32% 32%` — secondary / all-square seal
  - Owed green `#4E7D2B` = `94 49% 33%` — success/owed status
  - Olive-grey `#7C7A4E` = `57 23% 40%` — muted foreground on paper
- **Semantic rule:** green = good/owed/all-square · copper = action/owe/attention ·
  caramel = foil. Transfer amounts are neutral ink.
- **A11y:** visible copper focus ring on every interactive element; color never the
  sole state signal; `prefers-reduced-motion` respected.
- **Biome** stays the formatter/linter; run `pnpm biome check --write <files>` before each commit.
- Tests: `core` and `worker` suites must stay green and untouched; `web` coverage
  preserved, updated where Radix changes the a11y tree.

---

# PHASE 1 — Foundation (`packages/ui`)

### Task 1: Scaffold the package

**Files:**
- Create: `packages/ui/package.json`
- Create: `packages/ui/tsconfig.json`
- Create: `packages/ui/src/index.ts`

**Interfaces:**
- Produces: workspace package `@allsquare/ui`, entry `src/index.ts` (source-consumed).

- [ ] **Step 1: Write `packages/ui/package.json`**

```json
{
  "name": "@allsquare/ui",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./styles.css": "./src/styles/index.css",
    "./tailwind-preset": "./tailwind-preset.ts"
  },
  "dependencies": {
    "@radix-ui/react-checkbox": "^1.1.2",
    "@radix-ui/react-label": "^2.1.0",
    "@radix-ui/react-popover": "^1.1.2",
    "@radix-ui/react-radio-group": "^1.2.1",
    "@radix-ui/react-select": "^2.1.2",
    "@radix-ui/react-slot": "^1.1.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.1",
    "lucide-react": "^0.454.0",
    "tailwind-merge": "^2.5.4"
  },
  "peerDependencies": { "react": "^18.3.1", "react-dom": "^18.3.1" },
  "devDependencies": {
    "@storybook/addon-a11y": "^8.3.5",
    "@storybook/addon-essentials": "^8.3.5",
    "@storybook/react-vite": "^8.3.5",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.47",
    "storybook": "^8.3.5",
    "tailwindcss": "^3.4.14",
    "tailwindcss-animate": "^1.0.7"
  },
  "scripts": {
    "storybook": "storybook dev -p 6006 --no-open",
    "build-storybook": "storybook build"
  }
}
```

- [ ] **Step 2: Write `packages/ui/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "exactOptionalPropertyTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "skipLibCheck": true,
    "types": ["node"]
  },
  "include": ["src", "tailwind-preset.ts", ".storybook"]
}
```

- [ ] **Step 3: Write a placeholder `packages/ui/src/index.ts`**

```ts
// Barrel — populated as primitives land.
export {}
```

- [ ] **Step 4: Install & verify the workspace resolves**

Run: `pnpm install`
Expected: `@allsquare/ui` appears in the workspace; no resolution errors.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/package.json packages/ui/tsconfig.json packages/ui/src/index.ts pnpm-lock.yaml
git commit -m "feat(ui): scaffold @allsquare/ui package"
```

---

### Task 2: Tokens, theme, and the two-surface model

**Files:**
- Create: `packages/ui/src/styles/tokens.css`
- Create: `packages/ui/src/styles/themes/stamp.css`
- Create: `packages/ui/src/styles/index.css`

**Interfaces:**
- Produces: CSS custom properties for every semantic token; a `.surface-paper`
  context class that re-binds surface tokens; `@layer base` element defaults.

- [ ] **Step 1: Write `packages/ui/src/styles/themes/stamp.css`** (the cover context + paper re-bind)

```css
/* "Stamp" theme. Colors are HSL channel triplets so Tailwind's
   hsl(var(--x) / <alpha>) opacity modifiers work. Rendered values equal the
   source hex in the plan's palette table. */
:root {
  /* cover context (Black Forest ground) */
  --background: 88 39% 15%;      /* #283618 */
  --foreground: 52 92% 94%;      /* #FEFAE0 cornsilk text on cover */
  --card: 52 92% 94%;            /* paper */
  --card-foreground: 88 39% 15%; /* ink on paper */
  --popover: 52 92% 94%;
  --popover-foreground: 88 39% 15%;
  --primary: 28 67% 44%;         /* copper */
  --primary-foreground: 52 92% 94%;
  --secondary: 74 32% 32%;       /* olive */
  --secondary-foreground: 52 92% 94%;
  --muted: 88 30% 22%;
  --muted-foreground: 52 25% 72%;/* dim cornsilk on cover */
  --accent: 32 65% 62%;          /* caramel, used as hover/selected tint base */
  --accent-foreground: 88 39% 15%;
  --border: 52 40% 90% / 0.14;   /* NOTE alpha baked below; see tokens.css usage */
  --border-solid: 52 30% 80%;
  --input: 52 30% 80%;
  --ring: 28 67% 44%;            /* copper focus */
  --foil: 32 65% 62%;            /* caramel */
  --success: 94 49% 33%;         /* owed green */
  --danger: 28 67% 44%;          /* owe copper */
  --radius: 8px;
}

/* Paper context: any subtree that sits on cornsilk re-binds the surface tokens,
   so descendants read ink/olive-grey automatically. Card & Popover add this. */
.surface-paper {
  --foreground: 88 39% 15%;      /* ink */
  --muted-foreground: 57 23% 40%;/* olive-grey #7C7A4E */
  --border-solid: 88 39% 15%;    /* ink hairlines, used at low alpha */
  --success: 94 49% 33%;
  --danger: 28 67% 44%;
}
```

- [ ] **Step 2: Write `packages/ui/src/styles/tokens.css`** (element base layer)

```css
@layer base {
  * { border-color: hsl(var(--border-solid) / 0.16); }
  html { -webkit-text-size-adjust: 100%; }
  body {
    background-color: hsl(var(--background));
    color: hsl(var(--foreground));
    font-family: var(--font-body);
    -webkit-font-smoothing: antialiased;
  }
  :focus-visible { outline: none; box-shadow: 0 0 0 3px hsl(var(--ring) / 0.4); }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation: none !important; transition: none !important; }
  }
}
```

- [ ] **Step 3: Write `packages/ui/src/styles/index.css`** (the import aggregator)

```css
@import "./fonts.css";
@tailwind base;
@import "./themes/stamp.css";
@import "./tokens.css";
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 4: Commit** (fonts.css lands in Task 3; import will resolve then)

```bash
git add packages/ui/src/styles
git commit -m "feat(ui): Stamp theme tokens + two-surface model"
```

---

### Task 3: Self-hosted fonts

**Files:**
- Create: `packages/ui/src/styles/fonts.css`
- Create: `packages/ui/src/fonts/archivo-narrow-600.woff2`
- Create: `packages/ui/src/fonts/ibm-plex-mono-500.woff2`

**Interfaces:**
- Produces: `--font-display`, `--font-mono`, `--font-body` CSS variables.

- [ ] **Step 1: Add Latin-subset woff2 files.** Download OFL-licensed
  Archivo Narrow (600) and IBM Plex Mono (400 + 500), Latin subset, into
  `packages/ui/src/fonts/`. (These are static binary assets — commit them.)

- [ ] **Step 2: Write `packages/ui/src/styles/fonts.css`**

```css
@font-face {
  font-family: "Archivo Narrow";
  font-weight: 600;
  font-display: swap;
  src: url("../fonts/archivo-narrow-600.woff2") format("woff2");
}
@font-face {
  font-family: "IBM Plex Mono";
  font-weight: 500;
  font-display: swap;
  src: url("../fonts/ibm-plex-mono-500.woff2") format("woff2");
}
:root {
  --font-display: "Archivo Narrow", "Arial Narrow", system-ui, sans-serif;
  --font-mono: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  --font-body: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}
```

- [ ] **Step 3: Verify** the `@import "./fonts.css"` in `index.css` resolves (no build error when Storybook boots in Task 6).

- [ ] **Step 4: Commit**

```bash
git add packages/ui/src/fonts packages/ui/src/styles/fonts.css
git commit -m "feat(ui): self-hosted Archivo Narrow + IBM Plex Mono"
```

---

### Task 4: Tailwind preset + `cn()` util

**Files:**
- Create: `packages/ui/tailwind-preset.ts`
- Create: `packages/ui/src/lib/utils.ts`

**Interfaces:**
- Produces: `preset` (Tailwind `Config["presets"][number]`) mapping tokens →
  utilities; `cn(...inputs)` merge helper.

- [ ] **Step 1: Write `packages/ui/src/lib/utils.ts`**

```ts
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 2: Write `packages/ui/tailwind-preset.ts`**

```ts
import type { Config } from "tailwindcss"
import animate from "tailwindcss-animate"

const hsl = (v: string) => `hsl(var(--${v}) / <alpha-value>)`

export const preset = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: hsl("background"),
        foreground: hsl("foreground"),
        card: { DEFAULT: hsl("card"), foreground: hsl("card-foreground") },
        popover: { DEFAULT: hsl("popover"), foreground: hsl("popover-foreground") },
        primary: { DEFAULT: hsl("primary"), foreground: hsl("primary-foreground") },
        secondary: { DEFAULT: hsl("secondary"), foreground: hsl("secondary-foreground") },
        muted: { DEFAULT: hsl("muted"), foreground: hsl("muted-foreground") },
        accent: { DEFAULT: hsl("accent"), foreground: hsl("accent-foreground") },
        border: hsl("border-solid"),
        input: hsl("input"),
        ring: hsl("ring"),
        foil: hsl("foil"),
        success: hsl("success"),
        danger: hsl("danger"),
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        mono: ["var(--font-mono)"],
        body: ["var(--font-body)"],
      },
      keyframes: {
        "stamp-in": {
          "0%": { transform: "rotate(-10deg) scale(1.6)", opacity: "0" },
          "60%": { transform: "rotate(-10deg) scale(0.92)", opacity: "1" },
          "100%": { transform: "rotate(-10deg) scale(1)", opacity: "1" },
        },
      },
      animation: { "stamp-in": "stamp-in 0.3s ease-out both" },
    },
  },
  plugins: [animate],
} satisfies Partial<Config>

export default preset
```

- [ ] **Step 3: Commit**

```bash
git add packages/ui/tailwind-preset.ts packages/ui/src/lib/utils.ts
git commit -m "feat(ui): tailwind preset + cn util"
```

---

### Task 5: Storybook harness

**Files:**
- Create: `packages/ui/.storybook/main.ts`
- Create: `packages/ui/.storybook/preview.ts`
- Create: `packages/ui/tailwind.config.ts`
- Create: `packages/ui/postcss.config.js`

**Interfaces:**
- Consumes: `preset` (Task 4), `index.css` (Task 2).
- Produces: a running Storybook rendering stories in the Stamp theme on the cover bg.

- [ ] **Step 1: Write `packages/ui/tailwind.config.ts`**

```ts
import type { Config } from "tailwindcss"
import { preset } from "./tailwind-preset"

export default {
  presets: [preset],
  content: ["./src/**/*.{ts,tsx}", "./.storybook/**/*.{ts,tsx}"],
} satisfies Config
```

- [ ] **Step 2: Write `packages/ui/postcss.config.js`**

```js
export default { plugins: { tailwindcss: {}, autoprefixer: {} } }
```

- [ ] **Step 3: Write `packages/ui/.storybook/main.ts`**

```ts
import type { StorybookConfig } from "@storybook/react-vite"

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-essentials", "@storybook/addon-a11y"],
  framework: { name: "@storybook/react-vite", options: {} },
}
export default config
```

- [ ] **Step 4: Write `packages/ui/.storybook/preview.ts`**

```ts
import type { Preview } from "@storybook/react"
import "../src/styles/index.css"

const preview: Preview = {
  parameters: {
    backgrounds: { default: "cover", values: [{ name: "cover", value: "#283618" }] },
    layout: "centered",
  },
}
export default preview
```

- [ ] **Step 5: Verify Storybook boots**

Run: `pnpm --filter @allsquare/ui storybook`
Expected: server starts on :6006 with no story yet (empty), no CSS/import errors.

- [ ] **Step 6: Commit**

```bash
git add packages/ui/.storybook packages/ui/tailwind.config.ts packages/ui/postcss.config.js
git commit -m "feat(ui): Storybook + Tailwind build for the library"
```

---

### Task 6: `Button`

**Files:**
- Create: `packages/ui/src/components/ui/button.tsx`
- Create: `packages/ui/src/components/ui/button.stories.tsx`
- Test: `packages/ui/src/components/ui/button.test.tsx`
- Modify: `packages/ui/src/index.ts`

**Interfaces:**
- Produces: `Button`, `buttonVariants`. Variants: `primary` (copper, default),
  `secondary` (olive), `outline`, `ghost`; sizes: `default`, `sm`, `lg`. Supports
  `asChild` via Radix Slot.

- [ ] **Step 1: Write the failing test** `button.test.tsx`

```tsx
import { render, screen } from "@testing-library/react"
import { expect, test } from "vitest"
import { Button } from "./button"

test("renders a button with its label and the primary variant class", () => {
  render(<Button>Add expense</Button>)
  const btn = screen.getByRole("button", { name: "Add expense" })
  expect(btn.className).toContain("bg-primary")
})

test("secondary variant uses the olive token", () => {
  render(<Button variant="secondary">Cancel</Button>)
  expect(screen.getByRole("button", { name: "Cancel" }).className).toContain("bg-secondary")
})
```

- [ ] **Step 2: Run it — expect FAIL** (`Cannot find module './button'`).

Run: `pnpm --filter @allsquare/ui exec vitest run src/components/ui/button.test.tsx`

- [ ] **Step 3: Write `button.tsx`**

```tsx
import { Slot } from "@radix-ui/react-slot"
import { type VariantProps, cva } from "class-variance-authority"
import * as React from "react"
import { cn } from "../../lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-display font-semibold uppercase tracking-wide transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] hover:bg-primary/90",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/90",
        outline: "border border-border bg-transparent hover:bg-foreground/5",
        ghost: "bg-transparent hover:bg-foreground/5",
      },
      size: {
        default: "h-11 px-4 text-sm",
        sm: "h-9 px-3 text-xs",
        lg: "h-12 px-5 text-sm",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return <Comp ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />
  },
)
Button.displayName = "Button"
export { buttonVariants }
```

- [ ] **Step 4: Run tests — expect PASS.**

- [ ] **Step 5: Write `button.stories.tsx`**

```tsx
import type { Meta, StoryObj } from "@storybook/react"
import { Button } from "./button"

const meta: Meta<typeof Button> = { title: "UI/Button", component: Button }
export default meta
type Story = StoryObj<typeof Button>

export const Primary: Story = { args: { children: "Add expense" } }
export const Secondary: Story = { args: { variant: "secondary", children: "Add member" } }
export const Outline: Story = { args: { variant: "outline", children: "Cancel" } }
export const Ghost: Story = { args: { variant: "ghost", children: "Edit" } }
```

- [ ] **Step 6: Export from `src/index.ts`**

```ts
export { Button, buttonVariants } from "./components/ui/button"
export type { ButtonProps } from "./components/ui/button"
export { cn } from "./lib/utils"
```

- [ ] **Step 7: Biome + commit**

```bash
pnpm biome check --write packages/ui/src
git add packages/ui/src/components/ui/button.tsx packages/ui/src/components/ui/button.stories.tsx packages/ui/src/components/ui/button.test.tsx packages/ui/src/index.ts
git commit -m "feat(ui): Button primitive"
```

---

### Task 7: `Input` and `Label`

**Files:**
- Create: `packages/ui/src/components/ui/input.tsx`, `label.tsx`
- Create: stories for each
- Test: `packages/ui/src/components/ui/input.test.tsx`
- Modify: `packages/ui/src/index.ts`

**Interfaces:**
- Produces: `Input` (styled `<input>`), `Label` (Radix Label). Both forward refs.

- [ ] **Step 1: Failing test** `input.test.tsx`

```tsx
import { render, screen } from "@testing-library/react"
import { expect, test } from "vitest"
import { Input } from "./input"
import { Label } from "./label"

test("label is associated with its input via htmlFor", () => {
  render(<><Label htmlFor="desc">Description</Label><Input id="desc" /></>)
  expect(screen.getByLabelText("Description")).toBeDefined()
})
```

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Write `input.tsx`**

```tsx
import * as React from "react"
import { cn } from "../../lib/utils"

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex h-11 w-full rounded-md border border-input bg-card px-3 text-base text-card-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = "Input"
```

- [ ] **Step 4: Write `label.tsx`**

```tsx
import * as LabelPrimitive from "@radix-ui/react-label"
import * as React from "react"
import { cn } from "../../lib/utils"

export const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn("font-mono text-xs uppercase tracking-wider text-muted-foreground", className)}
    {...props}
  />
))
Label.displayName = "Label"
```

- [ ] **Step 5: Run test — expect PASS. Add stories.** (`Input` on a paper Card; `Label` above an `Input`.)

- [ ] **Step 6: Export, Biome, commit** (`feat(ui): Input + Label primitives`).

---

### Task 8: `Card` (paper context) and `Badge`

**Files:**
- Create: `packages/ui/src/components/ui/card.tsx`, `badge.tsx` + stories
- Test: `packages/ui/src/components/ui/card.test.tsx`
- Modify: `src/index.ts`

**Interfaces:**
- Produces: `Card`, `CardHeader`, `CardTitle`, `CardContent` (Card adds
  `.surface-paper`). `Badge`, variants `foil` (default), `success`, `danger`, `muted`.

- [ ] **Step 1: Failing test** `card.test.tsx`

```tsx
import { render } from "@testing-library/react"
import { expect, test } from "vitest"
import { Card } from "./card"

test("Card establishes the paper surface context", () => {
  const { container } = render(<Card>x</Card>)
  expect(container.firstElementChild?.className).toContain("surface-paper")
})
```

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Write `card.tsx`**

```tsx
import * as React from "react"
import { cn } from "../../lib/utils"

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "surface-paper rounded-lg border border-border/20 bg-card text-card-foreground shadow-[0_1px_0_rgba(255,255,255,0.4)_inset,0_10px_24px_-16px_rgba(0,0,0,0.5)]",
        className,
      )}
      {...props}
    />
  ),
)
Card.displayName = "Card"

export const CardHeader = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex items-baseline justify-between gap-2 p-3.5 pb-2", className)} {...p} />
)
export const CardTitle = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("font-semibold", className)} {...p} />
)
export const CardContent = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col gap-1.5 px-3.5 pb-3.5", className)} {...p} />
)
```

- [ ] **Step 4: Write `badge.tsx`**

```tsx
import { type VariantProps, cva } from "class-variance-authority"
import type * as React from "react"
import { cn } from "../../lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-xs tabular-nums",
  {
    variants: {
      variant: {
        foil: "border-foil/50 bg-foil/20 text-foil",
        success: "border-success/50 bg-success/15 text-success font-semibold",
        danger: "border-danger/55 bg-danger/15 text-danger font-semibold",
        muted: "border-border text-muted-foreground",
      },
    },
    defaultVariants: { variant: "foil" },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge = ({ className, variant, ...props }: BadgeProps) => (
  <span className={cn(badgeVariants({ variant }), className)} {...props} />
)
export { badgeVariants }
```

- [ ] **Step 5: Run test — expect PASS. Add stories** (a `Card` on the cover bg showing header+content; `Badge` in all four variants — this is the two-surface validation).

- [ ] **Step 6: Export, Biome, commit** (`feat(ui): Card (paper context) + Badge`).

---

### Task 9: `Select` (Radix)

**Files:**
- Create: `packages/ui/src/components/ui/select.tsx` + story
- Test: `packages/ui/src/components/ui/select.test.tsx`
- Modify: `src/index.ts`

**Interfaces:**
- Produces: `Select, SelectTrigger, SelectValue, SelectContent, SelectItem`
  (re-exported Radix parts, themed). Trigger has role `combobox`; opening reveals a
  `listbox` of `option`s.

- [ ] **Step 1: Failing test** `select.test.tsx` (documents the Radix interaction the app tests will use)

```tsx
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { expect, test, vi } from "vitest"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select"

test("opens and selects an option", async () => {
  const onValueChange = vi.fn()
  const user = userEvent.setup()
  render(
    <Select onValueChange={onValueChange}>
      <SelectTrigger aria-label="Currency"><SelectValue placeholder="USD" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="USD">USD</SelectItem>
        <SelectItem value="EUR">EUR</SelectItem>
      </SelectContent>
    </Select>,
  )
  await user.click(screen.getByRole("combobox", { name: "Currency" }))
  await user.click(await screen.findByRole("option", { name: "EUR" }))
  expect(onValueChange).toHaveBeenCalledWith("EUR")
})
```

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Write `select.tsx`** (standard shadcn Select source, themed to tokens — full component below)

```tsx
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown } from "lucide-react"
import * as React from "react"
import { cn } from "../../lib/utils"

export const Select = SelectPrimitive.Root
export const SelectValue = SelectPrimitive.Value

export const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex h-11 w-full items-center justify-between rounded-md border border-input bg-card px-3 text-base text-card-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
      className,
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild><ChevronDown className="h-4 w-4 opacity-60" /></SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = "SelectTrigger"

export const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      position={position}
      className={cn(
        "surface-paper z-50 min-w-[8rem] overflow-hidden rounded-md border border-border/20 bg-popover text-popover-foreground shadow-lg",
        className,
      )}
      {...props}
    >
      <SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
))
SelectContent.displayName = "SelectContent"

export const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none data-[highlighted]:bg-accent/30",
      className,
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator><Check className="h-4 w-4" /></SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
))
SelectItem.displayName = "SelectItem"
```

- [ ] **Step 4: Add jsdom shims** so Radix Select mounts in tests. Create `packages/ui/vitest.setup.ts`:

```ts
import "@testing-library/jest-dom/vitest"

class RO { observe() {} unobserve() {} disconnect() {} }
globalThis.ResizeObserver ??= RO as unknown as typeof ResizeObserver
if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {}
if (!Element.prototype.hasPointerCapture) Element.prototype.hasPointerCapture = () => false
if (!Element.prototype.releasePointerCapture) Element.prototype.releasePointerCapture = () => {}
```

And create `packages/ui/vitest.config.ts`:

```ts
import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [react()],
  test: { environment: "jsdom", globals: true, setupFiles: ["./vitest.setup.ts"] },
})
```

Add to `packages/ui/package.json` devDeps: `"@testing-library/react"`,
`"@testing-library/user-event"`, `"@testing-library/jest-dom"`, `"@vitejs/plugin-react"`,
`"jsdom"`, `"vitest"`; add script `"test": "vitest run"`. Run `pnpm install`.

- [ ] **Step 5: Run tests — expect PASS. Add story.**

- [ ] **Step 6: Export, Biome, commit** (`feat(ui): Select primitive + jsdom test setup`).

---

### Task 10: `Checkbox` and `RadioGroup`

**Files:**
- Create: `packages/ui/src/components/ui/checkbox.tsx`, `radio-group.tsx` + stories
- Test: `packages/ui/src/components/ui/choice.test.tsx`
- Modify: `src/index.ts`

**Interfaces:**
- Produces: `Checkbox` (role `checkbox`), `RadioGroup` + `RadioGroupItem` (role
  `radiogroup`/`radio`). Accessible names preserved for RTL.

- [ ] **Step 1: Failing test** `choice.test.tsx`

```tsx
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { expect, test, vi } from "vitest"
import { Checkbox } from "./checkbox"
import { RadioGroup, RadioGroupItem } from "./radio-group"

test("checkbox toggles", async () => {
  const onCheckedChange = vi.fn()
  const user = userEvent.setup()
  render(<Checkbox aria-label="Alice" onCheckedChange={onCheckedChange} />)
  await user.click(screen.getByRole("checkbox", { name: "Alice" }))
  expect(onCheckedChange).toHaveBeenCalledWith(true)
})

test("radio group selects", async () => {
  const user = userEvent.setup()
  render(
    <RadioGroup defaultValue="equal">
      <RadioGroupItem value="equal" aria-label="Equal" />
      <RadioGroupItem value="exact" aria-label="Exact" />
    </RadioGroup>,
  )
  await user.click(screen.getByRole("radio", { name: "Exact" }))
  expect(screen.getByRole("radio", { name: "Exact" })).toBeChecked()
})
```

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Write `checkbox.tsx`**

```tsx
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check } from "lucide-react"
import * as React from "react"
import { cn } from "../../lib/utils"

export const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "peer h-5 w-5 shrink-0 rounded-sm border border-input focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="flex items-center justify-center">
      <Check className="h-4 w-4" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
Checkbox.displayName = "Checkbox"
```

- [ ] **Step 4: Write `radio-group.tsx`**

```tsx
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group"
import { Circle } from "lucide-react"
import * as React from "react"
import { cn } from "../../lib/utils"

export const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Root ref={ref} className={cn("flex flex-col gap-2", className)} {...props} />
))
RadioGroup.displayName = "RadioGroup"

export const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Item
    ref={ref}
    className={cn(
      "aspect-square h-5 w-5 rounded-full border border-input focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 data-[state=checked]:border-primary",
      className,
    )}
    {...props}
  >
    <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
      <Circle className="h-2.5 w-2.5 fill-primary text-primary" />
    </RadioGroupPrimitive.Indicator>
  </RadioGroupPrimitive.Item>
))
RadioGroupItem.displayName = "RadioGroupItem"
```

- [ ] **Step 5: Run — expect PASS. Add stories. Export, Biome, commit** (`feat(ui): Checkbox + RadioGroup`).

---

### Task 11: `Popover`

**Files:**
- Create: `packages/ui/src/components/ui/popover.tsx` + story
- Test: `packages/ui/src/components/ui/popover.test.tsx`
- Modify: `src/index.ts`

**Interfaces:**
- Produces: `Popover, PopoverTrigger, PopoverContent` (themed Radix Popover; content
  on paper surface). Used for the ⋮ trip menu.

- [ ] **Step 1: Failing test** `popover.test.tsx`

```tsx
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { expect, test } from "vitest"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"

test("opens on trigger click", async () => {
  const user = userEvent.setup()
  render(
    <Popover>
      <PopoverTrigger aria-label="Trip menu">⋮</PopoverTrigger>
      <PopoverContent>Rename trip</PopoverContent>
    </Popover>,
  )
  expect(screen.queryByText("Rename trip")).toBeNull()
  await user.click(screen.getByRole("button", { name: "Trip menu" }))
  expect(await screen.findByText("Rename trip")).toBeDefined()
})
```

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Write `popover.tsx`**

```tsx
import * as PopoverPrimitive from "@radix-ui/react-popover"
import * as React from "react"
import { cn } from "../../lib/utils"

export const Popover = PopoverPrimitive.Root
export const PopoverTrigger = PopoverPrimitive.Trigger

export const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "end", sideOffset = 6, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "surface-paper z-50 w-80 max-w-[82vw] rounded-md border border-border/20 bg-popover p-4 text-popover-foreground shadow-lg",
        className,
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
))
PopoverContent.displayName = "PopoverContent"
```

- [ ] **Step 4: Run — expect PASS. Add story. Export, Biome, commit** (`feat(ui): Popover`).

---

### Task 12: `Stamp` (signature component)

**Files:**
- Create: `packages/ui/src/components/stamp.tsx` + story
- Test: `packages/ui/src/components/stamp.test.tsx`
- Modify: `src/index.ts`

**Interfaces:**
- Produces: `Stamp({ state, className })`, `state: "pending" | "square"`. Pending =
  dashed olive-grey "Not yet square"; square = solid olive "All square" with
  `stamp-in` animation (reduced-motion safe via the base layer).

- [ ] **Step 1: Failing test** `stamp.test.tsx`

```tsx
import { render, screen } from "@testing-library/react"
import { expect, test } from "vitest"
import { Stamp } from "./stamp"

test("pending shows the not-yet label", () => {
  render(<Stamp state="pending" />)
  expect(screen.getByText(/not yet square/i)).toBeDefined()
})

test("square shows the all-square seal", () => {
  render(<Stamp state="square" />)
  expect(screen.getByText(/all square/i)).toBeDefined()
})
```

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Write `stamp.tsx`**

```tsx
import { cn } from "../lib/utils"

export function Stamp({ state, className }: { state: "pending" | "square"; className?: string }) {
  const base = "inline-block -rotate-[10deg] rounded-md border-2 px-1.5 py-0.5 font-mono text-[0.55rem] uppercase tracking-widest"
  if (state === "square") {
    return (
      <span className={cn(base, "animate-stamp-in border-secondary text-secondary", className)}>
        All square
      </span>
    )
  }
  return (
    <span className={cn(base, "border-dashed border-muted-foreground/60 text-muted-foreground", className)}>
      Not yet square
    </span>
  )
}
```

- [ ] **Step 4: Run — expect PASS. Add story (both states). Export, Biome, commit** (`feat(ui): Stamp signature component`).

- [ ] **Step 5: Build Storybook to confirm the catalog is whole**

Run: `pnpm --filter @allsquare/ui build-storybook`
Expected: builds with no errors; every primitive + Stamp has a story.

---

# PHASE 2 — App wiring + domain components (`web`)

### Task 13: Wire Tailwind + `@allsquare/ui` into `web`

**Files:**
- Modify: `web/package.json` (add dep + devDeps)
- Create: `web/tailwind.config.ts`, `web/postcss.config.js`, `web/src/index.css`
- Modify: `web/src/main.tsx` (swap the stylesheet import)
- Modify: `web/vite.config.ts` (ensure PostCSS picked up — usually automatic)

**Interfaces:**
- Consumes: `@allsquare/ui` preset + styles.
- Produces: Tailwind active in `web`; token/font CSS loaded; `styles.css` still
  present (deleted in P4) but no longer imported.

- [ ] **Step 1:** Add to `web/package.json`: `dependencies` → `"@allsquare/ui": "workspace:*"`;
  `devDependencies` → `"tailwindcss": "^3.4.14"`, `"autoprefixer": "^10.4.20"`,
  `"postcss": "^8.4.47"`, `"tailwindcss-animate": "^1.0.7"`. Run `pnpm install`.

- [ ] **Step 2: Write `web/tailwind.config.ts`**

```ts
import { preset } from "@allsquare/ui/tailwind-preset"
import type { Config } from "tailwindcss"

export default {
  presets: [preset],
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
    "../packages/ui/src/**/*.{ts,tsx}",
  ],
} satisfies Config
```

- [ ] **Step 3: Write `web/postcss.config.js`**

```js
export default { plugins: { tailwindcss: {}, autoprefixer: {} } }
```

- [ ] **Step 4: Write `web/src/index.css`**

```css
@import "@allsquare/ui/styles.css";
```

- [ ] **Step 5:** In `web/src/main.tsx`, replace `import "./styles.css"` with
  `import "./index.css"`.

- [ ] **Step 6: Verify** the dev server renders the app on the forest background with
  fonts loaded (screens still use old markup — that's fine; only the ground/typography
  shift). Run: `pnpm --filter web dev` and spot-check.

- [ ] **Step 7:** Run the full web suite to confirm nothing broke from the CSS swap.

Run: `pnpm --filter web exec vitest run`
Expected: PASS (markup unchanged; only styling source changed).

- [ ] **Step 8: Commit** (`feat(web): adopt Tailwind + @allsquare/ui`).

---

### Task 14: `MoneyAmount` + `BalanceChip`

**Files:**
- Create: `web/src/components/MoneyAmount.tsx`, `BalanceChip.tsx`
- Test: `web/src/components/MoneyAmount.test.tsx`, `BalanceChip.test.tsx`

**Interfaces:**
- Consumes: `formatMoney`, `formatWithBase` from `web/src/lib/money`; `Badge` from `@allsquare/ui`.
- Produces:
  - `MoneyAmount({ amountMinor, currency, baseValue?, className? })` → mono, tabular; when
    `baseValue` given, renders `formatWithBase`.
  - `BalanceChip({ netMinor, baseCurrency, name })` → `Badge` `success` when `netMinor > 0`,
    `danger` when `< 0`, `muted` when `0`; text like `Bob +$48.80` / `Carol −$42.40`.

- [ ] **Step 1: Failing tests** — assert `MoneyAmount` renders `$36.00` for
  `{amountMinor:3600,currency:"USD"}`; `BalanceChip` for `netMinor:4880` contains
  `+$48.80` and for `-4240` contains `−$42.40` (minus sign U+2212), and the owed one
  carries `text-success` / owe carries `text-danger` via the Badge variant.

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Implement.** `MoneyAmount`:

```tsx
import { formatMoney, formatWithBase } from "../lib/money"

export function MoneyAmount({
  amountMinor, currency, baseCurrency, baseValue, className,
}: {
  amountMinor: number; currency: string; baseCurrency?: string; baseValue?: number; className?: string
}) {
  const text =
    baseValue !== undefined && baseCurrency && baseCurrency !== currency
      ? formatWithBase(amountMinor, currency, baseValue, baseCurrency)
      : formatMoney(amountMinor, currency)
  return <span className={`font-mono tabular-nums ${className ?? ""}`}>{text}</span>
}
```

`BalanceChip`:

```tsx
import { Badge, cn } from "@allsquare/ui"
import { formatMoney } from "../lib/money"

export function BalanceChip({ netMinor, baseCurrency, name }: { netMinor: number; baseCurrency: string; name: string }) {
  const variant = netMinor > 0 ? "success" : netMinor < 0 ? "danger" : "muted"
  const sign = netMinor > 0 ? "+" : netMinor < 0 ? "−" : ""
  const amount = formatMoney(Math.abs(netMinor), baseCurrency)
  return <Badge variant={variant} className={cn("gap-1")}>{name} {sign}{amount}</Badge>
}
```

(Match the exact `formatMoney`/`formatWithBase` signatures found in `web/src/lib/money.ts`;
adjust argument order if the real signatures differ.)

- [ ] **Step 4: Run — expect PASS. Biome, commit** (`feat(web): MoneyAmount + BalanceChip`).

---

### Task 15: `ExpenseCard` + `SettleRow`

**Files:**
- Create: `web/src/components/ExpenseCard.tsx`, `SettleRow.tsx`
- Test: `web/src/components/ExpenseCard.test.tsx`, `SettleRow.test.tsx`

**Interfaces:**
- Consumes: `Card`, `CardHeader`, `CardTitle`, `CardContent`, `Button` from
  `@allsquare/ui`; `MoneyAmount`; `splitEqualMinor`, `minorToInput` from `lib/money`;
  `Expense`, `Member` from `lib/types`.
- Produces:
  - `ExpenseCard({ expense, members, baseCurrency, onEdit, onDelete })` — replaces the
    per-`<li>` body of today's `ExpenseList`. Renders desc + `MoneyAmount` total, "{payer}
    paid", a **stacked breakdown** (equal → `splitEqualMinor`; exact → `expense.split.shares`)
    in the expense's own currency with a `foil` left rule, and Edit/Delete `Button`s.
    Accessible names preserved: `Edit {desc}`, `Delete {desc}`.
  - `SettleRow({ transfer, members, baseCurrency })` — "A → B" + neutral-ink `MoneyAmount`.

- [ ] **Step 1: Failing tests** — port the existing `ExpenseList.test.tsx` expectations
  (desc text, payer line, per-person breakdown amount, `Edit Taxi`/`Delete Taxi` buttons)
  onto `ExpenseCard`. `SettleRow` asserts the "Alice → Bob" text and amount.

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Implement** both, composing library primitives. Preserve the exact
  breakdown math and accessible names the current `ExpenseList` uses (read
  `web/src/components/ExpenseList.tsx` for the precise structure and reuse it).

- [ ] **Step 4: Run — expect PASS. Biome, commit** (`feat(web): ExpenseCard + SettleRow`).

---

# PHASE 3 — Screen cutover + test migration

> Each task migrates one unit to library primitives/domain components, updates that
> unit's tests to any Radix-changed queries, and keeps behavior identical. Read the
> current file before editing; keep all `aria-label`/role/text accessible names.

### Task 16: `ExpenseForm` (largest — Select/RadioGroup/Checkbox/Input/Button)

**Files:**
- Modify: `web/src/components/ExpenseForm.tsx`
- Modify: `web/src/components/ExpenseForm.test.tsx`

**Interfaces:**
- Consumes: `Select*`, `RadioGroup`, `RadioGroupItem`, `Checkbox`, `Input`, `Label`,
  `Button` from `@allsquare/ui`.

- [ ] **Step 1: Update the tests first.** Rewrite the currency/payer interactions to the
  Radix Select pattern (`click combobox` → `click option`) and the split radios to
  Radix roles. Keep every assertion about POSTed bodies, previews, and totals identical.
  Example — currency selection becomes:

```tsx
await user.click(screen.getByRole("combobox", { name: "Currency" }))
await user.click(await screen.findByRole("option", { name: "JPY" }))
```

- [ ] **Step 2: Run the updated tests — expect FAIL** (form still native).

- [ ] **Step 3: Migrate `ExpenseForm.tsx`.** Replace native `<select>`→`Select*`,
  radios→`RadioGroup`/`RadioGroupItem`, checkboxes→`Checkbox`, inputs→`Input`,
  labels→`Label`, buttons→`Button`. Preserve controlled state, validation, the
  `≈ base` preview, exact/equal logic, and all accessible names. The form element and
  its `aria-label` ("Add expense"/"Edit expense") stay.

- [ ] **Step 4: Run — expect PASS.**

- [ ] **Step 5: Biome, commit** (`feat(web): migrate ExpenseForm to @allsquare/ui`).

---

### Task 17: `TripMenu` → `Popover`

**Files:**
- Modify: `web/src/components/TripMenu.tsx`, `web/src/components/TripMenu.test.tsx`

**Interfaces:**
- Consumes: `Popover`, `PopoverTrigger`, `PopoverContent`, `Button`, `Select*` from `@allsquare/ui`.

- [ ] **Step 1: Update tests** to Radix Popover open/close (`getByRole("button", { name: "Trip menu" })`
  toggles; menu items appear on open). Keep the rounding control's behavior; rewrite its
  interaction to Radix Select. Preserve the rename/share/add-member/rounding sections.

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Migrate** the hand-rolled disclosure to `Popover`; drop the manual
  click-outside/`aria-expanded` code (Radix handles it). Keep child components
  (`RenameTrip`, `ShareBar`, `AddMember`, rounding select) inside `PopoverContent`.

- [ ] **Step 4: Run — expect PASS. Biome, commit** (`feat(web): TripMenu on Popover`).

---

### Task 18: Remaining components

**Files (modify each + its test where present):**
- `AddMember.tsx`, `RenameTrip.tsx` (Input/Label/Button)
- `MemberPicker.tsx` (Button chips)
- `ShareBar.tsx` (Button + Card frame), `QrCode.tsx` (restyled frame only)
- `BalanceList.tsx` → render `BalanceChip`s; `SettleUp.tsx` → `SettleRow`s + `Stamp`
- `ExpenseList.tsx` → render `ExpenseCard`s
- `TripCard.tsx` (Card + Badge + status), `InstallHint.tsx` (styled note)

**Interfaces:** each consumes the relevant primitives/domain components; behavior and
accessible names unchanged.

- [ ] **Step 1:** For each component with a test, update queries only where a Radix
  primitive changes them (most are stable — Button/text/Badge). For `SettleUp`, add the
  `Stamp` (`state={transfers.length === 0 ? "square" : "pending"}`) and assert both states.
- [ ] **Step 2:** Migrate each component's markup to primitives; keep props/roles.
- [ ] **Step 3:** Run `pnpm --filter web exec vitest run` — expect PASS after each.
- [ ] **Step 4: Biome, commit** in small batches (`feat(web): migrate <components>`).

---

### Task 19: Routes — `CreateGroup`, `Dashboard`, `GroupPage`

**Files:**
- Modify: `web/src/routes/CreateGroup.tsx`, `Dashboard.tsx`, `GroupPage.tsx` + their tests

**Interfaces:** consume primitives + domain components; preserve the shipped IA
(hero on Create; dashboard cards/empty state; GroupPage header+⋮, identity, collapsed
add-expense button, expense list, settle-up-last with the `Stamp`).

- [ ] **Step 1:** Update route tests for any Radix-changed queries (e.g. the
  collapsed-form open button and Cancel remain plain `Button`s → stable; the ⋮ menu is
  now Popover → already covered by Task 17). Keep the collapse/edit tests from the last
  change intact.
- [ ] **Step 2:** Migrate each route's markup. Replace `.hero`, `.trip-header`,
  `.add-expense-open`, section labels, etc. with primitives + Tailwind classes derived
  from tokens. The `add-expense-open` becomes a `Button` (full width).
- [ ] **Step 3:** Run the full web suite — expect PASS.
- [ ] **Step 4: Biome, commit** (`feat(web): migrate routes to @allsquare/ui`).

---

# PHASE 4 — Retire & ship

### Task 20: Delete `styles.css` and dead CSS

**Files:**
- Delete: `web/src/styles.css`
- Grep: confirm no remaining `import "./styles.css"` or class names it defined.

- [ ] **Step 1:** `grep -rn "styles.css" web/src` → expect no import references.
- [ ] **Step 2:** `grep -rn "className=\"\(app\|trip-header\|expense-\|add-expense-slot\|hero\|menu-panel\)" web/src`
  → confirm no orphaned hand-CSS class names remain (all replaced by Tailwind).
- [ ] **Step 3:** Delete `web/src/styles.css`.
- [ ] **Step 4:** Run full web suite + `tsc --noEmit` + Storybook build — expect all green.
- [ ] **Step 5: Commit** (`chore(web): remove hand-written styles.css`).

### Task 21: Final verification + deploy

- [ ] **Step 1:** Run every suite: `pnpm --filter @allsquare/core test`,
  `pnpm --filter worker test`, `pnpm --filter web exec vitest run`,
  `pnpm --filter @allsquare/ui test` — all green.
- [ ] **Step 2:** `pnpm biome check` clean; each package `tsc --noEmit` clean.
- [ ] **Step 3:** `VITE_API_BASE=https://api.all-sqr.com pnpm --filter web build` — succeeds;
  note the gzipped JS/CSS delta vs the pre-revamp bundle.
- [ ] **Step 4:** `pnpm --filter @allsquare/ui build-storybook` — succeeds.
- [ ] **Step 5: Deploy** `./worker/node_modules/.bin/wrangler pages deploy web/dist --project-name allsquare --branch main`.
- [ ] **Step 6: e2e-verify** on `https://all-sqr.com`: 200; create a trip, add an expense,
  confirm the Stamp identity renders (paper cards, copper actions, owed/owe colors,
  pending→all-square stamp) and behavior is unchanged.
- [ ] **Step 7:** Final merge to `main` + push; update the project memory note.

---

## Self-review notes

- **Spec coverage:** foundation (P1) → tokens/fonts/preset/Storybook/all primitives;
  wiring + domain (P2); every screen & component (P3); retire + ship (P4). All spec
  sections map to tasks.
- **Type consistency:** `MoneyAmount`/`BalanceChip` argument names must match the real
  `lib/money` signatures — Task 14 flags the check. Select interaction pattern is fixed
  once in Task 9 and reused verbatim in Tasks 16–17.
- **Known adaptation:** exact HSL triplets are given; implementer verifies rendered
  color equals the source hex. Font files are fetched from OFL sources at Task 3.
