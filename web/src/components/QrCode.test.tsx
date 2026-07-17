import { render, screen } from "@testing-library/react"
import { expect, test } from "vitest"
import { QrCode } from "./QrCode"

test("renders an accessible svg with dark modules", () => {
  const { container } = render(<QrCode value="https://allsquare.app/g/abc123" />)
  const svg = screen.getByRole("img", { name: "Group QR code" })
  expect(svg.tagName.toLowerCase()).toBe("svg")
  // dark modules are drawn as <rect>; a real QR always has many
  expect(container.querySelectorAll("rect").length).toBeGreaterThan(10)
})
