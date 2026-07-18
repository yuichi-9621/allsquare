import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { expect, test, vi } from "vitest"
import { Checkbox } from "./checkbox"
import { RadioGroup, RadioGroupItem } from "./radio-group"

test("checkbox toggles", async () => {
  const onCheckedChange = vi.fn()
  const user = userEvent.setup({ pointerEventsCheck: 0 })
  render(<Checkbox aria-label="Alice" onCheckedChange={onCheckedChange} />)
  await user.click(screen.getByRole("checkbox", { name: "Alice" }))
  expect(onCheckedChange).toHaveBeenCalledWith(true)
})

test("radio group selects", async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 })
  render(
    <RadioGroup defaultValue="equal">
      <RadioGroupItem value="equal" aria-label="Equal" />
      <RadioGroupItem value="exact" aria-label="Exact" />
    </RadioGroup>,
  )
  await user.click(screen.getByRole("radio", { name: "Exact" }))
  expect(screen.getByRole("radio", { name: "Exact" })).toBeChecked()
})
