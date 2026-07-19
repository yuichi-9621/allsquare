import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { expect, test, vi } from "vitest"
import type { Rounding } from "../lib/types"
import { TripMenu } from "./TripMenu"

function renderMenu(props: Partial<Parameters<typeof TripMenu>[0]> = {}) {
  const onRounding = vi.fn()
  const onChanged = vi.fn()
  render(
    <MemoryRouter>
      <TripMenu
        slug="abc"
        title="Kyoto"
        shareUrl="https://all-sqr.com/g/abc"
        rounding={undefined}
        onRounding={onRounding}
        onChanged={onChanged}
        {...props}
      />
    </MemoryRouter>,
  )
  return { onRounding }
}

test("is a collapsed menu of actions until the ⋮ is opened", async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 })
  renderMenu()
  // collapsed: no menu, no dialogs
  expect(screen.queryByRole("menu")).toBeNull()
  expect(screen.queryByRole("dialog")).toBeNull()

  await user.click(screen.getByRole("button", { name: "Trip menu" }))
  await screen.findByRole("menuitem", { name: "Rename trip…" })
  screen.getByRole("menuitem", { name: "Share…" })
  screen.getByRole("menuitem", { name: "Add member…" })
  screen.getByRole("menuitemradio", { name: "Exact" })
})

test("Rename trip… opens a dialog with the rename form", async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 })
  renderMenu()
  await user.click(screen.getByRole("button", { name: "Trip menu" }))
  await user.click(await screen.findByRole("menuitem", { name: "Rename trip…" }))
  await screen.findByRole("dialog", { name: "Rename trip" })
  screen.getByRole("form", { name: "Rename trip" })
})

test("Share… opens a dialog with the link tools", async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 })
  renderMenu()
  await user.click(screen.getByRole("button", { name: "Trip menu" }))
  await user.click(await screen.findByRole("menuitem", { name: "Share…" }))
  await screen.findByRole("dialog", { name: "Share this trip" })
  screen.getByRole("button", { name: "Copy link" })
})

test("Add member… opens a dialog with the add-member form", async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 })
  renderMenu()
  await user.click(screen.getByRole("button", { name: "Trip menu" }))
  await user.click(await screen.findByRole("menuitem", { name: "Add member…" }))
  await screen.findByRole("dialog", { name: "Add member" })
  screen.getByRole("form", { name: "Add member" })
})

test("changing rounding reports the chosen step", async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 })
  const { onRounding } = renderMenu()
  await user.click(screen.getByRole("button", { name: "Trip menu" }))
  await user.click(await screen.findByRole("menuitemradio", { name: "Nearest 10" }))
  expect(onRounding).toHaveBeenCalledWith(10)
})

test("choosing Exact clears the rounding step", async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 })
  const { onRounding } = renderMenu({ rounding: 10 as Rounding })
  await user.click(screen.getByRole("button", { name: "Trip menu" }))
  await user.click(await screen.findByRole("menuitemradio", { name: "Exact" }))
  expect(onRounding).toHaveBeenCalledWith(undefined)
})
