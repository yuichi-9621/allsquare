import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { expect, test, vi } from "vitest"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select"

test("opens and selects an option", async () => {
  const onValueChange = vi.fn()
  const user = userEvent.setup({ pointerEventsCheck: 0 })
  render(
    <Select onValueChange={onValueChange}>
      <SelectTrigger aria-label="Currency">
        <SelectValue placeholder="USD" />
      </SelectTrigger>
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
