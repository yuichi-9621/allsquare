import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, expect, test, vi } from "vitest"
import type { Expense, Group, Member } from "../lib/types"
import { ShareSummary } from "./ShareSummary"

const group: Group = {
  slug: "abc",
  title: "Kyoto Trip",
  baseCurrency: "USD",
  rounding: 1,
  createdAt: "2026-07-18T00:00:00Z",
}
const members: Member[] = [{ id: "m1", name: "Alice", sortOrder: 0 }]
const expenses: Expense[] = [
  {
    id: "e1",
    payerId: "m1",
    amountMinor: 3000,
    currency: "USD",
    fxRateToBase: 1,
    fxRateDate: "2026-07-18",
    description: "Taxi",
    split: { kind: "equal", participantIds: ["m1"] },
    createdAt: "2026-07-18T00:00:00Z",
  },
]

// jsdom has no canvas: stub a minimal 2d context + toBlob.
function stubCanvas() {
  const ctx = {
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn().mockReturnValue({ width: 100 }),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    beginPath: vi.fn(),
    roundRect: vi.fn(),
    stroke: vi.fn(),
  }
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    ctx as unknown as CanvasRenderingContext2D,
  )
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((cb) => {
    cb(new Blob(["png"], { type: "image/png" }))
  })
  return ctx
}

afterEach(() => vi.restoreAllMocks())

test("hands the rendered card to the native share sheet when available", async () => {
  stubCanvas()
  const share = vi.fn().mockResolvedValue(undefined)
  const canShare = vi.fn().mockReturnValue(true)
  Object.defineProperty(navigator, "share", { value: share, configurable: true })
  Object.defineProperty(navigator, "canShare", { value: canShare, configurable: true })

  const user = userEvent.setup()
  render(<ShareSummary group={group} members={members} expenses={expenses} />)
  await user.click(screen.getByRole("button", { name: "Share trip summary" }))

  await waitFor(() => expect(share).toHaveBeenCalled())
  const arg = share.mock.calls[0]?.[0]
  expect(arg.title).toBe("Kyoto Trip")
  expect(arg.files[0].type).toBe("image/png")
})

test("falls back to a download when Web Share cannot take files", async () => {
  stubCanvas()
  Object.defineProperty(navigator, "share", { value: undefined, configurable: true })
  Object.defineProperty(navigator, "canShare", { value: undefined, configurable: true })
  const createObjectURL = vi.fn().mockReturnValue("blob:card")
  const revokeObjectURL = vi.fn()
  Object.defineProperty(URL, "createObjectURL", { value: createObjectURL, configurable: true })
  Object.defineProperty(URL, "revokeObjectURL", { value: revokeObjectURL, configurable: true })
  const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {})

  const user = userEvent.setup()
  render(<ShareSummary group={group} members={members} expenses={expenses} />)
  await user.click(screen.getByRole("button", { name: "Share trip summary" }))

  await waitFor(() => expect(click).toHaveBeenCalled())
  expect(createObjectURL).toHaveBeenCalled()
  expect(revokeObjectURL).toHaveBeenCalledWith("blob:card")
})
