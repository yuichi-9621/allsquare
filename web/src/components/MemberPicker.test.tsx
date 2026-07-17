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
