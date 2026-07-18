import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { expect, test, vi } from "vitest"
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

test("is collapsed until the ⋮ is opened, then reveals the secondary tools", async () => {
  const user = userEvent.setup()
  renderMenu()
  // collapsed: tools not present
  expect(screen.queryByRole("form", { name: "Rename trip" })).toBeNull()

  await user.click(screen.getByRole("button", { name: "Trip menu" }))
  screen.getByRole("form", { name: "Rename trip" })
  screen.getByRole("form", { name: "Add member" })
  screen.getByRole("button", { name: "Copy link" })
  screen.getByRole("combobox", { name: "Round settle-up" })
})

test("changing rounding reports the chosen step (and 'exact' clears it)", async () => {
  const user = userEvent.setup()
  const { onRounding } = renderMenu()
  await user.click(screen.getByRole("button", { name: "Trip menu" }))
  await user.selectOptions(screen.getByRole("combobox", { name: "Round settle-up" }), "Nearest 10")
  expect(onRounding).toHaveBeenCalledWith(10)
})
