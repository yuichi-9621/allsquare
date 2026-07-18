import { render } from "@testing-library/react"
import { expect, test } from "vitest"
import { Card } from "./card"

test("Card establishes the paper surface context", () => {
  const { container } = render(<Card>x</Card>)
  expect(container.firstElementChild?.className).toContain("surface-paper")
})
