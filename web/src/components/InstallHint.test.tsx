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
  await waitFor(() => screen.getByRole("button", { name: "Add Allsquare to your home screen" }))
})
