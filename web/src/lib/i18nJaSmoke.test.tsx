import { act, render, renderHook, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, expect, test } from "vitest"
import { SettleUp } from "../components/SettleUp"
import { Landing } from "../routes/Landing"
import { useLocale } from "./i18n"
import type { Member, Transfer } from "./types"

const members: Member[] = [
  { id: "m1", name: "Alice", sortOrder: 0 },
  { id: "m2", name: "Bob", sortOrder: 1 },
]

// Switches the app-wide locale for the duration of one test via the same
// hook components use, then always restores English so other test files
// (and other tests below) see the default locale again.
function withJapanese(run: () => void) {
  const { result } = renderHook(() => useLocale())
  act(() => result.current[1]("ja"))
  try {
    run()
  } finally {
    act(() => result.current[1]("en"))
  }
}

afterEach(() => localStorage.clear())

test("Landing renders Japanese copy once the locale is switched to ja", () => {
  withJapanese(() => {
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>,
    )
    // Hero headline (heroLine1 + heroLine2, joined across a <br/> so the
    // heading's accessible name concatenates both lines).
    screen.getByRole("heading", { name: /なんでも割り勘。\s*最後はオールスクエア。/ })
    // Closing stamp, localized via the labels prop.
    screen.getByText("精算完了")
  })
})

test("SettleUp renders Japanese copy once the locale is switched to ja", () => {
  withJapanese(() => {
    const transfers: Transfer[] = [{ from: "m2", to: "m1", amountMinor: 15150 }]
    render(
      <SettleUp
        transfers={transfers}
        members={members}
        baseCurrency="JPY"
        onMarkPaid={() => Promise.resolve()}
      />,
    )
    screen.getByText("精算")
    screen.getByText("未精算")
  })
})

test("SettleUp shows the all-square Japanese copy when there are no transfers", () => {
  withJapanese(() => {
    render(
      <SettleUp
        transfers={[]}
        members={members}
        baseCurrency="USD"
        onMarkPaid={() => Promise.resolve()}
      />,
    )
    screen.getByText("全員の精算が完了しました。")
    screen.getByText("精算完了")
  })
})
