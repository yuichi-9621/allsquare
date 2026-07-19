import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, expect, test } from "vitest"
import { App } from "./App"

afterEach(() => localStorage.clear())

test("root route shows the landing page on a device with no trips", () => {
  render(
    <MemoryRouter initialEntries={["/"]}>
      <App />
    </MemoryRouter>,
  )
  screen.getByRole("heading", { name: /End up all square/ })
})

test("root route shows the trips dashboard once a trip is saved", () => {
  localStorage.setItem(
    "allsquare:trips",
    JSON.stringify([{ slug: "abc", title: "Kyoto", baseCurrency: "JPY", rounding: 1 }]),
  )
  render(
    <MemoryRouter initialEntries={["/"]}>
      <App />
    </MemoryRouter>,
  )
  screen.getByRole("heading", { name: "Your trips" })
  expect(screen.getByRole("link", { name: "What is Allsquare?" })).toHaveAttribute("href", "/about")
})

test("/about serves the landing page even for returning users", () => {
  localStorage.setItem(
    "allsquare:trips",
    JSON.stringify([{ slug: "abc", title: "Kyoto", baseCurrency: "JPY", rounding: 1 }]),
  )
  render(
    <MemoryRouter initialEntries={["/about"]}>
      <App />
    </MemoryRouter>,
  )
  screen.getByRole("heading", { name: /End up all square/ })
})
