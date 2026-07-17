import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { test } from "vitest"
import { App } from "./App"

test("root route shows the create-group screen", () => {
  render(
    <MemoryRouter initialEntries={["/"]}>
      <App />
    </MemoryRouter>,
  )
  screen.getByRole("heading", { name: "Start a group" })
})
