import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { expect, test } from "vitest"
import { Landing } from "./Landing"

function renderLanding() {
  return render(
    <MemoryRouter>
      <Landing />
    </MemoryRouter>,
  )
}

test("pitches the product and links the CTA to the create screen", () => {
  renderLanding()
  screen.getByRole("heading", { name: /End up all square/ })
  const ctas = screen.getAllByRole("link", { name: /Start a group/ })
  expect(ctas.length).toBeGreaterThanOrEqual(2)
  for (const cta of ctas) {
    expect(cta).toHaveAttribute("href", "/new")
  }
})

test("shows the walica-style use cases", () => {
  renderLanding()
  screen.getByText("Trip abroad")
  screen.getByText("Group dinner")
  screen.getByText("Road trip")
  screen.getByText("Shared house")
})

test("explains how it works in three steps", () => {
  renderLanding()
  screen.getByText("Start a group, share one link")
  screen.getByText("Everyone adds what they paid")
  screen.getByText("Settle with the fewest payments")
})

test("closes on the All square promise", () => {
  renderLanding()
  screen.getByText("All square")
})
