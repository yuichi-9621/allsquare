import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { expect, test } from "vitest"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"

test("opens on trigger click", async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 })
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
