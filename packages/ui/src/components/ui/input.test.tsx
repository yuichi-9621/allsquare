import { render, screen } from "@testing-library/react"
import { expect, test } from "vitest"
import { Input } from "./input"
import { Label } from "./label"

test("label is associated with its input via htmlFor", () => {
  render(
    <>
      <Label htmlFor="desc">Description</Label>
      <Input id="desc" />
    </>,
  )
  expect(screen.getByLabelText("Description")).toBeDefined()
})
