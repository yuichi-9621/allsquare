import { render, screen } from "@testing-library/react"
import { expect, test } from "vitest"
import { Stamp } from "./stamp"

test("pending shows the not-yet label", () => {
  render(<Stamp state="pending" />)
  expect(screen.getByText(/not yet square/i)).toBeDefined()
})

test("square shows the all-square seal", () => {
  render(<Stamp state="square" />)
  expect(screen.getByText(/all square/i)).toBeDefined()
})
