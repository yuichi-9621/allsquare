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
