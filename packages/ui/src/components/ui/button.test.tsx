import { render, screen } from "@testing-library/react"
import { expect, test } from "vitest"
import { Button } from "./button"

test("renders a button with its label and the primary variant class", () => {
  render(<Button>Add expense</Button>)
  const btn = screen.getByRole("button", { name: "Add expense" })
  expect(btn.className).toContain("bg-primary")
})

test("secondary variant uses the olive token", () => {
  render(<Button variant="secondary">Cancel</Button>)
  expect(screen.getByRole("button", { name: "Cancel" }).className).toContain("bg-secondary")
})
